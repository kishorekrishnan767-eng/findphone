import type { StyleSpecification } from 'maplibre-gl';
import { env } from '../../config/env';

export type BaseLayer = 'standard' | 'satellite';

/** The map opens on satellite imagery, seen straight down (pitch is locked to 0 in MapView). */
export const DEFAULT_LAYER: BaseLayer = 'satellite';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

/**
 * Keyless satellite: Esri World Imagery with Esri's boundaries-and-places label overlay.
 * Used when no MapTiler key is configured; with a key, MapTiler's hybrid style is used instead.
 */
const esriSatellite: StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: 'raster',
      tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
    labels: {
      type: 'raster',
      tiles: [`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'imagery', type: 'raster', source: 'imagery' },
    { id: 'labels', type: 'raster', source: 'labels', paint: { 'raster-opacity': 0.9 } },
  ],
};

export function mapStyle(layer: BaseLayer, dark: boolean): string | StyleSpecification {
  if (layer === 'satellite') return env.map.satelliteStyle ?? esriSatellite;
  return dark ? env.map.darkStyle : env.map.lightStyle;
}

/** Stable key for "has the style actually changed?" checks (style objects aren't comparable by URL). */
export function styleKey(layer: BaseLayer, dark: boolean): string {
  return layer === 'satellite' ? 'satellite' : dark ? 'standard-dark' : 'standard-light';
}

/** Initial view before any search: the default country, or the world. */
export const initialView =
  env.defaultCountry === 'IN'
    ? { center: [78.9, 22.6] as [number, number], zoom: 3.6 }
    : { center: [10, 20] as [number, number], zoom: 1.6 };

/** Reads a design-token colour from CSS and converts #rrggbbaa (which MapLibre may not parse) to rgba(). */
export function tokenColor(name: string): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(raw);
  if (!m) return raw || '#0f766e';
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h!, 16));
  const a = m[4] ? parseInt(m[4], 16) / 255 : 1;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}
