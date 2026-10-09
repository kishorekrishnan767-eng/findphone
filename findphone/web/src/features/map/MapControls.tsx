import { Layers, LocateFixed, Minus, Plus } from 'lucide-react';
import { IconButton } from '../../design-system/components/IconButton';

/** Right-edge stack: zoom group, recenter, base-layer toggle. 44 px targets, raised surface, e2. */
export function MapControls({
  onZoomIn,
  onZoomOut,
  onRecenter,
  canRecenter,
  satelliteAvailable,
  satellite,
  onToggleSatellite,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  canRecenter: boolean;
  satelliteAvailable: boolean;
  satellite: boolean;
  onToggleSatellite: () => void;
}) {
  const group = 'flex flex-col overflow-hidden rounded-md border border-line bg-raised shadow-e2';
  return (
    <div className="fp-stagger absolute top-14 right-4 z-(--fp-z-map-controls) flex flex-col gap-2" role="group" aria-label="Map controls">
      <div className={`${group} divide-y divide-line`}>
        <IconButton icon={Plus} label="Zoom in" onClick={onZoomIn} />
        <IconButton icon={Minus} label="Zoom out" onClick={onZoomOut} />
      </div>
      <div className={group}>
        <IconButton icon={LocateFixed} label="Center on device" onClick={onRecenter} disabled={!canRecenter} />
      </div>
      {satelliteAvailable && (
        <div className={group}>
          <IconButton
            icon={Layers}
            label={satellite ? 'Switch to map view' : 'Switch to satellite view'}
            aria-pressed={satellite}
            onClick={onToggleSatellite}
          />
        </div>
      )}
    </div>
  );
}
