import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { getDb } from '../../../lib/firebase';
import { type DeviceRecord, parseDevice } from '../domain/device';

export interface DeviceSnapshot {
  device: DeviceRecord | null;
  /** True when served from the local cache (offline / reconnecting). */
  fromCache: boolean;
}

const ref = (e164: string) => doc(getDb(), 'locations', e164);

/**
 * Real-time listener on ONE document. This is a `get` in rules terms; the rules deny any listing
 * or query, so this is the only way the web app can read data.
 */
export function watchDevice(
  e164: string,
  onNext: (s: DeviceSnapshot) => void,
  onError: (e: unknown) => void,
): () => void {
  return onSnapshot(
    ref(e164),
    { includeMetadataChanges: true },
    (snap) => onNext({ device: snap.exists() ? parseDevice(snap.data()) : null, fromCache: snap.metadata.fromCache }),
    onError,
  );
}

/** Forces a server round-trip (the Refresh action). */
export async function fetchDevice(e164: string): Promise<DeviceRecord | null> {
  const snap = await getDocFromServer(ref(e164));
  return snap.exists() ? parseDevice(snap.data()) : null;
}
