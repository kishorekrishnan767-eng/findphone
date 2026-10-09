import { ChevronRight, Footprints, LocateFixed, MapPin } from 'lucide-react';
import { useApp } from '../../app/store';
import { cn, focusRing } from '../../design-system/cn';
import { Skeleton } from '../../design-system/components/Skeleton';
import { formatAgo } from '../../lib/time';
import { accuracyBars, formatDistance } from '../../lib/units';
import { type Address, aerialPreview, streetViewUrl } from '../places/geoServices';
import type { LngLatAccuracy } from './geo';

/** Bottom strip over the map: live state, accuracy, address, Street View and an aerial close-up. */
export function LiveLocationBar({
  position,
  live,
  seenAt,
  now,
  address,
}: {
  position: LngLatAccuracy;
  live: boolean;
  seenAt: Date;
  now: Date;
  address: Address | null | undefined;
}) {
  const units = useApp((s) => s.settings.units);
  const bars = accuracyBars(position.accuracy);
  const preview = aerialPreview(position);
  const street = streetViewUrl(position);

  return (
    <section
      aria-label="Live location"
      className="fp-glass fp-enter absolute right-20 bottom-4 left-4 z-(--fp-z-panel) flex items-center gap-4 rounded-xl p-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="fp-orb" data-state={live ? 'live' : 'stale'}>
          <LocateFixed aria-hidden size={24} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-title-sm text-primary">
            {live ? 'Live location' : 'Last known location'}
            <span aria-hidden className={cn('size-2 rounded-full', live ? 'fp-pulse-dot relative bg-live-dot' : 'bg-stale-dot')} />
          </p>
          <p className="text-caption text-secondary">
            {live ? 'Updated' : 'Seen'} {formatAgo(seenAt, now)}
          </p>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-3 border-l border-line pl-4 lg:flex">
        <div>
          <p className="text-caption text-tertiary">Accuracy</p>
          <p className="font-mono text-mono text-primary">± {formatDistance(position.accuracy, units)}</p>
        </div>
        <span className="fp-bars" role="img" aria-label={`Signal quality ${bars} of 4`}>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} data-on={i <= bars || undefined} />
          ))}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3 border-l border-line pl-4">
        <MapPin aria-hidden size={20} strokeWidth={1.75} className="shrink-0 text-accent" />
        {address === undefined ? (
          <div className="flex flex-1 flex-col gap-1" aria-hidden>
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-40" />
          </div>
        ) : (
          <p className="min-w-0 text-body text-primary">
            <span className="block truncate">{address?.line1 ?? 'Address unavailable'}</span>
            {address?.line2 && <span className="block truncate text-caption text-secondary">{address.line2}</span>}
          </p>
        )}
      </div>

      <a
        href={street}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('hidden h-11 shrink-0 items-center gap-2 rounded-md border border-line bg-subtle/70 px-3 text-label text-primary hover:bg-hover xl:flex', focusRing)}
      >
        <Footprints aria-hidden size={18} className="text-stale-dot" />
        Street View
      </a>

      {/* Aerial close-up (~150 m across), centred on the phone. Opens Street View. */}
      <a
        href={street}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open Street View at this location"
        className={cn('group relative hidden h-16 w-36 shrink-0 overflow-hidden rounded-md border border-line md:block', focusRing)}
        style={{
          backgroundImage: `url(${preview.url})`,
          backgroundSize: '256px 256px',
          backgroundPosition: `${72 - preview.x}px ${32 - preview.y}px`,
        }}
      >
        <span aria-hidden className="absolute top-1/2 left-1/2 size-3 -translate-1/2 rounded-full border-2 border-marker-halo bg-marker" />
        <span aria-hidden className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-canvas/70 text-primary transition-transform duration-150 group-hover:translate-x-1">
          <ChevronRight size={16} />
        </span>
      </a>
    </section>
  );
}
