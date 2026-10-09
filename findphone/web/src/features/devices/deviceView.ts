import { useApp } from '../../app/store';
import { env } from '../../config/env';
import type { BadgeStatus } from '../../design-system/components/StatusBadge';
import { formatAgo } from '../../lib/time';
import { useNow } from '../../shared/hooks/useNow';
import { type DeviceStatus, deriveStatus } from '../lookup/domain/status';
import type { LookupState } from '../lookup/lookupState';

export interface DeviceView {
  e164: string;
  nickname: string | null;
  lookup: LookupState | undefined;
  status: DeviceStatus | null;
  now: Date;
}

/** Everything a screen needs about one watched device, re-evaluated every second. */
export function useDeviceView(e164: string | null): DeviceView | null {
  const watched = useApp((s) => s.watched);
  const lookup = useApp((s) => (e164 ? s.lookups[e164] : undefined));
  const now = useNow(1000, Boolean(e164));
  if (!e164) return null;
  const w = watched.find((x) => x.e164 === e164);
  const status = lookup?.kind === 'found' ? deriveStatus(lookup.device, now, env.liveThresholdMs) : null;
  return { e164, nickname: w?.nickname ?? null, lookup, status, now };
}

/** Badge + one-line status used in lists, the detail hero and the bottom bar. */
export function describeStatus(v: DeviceView): { badge: BadgeStatus; label: string; line: string } {
  const l = v.lookup;
  if (!l || l.kind === 'loading' || l.kind === 'idle') return { badge: 'paused', label: 'Connecting', line: 'Looking up this number…' };
  if (l.kind === 'error') return { badge: 'error', label: 'Unavailable', line: "Can't reach FindPhone right now" };
  if (l.kind === 'notFound' || v.status?.kind === 'expired')
    return { badge: 'error', label: 'Not found', line: 'No device registered with this number' };
  switch (v.status?.kind) {
    case 'live':
      return { badge: 'live', label: 'Live', line: `Live · updated ${formatAgo(v.status.seenAt, v.now)}` };
    case 'stale':
      return { badge: 'stale', label: 'Offline', line: `Last seen ${formatAgo(v.status.seenAt, v.now)}` };
    case 'paused':
      return { badge: 'paused', label: 'Paused', line: 'Sharing paused by the owner' };
    case 'waiting':
      return { badge: 'paused', label: 'Waiting', line: 'Registered, waiting for first location' };
    default:
      return { badge: 'paused', label: '—', line: '' };
  }
}

/** Name shown for a device: the label set on this browser, else the owner's name. */
export function deviceTitle(v: DeviceView): string {
  if (v.nickname) return v.nickname;
  return v.lookup?.kind === 'found' ? v.lookup.device.name : 'Unknown device';
}
