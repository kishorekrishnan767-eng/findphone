const EARTH_RADIUS_M = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export interface LngLatAccuracy {
  lat: number;
  lng: number;
  accuracy: number;
}

/** Great-circle distance in metres. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Geodesic circle as a GeoJSON polygon (the accuracy radius), `steps` vertices. */
export function circlePolygon(center: { lat: number; lng: number }, radiusM: number, steps = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const lat1 = rad(center.lat);
  const lng1 = rad(center.lng);
  const d = radiusM / EARTH_RADIUS_M;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing));
    const lng2 =
      lng1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    ring.push([((deg(lng2) + 540) % 360) - 180, deg(lat2)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

/**
 * Zoom at which the accuracy circle's radius is about `radiusPx` on screen:
 * ≈ 17 for ≤ 20 m, ≈ 13.6 for 1 km. Clamped to [3, 17].
 */
export function zoomForAccuracy(accuracyM: number, latitude: number, radiusPx = 80): number {
  const metresPerPixelAtZ0 = 156_543.033_92 * Math.cos(rad(latitude));
  const z = Math.log2((metresPerPixelAtZ0 * radiusPx) / Math.max(accuracyM, 5));
  return Math.min(17, Math.max(3, z));
}

export function googleMapsUrl(p: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
}

/** `12.97160, 77.59460`: five decimals ≈ 1 m, the most the accuracy ever justifies. */
export function formatCoordinates(p: { lat: number; lng: number }): string {
  return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}
