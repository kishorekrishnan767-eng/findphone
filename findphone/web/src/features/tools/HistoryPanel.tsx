import { Footprints, MapPin, Trash2 } from 'lucide-react';
import { actions, setState, useApp } from '../../app/store';
import { cn, focusRing } from '../../design-system/cn';
import { Button } from '../../design-system/components/Button';
import { EmptyState } from '../../design-system/components/EmptyState';
import { PanelHeader } from '../../design-system/components/PanelHeader';
import { Switch } from '../../design-system/components/Switch';
import { formatAgo } from '../../lib/time';
import { formatClock, formatDistance } from '../../lib/units';
import { useNow } from '../../shared/hooks/useNow';
import { distanceMeters } from '../map/geo';

/**
 * Movement trail. The phone only ever shares its latest position, so history is what this page
 * has seen while open: nothing is stored on a server or kept after the tab closes.
 */
export function HistoryPanel({ e164 }: { e164: string }) {
  const trail = useApp((s) => s.trails[e164]);
  const showTrail = useApp((s) => s.settings.showTrail);
  const units = useApp((s) => s.settings.units);
  const now = useNow(5000);
  const points = trail ?? [];

  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceMeters(points[i - 1]!, points[i]!);
  const span = points.length > 1 ? points[points.length - 1]!.at - points[0]!.at : 0;

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        title="Location history"
        subtitle="Positions received while this page has been open."
        back={{ label: 'Back to device', onClick: () => actions.openTool('overview') }}
      />

      <div className="grid grid-cols-3 gap-2">
        {[
          ['Points', String(points.length)],
          ['Moved', formatDistance(total, units)],
          ['Over', span ? `${Math.max(1, Math.round(span / 60_000))} min` : '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-subtle/60 px-3 py-2">
            <p className="text-caption text-tertiary">{label}</p>
            <p className="font-mono text-mono text-primary">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-subtle/60 px-3">
        <Switch
          label="Show trail on map"
          description="Dashed line through each position"
          checked={showTrail}
          onChange={(v) => actions.updateSettings({ showTrail: v })}
        />
      </div>

      {points.length === 0 ? (
        <EmptyState icon={Footprints} title="No movement yet">
          Positions appear here as the phone sends updates. Keep this page open to build a trail.
        </EmptyState>
      ) : (
        <ol className="fp-stagger flex flex-col" aria-label="Positions, newest first">
          {[...points].reverse().map((p, i, arr) => {
            const prev = arr[i + 1];
            const step = prev ? distanceMeters(prev, p) : null;
            return (
              <li key={p.at} className="relative pl-6">
                <span aria-hidden className={cn('absolute top-4 left-[6px] size-2 rounded-full', i === 0 ? 'bg-accent' : 'bg-tertiary')} />
                {i < arr.length - 1 && <span aria-hidden className="absolute top-7 bottom-0 left-[9.5px] w-px bg-line" />}
                <button
                  type="button"
                  onClick={() =>
                    actions.showPlace({ id: `trail-${p.at}`, name: `Position at ${formatClock(new Date(p.at))}`, detail: '', lat: p.lat, lng: p.lng })
                  }
                  className={cn('flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-hover', focusRing)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-mono text-primary">{formatClock(new Date(p.at))}</span>
                    <span className="block text-caption text-tertiary">
                      {formatAgo(new Date(p.at), now)} · ± {formatDistance(p.accuracy, units)}
                      {step !== null && ` · moved ${formatDistance(step, units)}`}
                    </span>
                  </span>
                  <MapPin aria-hidden size={16} className="shrink-0 text-tertiary" />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {points.length > 0 && (
        <Button
          variant="ghost"
          icon={Trash2}
          onClick={() =>
            setState((s) => {
              const trails = { ...s.trails };
              delete trails[e164];
              return { trails };
            })
          }
        >
          Clear trail
        </Button>
      )}
    </div>
  );
}
