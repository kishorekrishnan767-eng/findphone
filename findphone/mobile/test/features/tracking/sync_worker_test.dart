import 'dart:async';
import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_async/fake_async.dart';
import 'package:findphone/core/errors/app_failure.dart';
import 'package:findphone/features/tracking/domain/location_fix.dart';
import 'package:findphone/features/tracking/domain/sync_policy.dart';
import 'package:findphone/features/tracking/domain/tracking_config.dart';
import 'package:findphone/features/tracking/engine/backoff.dart';
import 'package:findphone/features/tracking/engine/sync_worker.dart';
import 'package:flutter_test/flutter_test.dart';

/// Records writes and lets each test decide how they complete.
class FakeWriter {
  final calls = <LocationFix>[];
  final completers = <Completer<void>>[];

  Future<void> call(LocationFix fix, int? battery) {
    calls.add(fix);
    final c = Completer<void>();
    completers.add(c);
    return c.future;
  }
}

void main() {
  final t0 = DateTime(2026, 10, 8, 12);
  LocationFix at(double northMetres, {int second = 0}) => LocationFix(
        latitude: 12.9716 + northMetres / 111195,
        longitude: 77.5946,
        accuracy: 10,
        timestamp: t0.add(Duration(seconds: second)),
      );

  late FakeWriter writer;
  late List<SyncEvent> events;

  SyncWorker build(FakeAsync async, {Future<void> Function()? onRecordMissing}) => SyncWorker(
        write: writer.call,
        policy: const SyncPolicy(TrackingConfig.defaults),
        onEvent: events.add,
        onRecordMissing: onRecordMissing,
        clock: () => t0.add(async.elapsed),
        backoff: Backoff(random: Random(1)),
      );

  setUp(() {
    writer = FakeWriter();
    events = [];
  });

  test('single flight: a second reading waits for the first write to settle', () {
    fakeAsync((async) {
      final w = build(async);
      w.offer(at(0), 50);
      w.offer(at(100), 50);
      async.flushMicrotasks();
      expect(writer.calls, hasLength(1));

      writer.completers[0].complete();
      async.flushMicrotasks();
      expect(writer.calls, hasLength(2));
      expect(writer.calls[1].latitude, at(100).latitude);
    });
  });

  test('latest wins: only the newest pending reading is written after a slow write', () {
    fakeAsync((async) {
      final w = build(async);
      w.offer(at(0), 50);
      async.flushMicrotasks();
      // Three more readings arrive while the first write is still in flight.
      w.offer(at(100), 50);
      w.offer(at(200), 50);
      w.offer(at(300), 50);
      writer.completers[0].complete();
      async.flushMicrotasks();

      expect(writer.calls, hasLength(2));
      expect(writer.calls[1].latitude, at(300).latitude);
    });
  });

  test('a write that takes longer than 10 s reports WaitingForNetwork', () {
    fakeAsync((async) {
      final w = build(async);
      w.offer(at(0), 50);
      async.elapse(const Duration(seconds: 11));
      expect(events.whereType<WaitingForNetwork>(), isNotEmpty);
      writer.completers[0].complete();
      async.flushMicrotasks();
      expect(events.last, isA<Synced>());
    });
  });

  test('transient failures retry with backoff, then succeed', () {
    fakeAsync((async) {
      final w = build(async);
      w.offer(at(0), 50);
      async.flushMicrotasks();
      writer.completers[0].completeError(FirebaseException(plugin: 'cloud_firestore', code: 'unavailable'));
      async.flushMicrotasks();

      final retry = events.whereType<Retrying>().single;
      expect(retry.failure, isA<OfflineFailure>());
      expect(retry.after.inMilliseconds, inInclusiveRange(1600, 2400)); // 2 s ± 20 %

      async.elapse(retry.after);
      expect(writer.calls, hasLength(2), reason: 'the same reading is retried');
      writer.completers[1].complete();
      async.flushMicrotasks();
      expect(events.last, isA<Synced>());
    });
  });

  test('permission-denied halts: ownership was lost, so nothing more is written', () {
    fakeAsync((async) {
      final w = build(async);
      w.offer(at(0), 50);
      async.flushMicrotasks();
      writer.completers[0].completeError(FirebaseException(plugin: 'cloud_firestore', code: 'permission-denied'));
      async.flushMicrotasks();

      expect(events.last, isA<Halted>());
      expect((events.last as Halted).failure, isA<OwnershipLostFailure>());
      w.offer(at(500), 50);
      async.elapse(const Duration(minutes: 10));
      expect(writer.calls, hasLength(1));
    });
  });

  test('quota exhaustion waits the maximum backoff (5 min) before retrying', () {
    fakeAsync((async) {
      final w = build(async);
      w.offer(at(0), 50);
      async.flushMicrotasks();
      writer.completers[0].completeError(FirebaseException(plugin: 'cloud_firestore', code: 'resource-exhausted'));
      async.flushMicrotasks();

      expect(events.whereType<Retrying>().single.after, const Duration(minutes: 5));
      async.elapse(const Duration(minutes: 4));
      expect(writer.calls, hasLength(1));
      async.elapse(const Duration(minutes: 1));
      expect(writer.calls, hasLength(2));
    });
  });

  test('a missing record is recreated, then the reading is written', () {
    fakeAsync((async) {
      var recreated = 0;
      final w = build(async, onRecordMissing: () async => recreated++);
      w.offer(at(0), 50);
      async.flushMicrotasks();
      writer.completers[0].completeError(FirebaseException(plugin: 'cloud_firestore', code: 'not-found'));
      async.flushMicrotasks();
      async.elapse(Duration.zero);

      expect(recreated, 1);
      expect(writer.calls, hasLength(2));
    });
  });

  test('startSession makes the next reading count as first (resume after pause)', () {
    fakeAsync((async) {
      final w = build(async);
      w.offer(at(0), 50);
      async.flushMicrotasks();
      writer.completers[0].complete();
      async.flushMicrotasks();

      w.offer(at(1), 50); // 1 m away, within heartbeat: skipped
      async.flushMicrotasks();
      expect(writer.calls, hasLength(1));

      w.startSession();
      w.offer(at(1), 50);
      async.flushMicrotasks();
      expect(writer.calls, hasLength(2));
    });
  });

  test('drain drops the pending reading and stops retries', () {
    fakeAsync((async) {
      final w = build(async);
      w.offer(at(0), 50);
      async.flushMicrotasks();
      writer.completers[0].completeError(FirebaseException(plugin: 'cloud_firestore', code: 'unavailable'));
      async.flushMicrotasks();

      unawaited(w.drain());
      async.elapse(const Duration(minutes: 10));
      expect(writer.calls, hasLength(1));
    });
  });

  group('Backoff', () {
    test('doubles from 2 s, caps at 5 min, stays within ±20 % jitter', () {
      final b = Backoff(random: Random(3));
      final expected = [2, 4, 8, 16, 32, 64, 128, 256, 300, 300];
      for (final s in expected) {
        final d = b.next().inMilliseconds / 1000;
        expect(d, inInclusiveRange(min(s * 0.8, 300), min(s * 1.2, 300.0)));
      }
      b.reset();
      expect(b.next().inMilliseconds, inInclusiveRange(1600, 2400));
    });
  });
}
