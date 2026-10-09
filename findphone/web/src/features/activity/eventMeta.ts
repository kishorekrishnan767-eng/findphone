import { BatteryWarning, BellRing, LogIn, LogOut, Pause, Play, Search, Trash2, Wifi, WifiOff, type LucideIcon } from 'lucide-react';
import type { EventKind } from '../../app/store';

export const eventMeta: Record<EventKind, { icon: LucideIcon; tone: 'live' | 'stale' | 'error' | 'accent' | 'muted' }> = {
  found: { icon: Search, tone: 'accent' },
  live: { icon: Wifi, tone: 'live' },
  stale: { icon: WifiOff, tone: 'stale' },
  paused: { icon: Pause, tone: 'muted' },
  resumed: { icon: Play, tone: 'live' },
  battery: { icon: BatteryWarning, tone: 'error' },
  'geofence-exit': { icon: LogOut, tone: 'stale' },
  'geofence-enter': { icon: LogIn, tone: 'live' },
  ring: { icon: BellRing, tone: 'accent' },
  removed: { icon: Trash2, tone: 'muted' },
};

export const toneClass = {
  live: 'text-live-dot bg-live-bg',
  stale: 'text-stale-dot bg-stale-bg',
  error: 'text-error-dot bg-error-bg',
  accent: 'text-accent bg-accent-subtle',
  muted: 'text-tertiary bg-subtle',
} as const;
