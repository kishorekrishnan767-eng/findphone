import { useEffect, useMemo, useState } from 'react';
import { AppHeader, BottomNav } from './app/AppHeader';
import { SidePanel } from './app/SidePanel';
import { ToastBridge } from './app/ToastBridge';
import { useApp } from './app/store';
import { useResolvedTheme } from './app/useTheme';
import { env, isFirebaseConfigured } from './config/env';
import { BottomSheet } from './design-system/components/BottomSheet';
import { ToastProvider } from './design-system/components/Toast';
import { useDeviceView } from './features/devices/deviceView';
import { syncWatchers } from './features/lookup/deviceWatchers';
import { deriveStatus } from './features/lookup/domain/status';
import { LiveLocationBar } from './features/map/LiveLocationBar';
import { type MapDevice, MapView, type Padding } from './features/map/MapView';
import { MapTopBar } from './features/map/MapTopBar';
import { WeatherCard } from './features/map/WeatherCard';
import { useAddress, useLandmarks } from './features/places/usePlaces';
import { useMediaQuery } from './shared/hooks/useMediaQuery';

const SHEET_PEEK = 176;
const NAV_H = 64;

export function App() {
  if (!isFirebaseConfigured) return <SetupNeeded />;
  return (
    <ToastProvider>
      <ToastBridge />
      <Console />
    </ToastProvider>
  );
}

function Console() {
  const dark = useResolvedTheme() === 'dark';
  const isTabletUp = useMediaQuery('(min-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const watched = useApp((s) => s.watched);
  const selected = useApp((s) => s.selected);
  const lookups = useApp((s) => s.lookups);
  const trails = useApp((s) => s.trails);
  const geofences = useApp((s) => s.geofences);
  const settings = useApp((s) => s.settings);
  const mode = useApp((s) => s.mapMode);
  const place = useApp((s) => s.place);
  const recenterNonce = useApp((s) => s.recenterNonce);
  const tab = useApp((s) => s.tab);

  useEffect(() => syncWatchers(watched), [watched]);

  const view = useDeviceView(selected);
  const now = view?.now ?? new Date();

  // The selected device, as the map needs it.
  const focusLookup = view?.lookup;
  const status = view?.status ?? null;
  const showsPin = status?.kind === 'live' || status?.kind === 'stale';
  const device = focusLookup?.kind === 'found' ? focusLookup.device : null;
  const pos = showsPin ? (device?.position ?? null) : null;
  const position = useMemo(
    () => (pos ? { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy } : null),
    [pos?.lat, pos?.lng, pos?.accuracy], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const focusName = selected ? (watched.find((w) => w.e164 === selected)?.nickname ?? device?.name ?? '') : '';
  const focusLive = status?.kind === 'live';
  const focus = useMemo<MapDevice | null>(
    () => (selected && position ? { e164: selected, name: focusName, position, live: focusLive } : null),
    [selected, position, focusName, focusLive],
  );

  // Other watched devices with a current position: small markers.
  const others = useMemo<MapDevice[]>(() => {
    const out: MapDevice[] = [];
    for (const w of watched) {
      if (w.e164 === selected) continue;
      const l = lookups[w.e164];
      if (l?.kind !== 'found' || !l.device.position) continue;
      const st = deriveStatus(l.device, new Date(), env.liveThresholdMs);
      if (st.kind !== 'live' && st.kind !== 'stale') continue;
      out.push({ e164: w.e164, name: w.nickname ?? l.device.name, position: l.device.position, live: st.kind === 'live' });
    }
    return out;
  }, [watched, lookups, selected]);

  const address = useAddress(position);
  const landmarks = useLandmarks(position, settings.showLandmarks);
  const searching = focusLookup?.kind === 'loading';

  // Mobile sheet: expanded for forms and lists; peeks when a device appears on the map.
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [sheetHeight, setSheetHeight] = useState(SHEET_PEEK);
  const sheetKey = `${tab}:${selected ?? ''}:${Boolean(position)}`;
  const [lastSheetKey, setLastSheetKey] = useState(sheetKey);
  if (sheetKey !== lastSheetKey) {
    setLastSheetKey(sheetKey);
    setSheetExpanded(!(tab === 'map' && position));
  }

  // Keep the device clear of floating UI when the camera moves.
  const padding = useMemo<Padding>(
    () =>
      isTabletUp
        ? { top: 96, right: 88, bottom: position ? 120 : 32, left: 48 }
        : { top: 140, right: 72, bottom: SHEET_PEEK + NAV_H + 16, left: 24 },
    [isTabletUp, position],
  );
  const scanPadding: Padding = isTabletUp ? padding : { ...padding, bottom: sheetHeight + NAV_H + 16 };

  const map = (
    <>
      <MapView
        focus={focus}
        others={others}
        trail={settings.showTrail && selected ? (trails[selected] ?? null) : null}
        geofence={selected ? (geofences[selected] ?? null) : null}
        landmarks={settings.showLandmarks && landmarks ? landmarks : NO_LANDMARKS}
        place={place}
        mode={mode}
        dark={dark}
        showAccuracy={settings.showAccuracy}
        focusKey={selected}
        recenterNonce={recenterNonce}
        padding={padding}
        scanPadding={scanPadding}
        searching={searching}
        railTopClass={isDesktop && position ? 'top-28' : isTabletUp ? 'top-20' : 'top-32'}
      />
      <MapTopBar near={position} compact={!isTabletUp} />
      {isDesktop && position && (
        <div className="absolute top-4 right-4 z-(--fp-z-panel)">
          <WeatherCard position={position} address={address} />
        </div>
      )}
      {isTabletUp && position && device && (
        <LiveLocationBar
          position={position}
          live={focusLive}
          seenAt={status && 'seenAt' in status ? status.seenAt : device.updatedAt}
          now={now}
          address={address}
        />
      )}
    </>
  );

  // One tree for every screen size: the map keeps the same position in it, so crossing the
  // tablet breakpoint (resizing, rotating) never remounts it and loses the camera.
  return (
    <div className="fp-console-bg flex h-dvh flex-col text-primary">
      <AppHeader compact={!isTabletUp} />
      <div className={isTabletUp ? 'flex min-h-0 flex-1 gap-4 px-4 pb-4 lg:gap-6 lg:px-6 lg:pb-6' : 'flex min-h-0 flex-1'}>
        {isTabletUp && (
          <aside aria-label="Device panel" className="fp-glass fp-scroll fp-enter w-86 shrink-0 overflow-y-auto rounded-xl p-5 lg:w-100">
            <SidePanel />
          </aside>
        )}
        <main
          className={
            isTabletUp
              ? 'relative min-w-0 flex-1 overflow-hidden rounded-xl border border-line shadow-e2'
              : 'relative min-w-0 flex-1 overflow-hidden'
          }
        >
          <h1 className="sr-only">FindPhone</h1>
          {map}
        </main>
      </div>
      {!isTabletUp && (
        <BottomSheet
          expanded={sheetExpanded}
          onExpandedChange={setSheetExpanded}
          onHeightChange={setSheetHeight}
          offset={NAV_H}
          label="Device panel"
        >
          <SidePanel />
        </BottomSheet>
      )}
      {!isTabletUp && <BottomNav />}
    </div>
  );
}

const NO_LANDMARKS: never[] = [];

function SetupNeeded() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-140 flex-col justify-center gap-3 p-6">
      <h1 className="text-title-lg text-primary">Setup needed</h1>
      <p className="text-body-lg text-secondary">
        FindPhone isn&apos;t configured. Copy <code className="font-mono text-mono">web/.env.example</code> to{' '}
        <code className="font-mono text-mono">web/.env</code> and fill in the Firebase values, or set{' '}
        <code className="font-mono text-mono">VITE_USE_EMULATORS=true</code> to run against the local emulators.
      </p>
    </main>
  );
}
