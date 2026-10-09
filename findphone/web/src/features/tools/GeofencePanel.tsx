import { LocateFixed, Radar, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { actions, useApp } from '../../app/store';
import { Banner } from '../../design-system/components/Banner';
import { Button } from '../../design-system/components/Button';
import { EmptyState } from '../../design-system/components/EmptyState';
import { PanelHeader } from '../../design-system/components/PanelHeader';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { Switch } from '../../design-system/components/Switch';
import { formatDistance } from '../../lib/units';
import { distanceMeters } from '../map/geo';

const MIN = 100;
const MAX = 5000;
const STEP = 50;

/**
 * Safe zone: a circle around a point. Crossing it raises an alert (toast, activity log and, if
 * allowed, a system notification). Checked in this browser on every position update, so it works
 * while the page is open.
 */
export function GeofencePanel({ e164 }: { e164: string }) {
  const fence = useApp((s) => s.geofences[e164]);
  const lookup = useApp((s) => s.lookups[e164]);
  const units = useApp((s) => s.settings.units);
  const sliderId = useId();
  const position = lookup?.kind === 'found' && lookup.device.sharingEnabled ? lookup.device.position : null;

  const create = (radius = 500) => {
    if (!position) return;
    actions.setGeofence(e164, { lat: position.lat, lng: position.lng, radius, enabled: true, inside: true });
    actions.toast('Safe zone created around the current location');
  };

  const distance = fence && position ? distanceMeters(fence, position) : null;
  const inside = distance !== null && fence ? distance <= fence.radius : null;

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        title="Safe zone"
        subtitle="Get an alert when the phone leaves or returns to an area."
        back={{ label: 'Back to device', onClick: () => actions.openTool('overview') }}
      />

      {!fence ? (
        <>
          <EmptyState
            icon={Radar}
            title="No safe zone yet"
            action={
              <Button icon={LocateFixed} onClick={() => create()} disabled={!position}>
                Create around current location
              </Button>
            }
          >
            {position
              ? 'Starts as a 500 m circle around where the phone is now. You can resize it after.'
              : 'Needs the phone’s current location. It appears once the phone is sharing.'}
          </EmptyState>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-lg border border-line bg-subtle/60 p-3">
            <div>
              <p className="text-caption text-tertiary">Right now</p>
              <p className="text-label text-primary">
                {inside === null ? 'Location unknown' : inside ? 'Inside the zone' : 'Outside the zone'}
              </p>
              {distance !== null && fence && (
                <p className="text-caption text-secondary">
                  {inside
                    ? `${formatDistance(fence.radius - distance, units)} from the edge`
                    : `${formatDistance(distance - fence.radius, units)} beyond the edge`}
                </p>
              )}
            </div>
            {inside !== null && (
              <StatusBadge key={String(inside)} status={inside ? 'live' : 'stale'} label={inside ? 'Safe' : 'Outside'} />
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-line bg-subtle/60 p-3">
            <div className="flex items-baseline justify-between">
              <label htmlFor={sliderId} className="text-label text-primary">
                Radius
              </label>
              <span className="font-mono text-mono text-accent">{formatDistance(fence.radius, units)}</span>
            </div>
            <input
              id={sliderId}
              type="range"
              min={MIN}
              max={MAX}
              step={STEP}
              value={fence.radius}
              onChange={(e) => actions.setGeofence(e164, { ...fence, radius: Number(e.target.value), inside: null })}
              className="h-11 w-full cursor-pointer accent-accent"
            />
            <div className="flex justify-between text-caption text-tertiary">
              <span>{formatDistance(MIN, units)}</span>
              <span>{formatDistance(MAX, units)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-subtle/60 px-3">
            <Switch
              label="Alerts on"
              description="Notify when the phone crosses the edge"
              checked={fence.enabled}
              onChange={(enabled) => actions.setGeofence(e164, { ...fence, enabled, inside: null })}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={LocateFixed} disabled={!position} onClick={() => create(fence.radius)}>
              Re-centre on phone
            </Button>
            <Button variant="ghost" icon={Trash2} onClick={() => actions.setGeofence(e164, null)}>
              Delete zone
            </Button>
          </div>

          <Banner icon={Radar}>Alerts work while this page is open in a tab. The zone is saved in this browser only.</Banner>
        </>
      )}
    </div>
  );
}
