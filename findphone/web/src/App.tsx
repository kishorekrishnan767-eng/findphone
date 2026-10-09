import { useMemo, useState } from 'react';
import { env, isFirebaseConfigured } from './config/env';
import { BottomSheet } from './design-system/components/BottomSheet';
import { ToastProvider } from './design-system/components/Toast';
import { SearchPanel } from './features/lookup/components/SearchPanel';
import { deriveStatus } from './features/lookup/domain/status';
import { useDeviceLookup } from './features/lookup/useDeviceLookup';
import { MapView, type Padding } from './features/map/MapView';
import { useMediaQuery } from './shared/hooks/useMediaQuery';
import { useNow } from './shared/hooks/useNow';

const SHEET_PEEK = 176;

export function App() {
  if (!isFirebaseConfigured) return <SetupNeeded />;
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}

function Dashboard() {
  const { state, search, refresh, retry, reset } = useDeviceLookup();
  const isTabletUp = useMediaQuery('(min-width: 768px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const now = useNow(1000, state.kind === 'found' || state.kind === 'rateLimited');
  const [sheetExpanded, setSheetExpanded] = useState(true);

  const status = state.kind === 'found' ? deriveStatus(state.device, now, env.liveThresholdMs) : null;
  const showsPin = status?.kind === 'live' || status?.kind === 'stale';
  const position = state.kind === 'found' && showsPin ? state.device.position : null;

  // Stable object identity so the marker only animates when coordinates actually change.
  const target = useMemo(
    () => (position ? { lat: position.lat, lng: position.lng, accuracy: position.accuracy } : null),
    [position?.lat, position?.lng, position?.accuracy], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const focusKey = state.kind === 'found' && target ? state.phone.e164 : null;

  // Mobile: collapse the sheet to its peek height when a pin appears, so the map is visible.
  // Adjusted during render rather than in an effect, so there is no extra paint at the old height.
  const [lastFocusKey, setLastFocusKey] = useState(focusKey);
  if (focusKey !== lastFocusKey) {
    setLastFocusKey(focusKey);
    setSheetExpanded(!target);
  }

  // Keep the device clear of the floating panel / bottom sheet when the camera moves.
  const padding: Padding = isTabletUp
    ? { top: 48, right: 72, bottom: 48, left: (isDesktop ? 384 : 344) + 16 + 32 }
    : { top: 48, right: 72, bottom: SHEET_PEEK + 24, left: 24 };

  const panel = (variant: 'panel' | 'sheet') => (
    <SearchPanel
      variant={variant}
      state={state}
      status={status}
      now={now}
      onSearch={search}
      onRefresh={refresh}
      onRetry={retry}
      onReset={reset}
    />
  );

  return (
    <div className="flex h-dvh flex-col bg-canvas text-primary">
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <h1 className="sr-only">FindPhone</h1>
        <MapView
          target={target}
          live={status?.kind === 'live'}
          focusKey={focusKey}
          padding={padding}
          searching={state.kind === 'loading'}
        />
        {isTabletUp ? (
          <aside
            aria-label="Search"
            className="fp-enter absolute top-4 left-4 z-(--fp-z-panel) max-h-[calc(100%-2rem)] w-86 overflow-y-auto rounded-lg border border-line bg-raised shadow-e2 lg:w-96"
          >
            {panel('panel')}
          </aside>
        ) : (
          <BottomSheet expanded={sheetExpanded} onExpandedChange={setSheetExpanded} label="Search and result">
            {panel('sheet')}
          </BottomSheet>
        )}
      </main>
    </div>
  );
}

function SetupNeeded() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-140 flex-col justify-center gap-3 p-6">
      <h1 className="text-title-lg text-primary">Setup needed</h1>
      <p className="text-body-lg text-secondary">
        FindPhone isn't configured. Copy <code className="font-mono text-mono">web/.env.example</code> to{' '}
        <code className="font-mono text-mono">web/.env</code> and fill in the Firebase values, or set{' '}
        <code className="font-mono text-mono">VITE_USE_EMULATORS=true</code> to run against the local emulators.
      </p>
    </main>
  );
}
