import { Layers, LocateFixed, Maximize, Minimize, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { actions, useApp } from '../../app/store';
import { cn } from '../../design-system/cn';
import { IconButton } from '../../design-system/components/IconButton';
import { Menu } from '../../design-system/components/Menu';
import { Switch } from '../../design-system/components/Switch';

const group = 'fp-glass flex flex-col overflow-hidden rounded-lg';

/** Right-edge controls: compass, recentre, zoom, overlays and fullscreen. */
export function MapRail({
  bearing,
  pitched,
  onResetNorth,
  onZoom,
  canRecenter,
  topClass = 'top-4',
}: {
  bearing: number;
  pitched: boolean;
  onResetNorth: () => void;
  onZoom: (delta: number) => void;
  canRecenter: boolean;
  /** Vertical offset, so the rail clears whatever sits above it (e.g. the weather card). */
  topClass?: string;
}) {
  const settings = useApp((s) => s.settings);
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    const on = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  const rotated = Math.abs(bearing) > 0.5 || pitched;

  return (
    <div className={cn('fp-stagger absolute right-4 z-(--fp-z-map-controls) flex flex-col gap-3', topClass)} role="group" aria-label="Map controls">
      {/* Compass: the needle shows north; tap to face north again. */}
      <button
        type="button"
        onClick={onResetNorth}
        aria-label={rotated ? 'Reset map to north' : 'Map faces north'}
        title={rotated ? 'Reset to north' : 'North is up'}
        className="fp-glass flex size-14 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <svg aria-hidden viewBox="0 0 40 40" className="fp-needle size-10" style={{ transform: `rotate(${-bearing}deg)` }}>
          <text x="20" y="9" textAnchor="middle" className="fill-[var(--fp-text-primary)] text-[8px] font-semibold">
            N
          </text>
          <path d="M20 11 L24 21 L20 19 L16 21 Z" className="fill-[var(--fp-status-danger-dot)]" />
          <path d="M20 31 L24 21 L20 23 L16 21 Z" className="fill-[var(--fp-text-tertiary)]" />
        </svg>
      </button>

      <div className={group}>
        <IconButton icon={LocateFixed} label="Centre on device" onClick={actions.recenter} disabled={!canRecenter} />
      </div>

      <div className={cn(group, 'divide-y divide-line')}>
        <IconButton icon={Plus} label="Zoom in" onClick={() => onZoom(1)} />
        <IconButton icon={Minus} label="Zoom out" onClick={() => onZoom(-1)} />
      </div>

      <div className={group}>
        <Menu
          label="Map layers"
          trigger={({ open, toggle, id }) => (
            <IconButton
              icon={Layers}
              label="Map layers"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={open ? id : undefined}
              onClick={toggle}
             
            />
          )}
        >
          {() => (
            <div className="w-64 px-3 py-1">
              <Switch
                label="Nearby landmarks"
                checked={settings.showLandmarks}
                onChange={(showLandmarks) => actions.updateSettings({ showLandmarks })}
              />
              <Switch label="Movement trail" checked={settings.showTrail} onChange={(showTrail) => actions.updateSettings({ showTrail })} />
              <Switch
                label="Accuracy circle"
                checked={settings.showAccuracy}
                onChange={(showAccuracy) => actions.updateSettings({ showAccuracy })}
              />
            </div>
          )}
        </Menu>
      </div>

      <div className={group}>
        <IconButton
          icon={fullscreen ? Minimize : Maximize}
          label={fullscreen ? 'Exit full screen' : 'Full screen'}
          onClick={toggleFullscreen}
         
        />
      </div>
    </div>
  );
}
