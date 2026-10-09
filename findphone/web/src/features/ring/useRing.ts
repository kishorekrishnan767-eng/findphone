import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { actions } from '../../app/store';
import { getDb } from '../../lib/firebase';
import { log } from '../../lib/log';
import { useNow } from '../../shared/hooks/useNow';
import { displayName } from '../lookup/deviceWatchers';

export const RING_COOLDOWN_MS = 60_000;
const RING_DURATION_MS = 30_000;

export type RingStatus =
  | { kind: 'idle' }
  | { kind: 'sending' }
  /** Request stored; waiting for the phone to confirm. */
  | { kind: 'sent' }
  /** The phone confirmed and is playing its alarm. */
  | { kind: 'ringing' }
  | { kind: 'error'; message: string };

interface RingDoc {
  requestedAt: Date | null;
  ackAt: Date | null;
}

/**
 * "Ring" for one device: writes rings/{phone}.requestedAt (rules allow it once a minute for a
 * device that is sharing) and watches for the phone's ackAt.
 */
export function useRing(e164: string | null, sharing: boolean) {
  const [ringDoc, setRingDoc] = useState<RingDoc>({ requestedAt: null, ackAt: null });
  const [local, setLocal] = useState<RingStatus>({ kind: 'idle' });
  const now = useNow(1000, Boolean(ringDoc.requestedAt) || local.kind !== 'idle');

  // Callers key their component by device, so state starts fresh for each one.
  useEffect(() => {
    if (!e164) return;
    return onSnapshot(
      doc(getDb(), 'rings', e164),
      (snap) => {
        const d = snap.data();
        setRingDoc({
          requestedAt: d?.requestedAt?.toDate?.() ?? null,
          ackAt: d?.ackAt?.toDate?.() ?? null,
        });
      },
      (e) => log.warn('ring.watch_failed', { code: (e as { code?: string }).code }),
    );
  }, [e164]);

  // Errors clear themselves after a few seconds.
  useEffect(() => {
    if (local.kind !== 'error') return;
    const id = window.setTimeout(() => setLocal({ kind: 'idle' }), 5000);
    return () => window.clearTimeout(id);
  }, [local]);

  const sinceRequest = ringDoc.requestedAt ? now.getTime() - ringDoc.requestedAt.getTime() : Infinity;
  const cooldownLeft = Math.max(0, Math.ceil((RING_COOLDOWN_MS - sinceRequest) / 1000));
  const acked = Boolean(ringDoc.ackAt && ringDoc.requestedAt && ringDoc.ackAt >= ringDoc.requestedAt);

  let status: RingStatus = local;
  if (local.kind !== 'sending' && local.kind !== 'error') {
    if (acked && now.getTime() - ringDoc.ackAt!.getTime() < RING_DURATION_MS) status = { kind: 'ringing' };
    else if (ringDoc.requestedAt && !acked && sinceRequest < 45_000) status = { kind: 'sent' };
    else status = { kind: 'idle' };
  }

  const ring = useCallback(async () => {
    if (!e164) return;
    if (!sharing) {
      setLocal({ kind: 'error', message: "Sharing is paused, so this phone can't be rung." });
      return;
    }
    setLocal({ kind: 'sending' });
    try {
      await setDoc(doc(getDb(), 'rings', e164), { requestedAt: serverTimestamp(), ackAt: null });
      setLocal({ kind: 'idle' });
      actions.log({
        e164,
        kind: 'ring',
        title: `Rang ${displayName(e164)}`,
        body: 'The phone plays an alarm for 30 seconds, even on silent.',
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      log.error('ring.request_failed', e);
      setLocal({
        kind: 'error',
        message:
          code === 'permission-denied'
            ? 'Wait a minute between rings, and make sure the phone is sharing.'
            : "Couldn't reach FindPhone. Check your connection.",
      });
    }
  }, [e164, sharing]);

  return { status, cooldownLeft, ring, lastRungAt: ringDoc.requestedAt, acknowledged: acked };
}
