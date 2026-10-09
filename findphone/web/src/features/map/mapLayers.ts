import type { GeoJSONSource, MapLibreMap } from 'maplibre-gl';
import type { Geofence, TrailPoint } from '../../app/store';
import { circlePolygon } from './geo';
import { tokenColor } from './mapStyles';

/** Data drawn on top of whichever base style is loaded. Re-applied after every style switch. */
export interface Overlays {
  accuracy: { lat: number; lng: number; accuracy: number } | null;
  trail: TrailPoint[] | null;
  geofence: Geofence | null;
  buildings: boolean;
  satellite: boolean;
}

const ACC = 'fp-accuracy';
const TRAIL = 'fp-trail';
const FENCE = 'fp-fence';
const BUILDINGS = 'fp-buildings';

const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

function setData(m: MapLibreMap, id: string, data: GeoJSON.FeatureCollection | GeoJSON.Feature) {
  m.getSource<GeoJSONSource>(id)?.setData(data);
}

/** First symbol layer: overlays go beneath place names so labels stay readable. */
function firstSymbolLayer(m: MapLibreMap): string | undefined {
  return m.getStyle().layers?.find((l) => l.type === 'symbol' || l.id === 'labels')?.id;
}

function ensure(m: MapLibreMap, o: Overlays) {
  const before = firstSymbolLayer(m);

  if (o.buildings && !m.getSource(BUILDINGS)) {
    // OpenFreeMap's OpenMapTiles vectors carry building heights; extrude them for 3D.
    m.addSource(BUILDINGS, { type: 'vector', url: 'https://tiles.openfreemap.org/planet' });
    m.addLayer(
      {
        id: BUILDINGS,
        type: 'fill-extrusion',
        source: BUILDINGS,
        'source-layer': 'building',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': tokenColor(o.satellite ? '--fp-text-primary' : '--fp-border-default'),
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': o.satellite ? 0.55 : 0.85,
        },
      },
      before,
    );
  }
  if (!o.buildings && m.getLayer(BUILDINGS)) {
    m.removeLayer(BUILDINGS);
    m.removeSource(BUILDINGS);
  }

  if (!m.getSource(FENCE)) {
    m.addSource(FENCE, { type: 'geojson', data: empty });
    m.addLayer({ id: `${FENCE}-fill`, type: 'fill', source: FENCE, paint: { 'fill-color': tokenColor('--fp-status-stale-dot'), 'fill-opacity': 0.08 } }, before);
    m.addLayer(
      {
        id: `${FENCE}-line`,
        type: 'line',
        source: FENCE,
        paint: { 'line-color': tokenColor('--fp-status-stale-dot'), 'line-width': 2, 'line-dasharray': [3, 2] },
      },
      before,
    );
  }

  if (!m.getSource(ACC)) {
    m.addSource(ACC, { type: 'geojson', data: empty });
    m.addLayer({ id: `${ACC}-fill`, type: 'fill', source: ACC, paint: { 'fill-color': tokenColor('--fp-map-accuracy-fill') } }, before);
    m.addLayer({ id: `${ACC}-line`, type: 'line', source: ACC, paint: { 'line-width': 2 } }, before);
  }
  // Teal disappears into vegetation and water on imagery; a white edge reads on any photo.
  m.setPaintProperty(`${ACC}-line`, 'line-color', tokenColor(o.satellite ? '--fp-map-marker-halo' : '--fp-map-accuracy-stroke'));
  m.setPaintProperty(`${ACC}-line`, 'line-opacity', o.satellite ? 0.85 : 1);

  if (!m.getSource(TRAIL)) {
    m.addSource(TRAIL, { type: 'geojson', data: empty });
    m.addLayer({
      id: `${TRAIL}-line`,
      type: 'line',
      source: TRAIL,
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': tokenColor('--fp-accent-hover'), 'line-width': 3, 'line-dasharray': [1, 1.6], 'line-opacity': 0.9 },
    });
    m.addLayer({
      id: `${TRAIL}-dots`,
      type: 'circle',
      source: TRAIL,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 3.5,
        'circle-color': tokenColor('--fp-accent-default'),
        'circle-stroke-color': tokenColor('--fp-map-marker-halo'),
        'circle-stroke-width': 1.5,
      },
    });
  }
}

export function syncOverlays(m: MapLibreMap, o: Overlays) {
  ensure(m, o);

  setData(m, ACC, o.accuracy ? circlePolygon(o.accuracy, o.accuracy.accuracy) : empty);
  setData(m, FENCE, o.geofence ? circlePolygon(o.geofence, o.geofence.radius, 96) : empty);

  const t = o.trail ?? [];
  setData(
    m,
    TRAIL,
    t.length < 2
      ? empty
      : {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: t.map((p) => [p.lng, p.lat]) } },
            // Dots for every point but the newest (that one is the device marker itself).
            ...t.slice(0, -1).map(
              (p): GeoJSON.Feature => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } }),
            ),
          ],
        },
  );
}
