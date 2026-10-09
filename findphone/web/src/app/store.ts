import { useSyncExternalStore } from 'react';
import type { LookupState } from '../features/lookup/lookupState';
import type { PlaceResult } from '../features/places/geoServices';

export type Tab = 'map' | 'devices' | 'activity' | 'security' | 'settings';
export type Tool = 'overview' | 'history' | 'geofence' | 'alerts';
export type MapMode = 'satellite' | 'map' | '3d';
export type ThemePref = 'dark' | 'light' | 'system';

export interface WatchedDevice {
  e164: string;
  /** Optional label set on this browser, e.g. "Amma's phone". */
  nickname: string | null;
  addedAt: number;
}

export interface TrailPoint {
  lat: number;
  lng: number;
  accuracy: number;
  at: number;
}

export interface Geofence {
  lat: number;
  lng: number;
  radius: number;
  enabled: boolean;
  /** Last known side of the boundary; null until the first evaluation. */
  inside: boolean | null;
}

export type EventKind =
  | 'found'
  | 'live'
  | 'stale'
  | 'paused'
  | 'resumed'
  | 'battery'
  | 'geofence-exit'
  | 'geofence-enter'
  | 'ring'
  | 'removed';

export interface AppEvent {
  id: number;
  at: number;
  kind: EventKind;
  e164: string;
  title: string;
  body: string;
}

export interface Settings {
  theme: ThemePref;
  units: 'metric' | 'imperial';
  defaultMode: MapMode;
  showLandmarks: boolean;
  showTrail: boolean;
  showAccuracy: boolean;
  notifyStatus: boolean;
  notifyBattery: boolean;
  notifyGeofence: boolean;
  rememberDevices: boolean;
}

export interface Toast {
  id: number;
  message: string;
  isError: boolean;
}

export interface AppState {
  tab: Tab;
  tool: Tool;
  selected: string | null;
  watched: WatchedDevice[];
  lookups: Record<string, LookupState>;
  /** Positions seen while this page has been open. Never persisted. */
  trails: Record<string, TrailPoint[]>;
  geofences: Record<string, Geofence>;
  events: AppEvent[];
  unread: number;
  settings: Settings;
  mapMode: MapMode;
  place: PlaceResult | null;
  toast: Toast | null;
  /** Bumped to ask the map to fly back to the selected device. */
  recenterNonce: number;
}

export const defaultSettings: Settings = {
  theme: 'dark',
  units: 'metric',
  defaultMode: 'satellite',
  showLandmarks: true,
  showTrail: true,
  showAccuracy: true,
  notifyStatus: true,
  notifyBattery: true,
  notifyGeofence: true,
  rememberDevices: true,
};

const STORAGE_KEY = 'fp.v1';

interface Persisted {
  watched: WatchedDevice[];
  selected: string | null;
  geofences: Record<string, Geofence>;
  settings: Settings;
}

function load(): Partial<Persisted> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
  } catch {
    return {};
  }
}

function save(s: AppState) {
  try {
    const data: Persisted = {
      watched: s.settings.rememberDevices ? s.watched : [],
      selected: s.settings.rememberDevices ? s.selected : null,
      geofences: s.settings.rememberDevices ? s.geofences : {},
      settings: s.settings,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private mode or blocked storage: the session still works, it just won't be remembered.
  }
}

function initial(): AppState {
  const p = typeof window === 'undefined' ? {} : load();
  const settings = { ...defaultSettings, ...p.settings };
  const watched = Array.isArray(p.watched) ? p.watched : [];
  return {
    tab: 'map',
    tool: 'overview',
    selected: watched.some((w) => w.e164 === p.selected) ? p.selected! : (watched[0]?.e164 ?? null),
    watched,
    lookups: {},
    trails: {},
    geofences: p.geofences ?? {},
    events: [],
    unread: 0,
    settings,
    mapMode: settings.defaultMode,
    place: null,
    toast: null,
    recenterNonce: 0,
  };
}

let state: AppState = initial();
const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(update: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const patch = typeof update === 'function' ? update(state) : update;
  state = { ...state, ...patch };
  if ('watched' in patch || 'selected' in patch || 'geofences' in patch || 'settings' in patch) save(state);
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Subscribe to a slice. Return a stable value (a field, not a new object) to avoid re-renders. */
export function useApp<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(state),
  );
}

// ---- actions -------------------------------------------------------------------------------

let seq = 0;

export const actions = {
  go(tab: Tab) {
    setState({ tab, ...(tab === 'activity' ? { unread: 0 } : {}) });
  },
  openTool(tool: Tool) {
    setState({ tab: 'map', tool });
  },
  select(e164: string) {
    setState({ selected: e164, tab: 'map', tool: 'overview' });
  },
  addDevice(e164: string, nickname: string | null) {
    setState((s) => ({
      watched: s.watched.some((w) => w.e164 === e164)
        ? s.watched
        : [...s.watched, { e164, nickname, addedAt: Date.now() }],
      selected: e164,
      tab: 'map',
      tool: 'overview',
    }));
  },
  rename(e164: string, nickname: string | null) {
    setState((s) => ({ watched: s.watched.map((w) => (w.e164 === e164 ? { ...w, nickname } : w)) }));
  },
  removeDevice(e164: string) {
    setState((s) => {
      const watched = s.watched.filter((w) => w.e164 !== e164);
      const lookups = { ...s.lookups };
      const trails = { ...s.trails };
      const geofences = { ...s.geofences };
      delete lookups[e164];
      delete trails[e164];
      delete geofences[e164];
      return {
        watched,
        lookups,
        trails,
        geofences,
        selected: s.selected === e164 ? (watched[0]?.e164 ?? null) : s.selected,
        tool: 'overview',
      };
    });
  },
  setGeofence(e164: string, fence: Geofence | null) {
    setState((s) => {
      const geofences = { ...s.geofences };
      if (fence) geofences[e164] = fence;
      else delete geofences[e164];
      return { geofences };
    });
  },
  updateSettings(patch: Partial<Settings>) {
    setState((s) => ({ settings: { ...s.settings, ...patch } }));
  },
  setMapMode(mapMode: MapMode) {
    setState({ mapMode });
  },
  showPlace(place: PlaceResult | null) {
    setState({ place });
  },
  recenter() {
    setState((s) => ({ recenterNonce: s.recenterNonce + 1, place: null }));
  },
  toast(message: string, isError = false) {
    setState({ toast: { id: ++seq, message, isError } });
  },
  log(event: Omit<AppEvent, 'id' | 'at'>) {
    const e: AppEvent = { ...event, id: ++seq, at: Date.now() };
    setState((s) => ({
      events: [e, ...s.events].slice(0, 200),
      unread: s.tab === 'activity' ? 0 : s.unread + 1,
    }));
    return e;
  },
  markRead() {
    setState({ unread: 0 });
  },
  clearEvents() {
    setState({ events: [], unread: 0 });
  },
  forgetAll() {
    setState({ watched: [], lookups: {}, trails: {}, geofences: {}, events: [], unread: 0, selected: null, tool: 'overview' });
  },
};
