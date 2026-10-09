// Free, keyless geodata used around the map. Every call is cached and throttled to stay inside
// each service's fair-use policy. None of them receives the phone number, only coordinates.
//   Addresses   Nominatim (OpenStreetMap)  1 request/s, no autocomplete
//   Search      Photon (komoot)            typeahead allowed
//   Weather     Open-Meteo
//   Landmarks   Overpass API               mirrors tried in order
import { log } from '../../lib/log';

export interface LatLng {
  lat: number;
  lng: number;
}

// ---------------------------------------------------------------------------------------------
// Address (reverse geocoding)

export interface Address {
  /** "SRM University, SRM Auditorium Road" */
  line1: string;
  /** "Potheri, Chengalpattu, Tamil Nadu 603203" */
  line2: string;
}

interface NominatimReverse {
  name?: string;
  address?: Record<string, string>;
}

const addressCache = new Map<string, Promise<Address | null>>();
let nominatimNext = 0;

/** Serialises Nominatim calls at ≥ 1.1 s apart. */
async function nominatimSlot(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nominatimNext - now);
  nominatimNext = Math.max(now, nominatimNext) + 1100;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

export function formatAddress(r: NominatimReverse): Address | null {
  const a = r.address ?? {};
  const place = r.name || a.amenity || a.building || a.university || a.college || a.shop || a.office;
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const area = a.suburb || a.neighbourhood || a.village || a.hamlet || a.quarter;
  const city = a.city || a.town || a.municipality || a.county || a.state_district;
  const region = [a.state, a.postcode].filter(Boolean).join(' ');
  const line1 = [place, street].filter(Boolean).join(', ') || area || city || '';
  if (!line1) return null;
  const rest = [area, city, region].filter((x): x is string => Boolean(x) && !line1.includes(x!));
  return { line1, line2: rest.join(', ') };
}

export function reverseGeocode(p: LatLng): Promise<Address | null> {
  const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`; // ~11 m grid
  const hit = addressCache.get(key);
  if (hit) return hit;
  const job = (async () => {
    await nominatimSlot();
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1` +
      `&accept-language=en&lat=${p.lat}&lon=${p.lng}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    return formatAddress((await res.json()) as NominatimReverse);
  })().catch((e: unknown) => {
    addressCache.delete(key); // allow a retry later
    log.warn('geo.address_failed', { type: e instanceof Error ? e.name : 'unknown' });
    return null;
  });
  addressCache.set(key, job);
  return job;
}

// ---------------------------------------------------------------------------------------------
// Place search

export interface PlaceResult {
  id: string;
  name: string;
  detail: string;
  lat: number;
  lng: number;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
}

export async function searchPlaces(query: string, near: LatLng | null, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const bias = near ? `&lat=${near.lat.toFixed(4)}&lon=${near.lng.toFixed(4)}` : '';
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en${bias}`, { signal });
  if (!res.ok) throw new Error(`photon ${res.status}`);
  const json = (await res.json()) as { features: PhotonFeature[] };
  return json.features.map((f, i) => {
    const p = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    const detail = [p.street, p.district ?? p.locality, p.city ?? p.county, p.state, p.country]
      .filter((x, idx, all) => x && all.indexOf(x) === idx && x !== p.name)
      .join(', ');
    return { id: `${p.osm_type ?? ''}${p.osm_id ?? i}`, name: p.name ?? p.street ?? q, detail, lat, lng };
  });
}

// ---------------------------------------------------------------------------------------------
// Weather

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export interface Weather {
  temperature: number;
  kind: WeatherKind;
  label: string;
  isDay: boolean;
  wind: number;
  humidity: number;
}

/** WMO weather interpretation codes → our categories. */
export function describeWeather(code: number): { kind: WeatherKind; label: string } {
  if (code === 0) return { kind: 'clear', label: 'Clear' };
  if (code <= 2) return { kind: 'partly', label: 'Partly cloudy' };
  if (code === 3) return { kind: 'cloudy', label: 'Overcast' };
  if (code <= 48) return { kind: 'fog', label: 'Fog' };
  if (code <= 57) return { kind: 'drizzle', label: 'Drizzle' };
  if (code <= 67 || (code >= 80 && code <= 82)) return { kind: 'rain', label: code >= 80 ? 'Rain showers' : 'Rain' };
  if (code <= 77 || code === 85 || code === 86) return { kind: 'snow', label: 'Snow' };
  return { kind: 'storm', label: 'Thunderstorm' };
}

const weatherCache = new Map<string, { at: number; value: Promise<Weather | null> }>();

export function fetchWeather(p: LatLng): Promise<Weather | null> {
  const key = `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`; // ~1 km grid
  const hit = weatherCache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value;
  const value = (async () => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(3)}&longitude=${p.lng.toFixed(3)}` +
      `&current=temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const c = ((await res.json()) as { current: Record<string, number> }).current;
    const d = describeWeather(c.weather_code ?? 0);
    return {
      temperature: Math.round(c.temperature_2m ?? 0),
      isDay: c.is_day === 1,
      wind: Math.round(c.wind_speed_10m ?? 0),
      humidity: Math.round(c.relative_humidity_2m ?? 0),
      ...d,
    };
  })().catch(() => {
    weatherCache.delete(key);
    return null;
  });
  weatherCache.set(key, { at: Date.now(), value });
  return value;
}

// ---------------------------------------------------------------------------------------------
// Nearby landmarks

export type LandmarkKind = 'education' | 'health' | 'safety' | 'transport' | 'fuel' | 'worship' | 'money';

export interface Landmark {
  id: string;
  name: string;
  kind: LandmarkKind;
  lat: number;
  lng: number;
}

// Public instances that send CORS headers (browsers can call them) and hold worldwide data.
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const KIND_BY_AMENITY: Record<string, LandmarkKind> = {
  university: 'education',
  college: 'education',
  school: 'education',
  hospital: 'health',
  clinic: 'health',
  pharmacy: 'health',
  police: 'safety',
  fire_station: 'safety',
  fuel: 'fuel',
  bank: 'money',
  atm: 'money',
  place_of_worship: 'worship',
  bus_station: 'transport',
};

/** Higher = more useful as an orientation landmark. */
const RANK: Record<LandmarkKind, number> = {
  education: 5,
  health: 5,
  safety: 4,
  transport: 4,
  worship: 2,
  fuel: 2,
  money: 1,
};

const landmarkCache = new Map<string, Promise<Landmark[]>>();

function distanceM(a: LatLng, b: LatLng): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** Picks well-known, well-spread landmarks: by rank, then distance, at least 150 m apart. */
export function pickLandmarks(all: Landmark[], centre: LatLng, max = 8): Landmark[] {
  const sorted = [...all].sort(
    (a, b) => RANK[b.kind] - RANK[a.kind] || distanceM(centre, a) - distanceM(centre, b),
  );
  const picked: Landmark[] = [];
  for (const l of sorted) {
    if (picked.length >= max) break;
    if (distanceM(centre, l) < 60) continue; // would sit on top of the device marker
    if (picked.some((p) => distanceM(p, l) < 150)) continue;
    picked.push(l);
  }
  return picked;
}

export function fetchLandmarks(p: LatLng, radiusM = 1500): Promise<Landmark[]> {
  const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`; // ~110 m grid
  const hit = landmarkCache.get(key);
  if (hit) return hit;
  const around = `around:${radiusM},${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
  const amenities = Object.keys(KIND_BY_AMENITY).join('|');
  const query =
    `[out:json][timeout:20];(` +
    `nwr(${around})["amenity"~"^(${amenities})$"]["name"];` +
    `nwr(${around})["railway"="station"]["name"];` +
    `);out center 80;`;

  const job = (async () => {
    for (const endpoint of OVERPASS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          // A busy instance can hang for a minute; move on to the next one instead.
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) continue;
        const json = (await res.json()) as {
          elements: Array<{ id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }>;
        };
        const all: Landmark[] = [];
        for (const e of json.elements) {
          const lat = e.lat ?? e.center?.lat;
          const lng = e.lon ?? e.center?.lon;
          const tags = e.tags ?? {};
          const kind = tags.railway === 'station' ? 'transport' : KIND_BY_AMENITY[tags.amenity ?? ''];
          if (lat === undefined || lng === undefined || !kind || !tags.name) continue;
          all.push({ id: `${e.type}/${e.id}`, name: tags['name:en'] ?? tags.name, kind, lat, lng });
        }
        return pickLandmarks(all, p);
      } catch {
        // try the next mirror
      }
    }
    landmarkCache.delete(key);
    log.warn('geo.landmarks_unavailable');
    return [];
  })();
  landmarkCache.set(key, job);
  return job;
}

// ---------------------------------------------------------------------------------------------
// Links (no API key needed)

export const streetViewUrl = (p: LatLng) =>
  `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

export const directionsUrl = (p: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/**
 * An aerial close-up of the device's surroundings: one Esri imagery tile at zoom 18 (~150 m
 * across), plus the device's pixel position inside it so the preview can be centred on it.
 */
export function aerialPreview(p: LatLng, zoom = 18): { url: string; x: number; y: number } {
  const n = 2 ** zoom;
  const xf = ((p.lng + 180) / 360) * n;
  const latRad = (p.lat * Math.PI) / 180;
  const yf = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tx = Math.floor(xf);
  const ty = Math.floor(yf);
  return {
    url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`,
    x: (xf - tx) * 256,
    y: (yf - ty) * 256,
  };
}
