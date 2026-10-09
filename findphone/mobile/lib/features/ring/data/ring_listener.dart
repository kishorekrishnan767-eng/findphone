import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_ringtone_player/flutter_ringtone_player.dart';

import '../../../core/firestore/location_doc.dart';
import '../../../core/logging/logger.dart';
import '../../../core/storage/local_store.dart';
import '../domain/ring_policy.dart';

/// Listens for "Ring my phone" requests from the website and plays the alarm sound.
///
/// Runs wherever the tracking engine runs (the Android service isolate, or the UI isolate on
/// iOS). On ringing it stamps `ackAt`, which the website shows as "Ringing on the phone".
class RingListener {
  RingListener({
    required FirebaseFirestore db,
    required LocalStore store,
    required void Function(bool active) onRinging,
    FlutterRingtonePlayer? player,
    DateTime Function()? clock,
  })  : _db = db,
        _store = store,
        _onRinging = onRinging,
        _player = player ?? FlutterRingtonePlayer(),
        _now = clock ?? DateTime.now;

  final FirebaseFirestore _db;
  final LocalStore _store;
  final void Function(bool active) _onRinging;
  final FlutterRingtonePlayer _player;
  final DateTime Function() _now;

  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _sub;
  Timer? _autoStop;
  bool _ringing = false;

  void start(String phoneE164) {
    _sub?.cancel();
    _sub = _db
        .collection(LocationDoc.ringsCollection)
        .doc(phoneE164)
        .snapshots()
        .listen(_onSnapshot, onError: (Object e) => Log.error('ring.listen_failed', e));
  }

  Future<void> _onSnapshot(DocumentSnapshot<Map<String, dynamic>> snap) async {
    final data = snap.data();
    final requested = data?['requestedAt'];
    if (data == null || requested is! Timestamp) return;
    final requestedAt = requested.toDate();

    final ring = RingPolicy.shouldRing(
      requestedAt: requestedAt,
      acknowledged: data['ackAt'] != null,
      lastHandled: _store.lastRingHandled,
      now: _now(),
    );
    if (!ring) return;

    // Remember first, so a crash mid-ring can't replay the same request after restart.
    await _store.setLastRingHandled(requestedAt);
    await _startRinging();
    try {
      await snap.reference.update({'ackAt': FieldValue.serverTimestamp()});
    } catch (e) {
      Log.error('ring.ack_failed', e);
    }
  }

  Future<void> _startRinging() async {
    if (_ringing) return;
    _ringing = true;
    Log.info('ring.started');
    try {
      await _player.playAlarm(looping: true, volume: 1.0, asAlarm: true);
    } catch (e) {
      Log.error('ring.play_failed', e);
    }
    _onRinging(true);
    _autoStop?.cancel();
    _autoStop = Timer(RingPolicy.duration, stop);
  }

  Future<void> stop() async {
    _autoStop?.cancel();
    _autoStop = null;
    if (!_ringing) return;
    _ringing = false;
    try {
      await _player.stop();
    } catch (e) {
      Log.error('ring.stop_failed', e);
    }
    _onRinging(false);
  }

  Future<void> dispose() async {
    await _sub?.cancel();
    _sub = null;
    await stop();
  }
}
