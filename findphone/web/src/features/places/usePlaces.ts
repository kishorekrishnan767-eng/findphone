import { useEffect, useState } from 'react';
import {
  type Address,
  type LatLng,
  type Landmark,
  type Weather,
  fetchLandmarks,
  fetchWeather,
  reverseGeocode,
} from './geoServices';

/**
 * Fetches a value for a position, keyed on a rounded position so small GPS jitter doesn't refetch.
 * Returns `undefined` while loading and `null` when the service had no answer.
 */
function useGeoValue<T>(p: LatLng | null, digits: number, fetcher: (p: LatLng) => Promise<T>, enabled = true): T | undefined {
  const key = p && enabled ? `${p.lat.toFixed(digits)},${p.lng.toFixed(digits)}` : null;
  const [result, setResult] = useState<{ key: string; value: T } | null>(null);

  useEffect(() => {
    if (!key || !p) return;
    let alive = true;
    void fetcher(p).then((value) => {
      if (alive) setResult({ key, value });
    });
    return () => {
      alive = false;
    };
    // `p` is captured at the moment the rounded key changes; that's intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fetcher]);

  return result && result.key === key ? result.value : undefined;
}

/** Street address, refreshed when the device moves more than ~11 m. */
export const useAddress = (p: LatLng | null): Address | null | undefined => useGeoValue(p, 4, reverseGeocode);

/** Current weather, on a ~1 km grid (cached 10 min in the service). */
export const useWeather = (p: LatLng | null): Weather | null | undefined => useGeoValue(p, 2, fetchWeather);

/** Named landmarks within 1.5 km, on a ~110 m grid. */
export const useLandmarks = (p: LatLng | null, enabled: boolean): Landmark[] | undefined =>
  useGeoValue(p, 3, fetchLandmarks, enabled);
