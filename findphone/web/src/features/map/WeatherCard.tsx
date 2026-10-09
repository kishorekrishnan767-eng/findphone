import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Droplets, Moon, Sun, Wind } from 'lucide-react';
import { useApp } from '../../app/store';
import { Skeleton } from '../../design-system/components/Skeleton';
import { formatTemperature } from '../../lib/units';
import type { Address, LatLng, WeatherKind } from '../places/geoServices';
import { useWeather } from '../places/usePlaces';

const ICONS = {
  clear: [Sun, Moon],
  partly: [CloudSun, CloudMoon],
  cloudy: [Cloud, Cloud],
  fog: [CloudFog, CloudFog],
  drizzle: [CloudDrizzle, CloudDrizzle],
  rain: [CloudRain, CloudRain],
  snow: [CloudSnow, CloudSnow],
  storm: [CloudLightning, CloudLightning],
} as const;

function WeatherIcon({ kind, day }: { kind: WeatherKind | null; day: boolean }) {
  const Icon = kind ? ICONS[kind][day ? 0 : 1] : Cloud;
  return <Icon aria-hidden size={30} strokeWidth={1.5} className="shrink-0 text-stale-dot" />;
}

/** Current conditions where the phone is (Open-Meteo), with the area name. */
export function WeatherCard({ position, address }: { position: LatLng; address: Address | null | undefined }) {
  const units = useApp((s) => s.settings.units);
  const w = useWeather(position);
  if (w === null) return null;

  const area = address?.line2.split(',')[0] ?? address?.line1;

  return (
    <section
      aria-label="Weather at the phone"
      className="fp-glass fp-enter flex items-center gap-4 rounded-lg px-4 py-3"
      title={w ? `Wind ${w.wind} km/h · Humidity ${w.humidity}%` : undefined}
    >
      <WeatherIcon kind={w?.kind ?? null} day={w?.isDay ?? true} />
      <div className="min-w-0">
        {w ? (
          <>
            <p className="text-title-sm text-primary">{formatTemperature(w.temperature, units)}</p>
            <p className="text-caption text-secondary">{w.label}</p>
          </>
        ) : (
          <div className="flex flex-col gap-1" aria-hidden>
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        )}
      </div>
      {(area || w) && (
        <div className="hidden min-w-0 border-l border-line pl-4 xl:block">
          {area && <p className="max-w-44 truncate text-label text-primary">{area}</p>}
          {w && (
            <p className="flex items-center gap-2 text-caption text-tertiary">
              <Wind aria-hidden size={12} /> {w.wind} km/h
              <Droplets aria-hidden size={12} /> {w.humidity}%
            </p>
          )}
        </div>
      )}
    </section>
  );
}
