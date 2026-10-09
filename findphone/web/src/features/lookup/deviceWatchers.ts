import { type EventKind, type TrailPoint, type WatchedDevice, actions, getState, setState } from '../../app/store';
import { env } from '../../config/env';
import { toLookupError } from '../../lib/errors';
import { log } from '../../lib/log';
import { parsePhone } from '../../shared/phone/normalize';
import { distanceMeters } from '../map/geo';
import { watchDevice } from './data/deviceRepository';
import type { DeviceRecord } from './domain/device';
import { type DeviceStatus, deriveStatus } from './domain/status';
import { type LookupAction, type LookupState, lookupReducer } from './lookupState';

/**
 * One Firestore listener per watched number (each a single-document `get`, as the rules require).
 * Snapshots feed the per-device state machine and, from there, the session trail, geofence checks
 * and the activity log. A 15 s tick catches Live → Last seen without waiting for a snapshot.
 */

const SLOW_MS = 12_000;
const TRAIL_MIN_STEP_M = 5;
const TRAIL_MAX_POINTS = 500;
const LOW_BATTERY = 15;

interface Watcher {
  unsubscribe: () => void;
  slowTimer: number | null;
  answered: boolean;
  lastStatus: DeviceStatus['kind'] | null;
  lowBattery: boolean | null;
}

const watchers = new Map<string, Watcher>();
let ticker: number | null = null;

function dispatch(e164: string, action: LookupAction) {
  setState((s) => ({
    lookups: { ...s.lookups, [e164]: lookupReducer(s.lookups[e164] ?? { kind: 'idle' }, action) },
  }));
}

export function displayName(e164: string): string {
  const s = getState();
  const nick = s.watched.find((w) => w.e164 === e164)?.nickname;
  const l = s.lookups[e164];
  return nick ?? (l?.kind === 'found' ? l.device.name : 'This device');
}

/** Logs an event and, where the user allowed it, raises a toast and a system notification. */
function emit(e164: string, kind: EventKind, title: string, body: string) {
  const event = actions.log({ e164, kind, title, body });
  const { settings } = getState();
  const allowed =
    kind === 'battery'
      ? settings.notifyBattery
      : kind.startsWith('geofence')
        ? settings.notifyGeofence
        : settings.notifyStatus;
  if (!allowed) return;
  actions.toast(`${title}. ${body}`);
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification(`FindPhone · ${title}`, { body, tag: `${e164}-${kind}`, icon: '/favicon.svg' });
    }
  } catch {
    // Some browsers only allow notifications from a service worker; the in-app log still has it.
  }
  return event;
}

function onStatus(e164: string, w: Watcher, device: DeviceRecord, now: Date) {
  const status = deriveStatus(device, now, env.liveThresholdMs);
  const prev = w.lastStatus;
  w.lastStatus = status.kind;
  if (prev === null || prev === status.kind) return;
  const name = displayName(e164);
  if (status.kind === 'paused') emit(e164, 'paused', `${name} paused sharing`, 'Its location is hidden until sharing resumes.');
  else if (prev === 'paused') emit(e164, 'resumed', `${name} resumed sharing`, 'Location updates are back on.');
  else if (status.kind === 'stale' && prev === 'live')
    emit(e164, 'stale', `${name} went quiet`, 'No update for over 2 minutes. It may be offline or out of battery.');
  else if (status.kind === 'live' && prev === 'stale') emit(e164, 'live', `${name} is back online`, 'Live updates resumed.');
}

function onBattery(e164: string, w: Watcher, device: DeviceRecord) {
  if (device.battery === null) return;
  const low = device.battery <= LOW_BATTERY;
  if (low && w.lowBattery === false) {
    emit(e164, 'battery', `${displayName(e164)} battery low`, `${device.battery}% left. Updates stop when it dies.`);
  }
  w.lowBattery = low;
}

function onPosition(e164: string, device: DeviceRecord) {
  const p = device.position;
  if (!p || !device.sharingEnabled) return;

  // Session trail
  const at = (device.locatedAt ?? device.updatedAt).getTime();
  setState((s) => {
    const trail = s.trails[e164] ?? [];
    const last = trail[trail.length - 1];
    if (last && (last.at === at || distanceMeters(last, p) < TRAIL_MIN_STEP_M)) return {};
    const point: TrailPoint = { lat: p.lat, lng: p.lng, accuracy: p.accuracy, at };
    return { trails: { ...s.trails, [e164]: [...trail, point].slice(-TRAIL_MAX_POINTS) } };
  });

  // Geofence
  const fence = getState().geofences[e164];
  if (!fence?.enabled) return;
  const inside = distanceMeters(fence, p) <= fence.radius;
  if (fence.inside !== null && inside !== fence.inside) {
    const name = displayName(e164);
    if (inside) emit(e164, 'geofence-enter', `${name} entered the safe zone`, 'It is back inside the area you set.');
    else emit(e164, 'geofence-exit', `${name} left the safe zone`, 'It moved outside the area you set.');
  }
  if (inside !== fence.inside) actions.setGeofence(e164, { ...fence, inside });
}

function start(e164: string) {
  const parsed = parsePhone(e164, 'IN');
  if (!parsed.ok) return;
  const w: Watcher = { unsubscribe: () => {}, slowTimer: null, answered: false, lastStatus: null, lowBattery: null };
  watchers.set(e164, w);
  dispatch(e164, { type: 'loading', phone: parsed.number });

  w.slowTimer = window.setTimeout(() => {
    if (!w.answered) dispatch(e164, { type: 'error', error: 'network' });
  }, SLOW_MS);

  w.unsubscribe = watchDevice(
    e164,
    ({ device, fromCache }) => {
      if (device || !fromCache) w.answered = true;
      dispatch(e164, { type: 'snapshot', device, fromCache });
      if (!device) return;
      onStatus(e164, w, device, new Date());
      onBattery(e164, w, device);
      onPosition(e164, device);
    },
    (e) => {
      w.answered = true;
      log.error('watch.failed', e);
      dispatch(e164, { type: 'error', error: toLookupError(e) });
    },
  );
}

function stop(e164: string) {
  const w = watchers.get(e164);
  if (!w) return;
  w.unsubscribe();
  if (w.slowTimer !== null) window.clearTimeout(w.slowTimer);
  watchers.delete(e164);
}

/** Starts listeners for new numbers and stops them for removed ones. */
export function syncWatchers(watched: WatchedDevice[]) {
  const wanted = new Set(watched.map((w) => w.e164));
  for (const e164 of [...watchers.keys()]) if (!wanted.has(e164)) stop(e164);
  for (const e164 of wanted) if (!watchers.has(e164)) start(e164);

  if (wanted.size && ticker === null) {
    ticker = window.setInterval(() => {
      const { lookups } = getState();
      for (const [e164, w] of watchers) {
        const l: LookupState | undefined = lookups[e164];
        if (l?.kind === 'found') onStatus(e164, w, l.device, new Date());
      }
    }, 15_000);
  } else if (!wanted.size && ticker !== null) {
    window.clearInterval(ticker);
    ticker = null;
  }
}

/** "Try again" after an error: restart that number's listener. */
export function retryWatch(e164: string) {
  stop(e164);
  start(e164);
}
