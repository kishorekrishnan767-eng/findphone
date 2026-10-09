import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { AttributionControl, type GeoJSONSource, MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CAMERA_MAX_MS, MARKER_GLIDE_MS, easeMove } from '../../lib/easing';
import { log } from '../../lib/log';
import { usePrefersDark, useReducedMotion } from '../../shared/hooks/useMediaQuery';
import { MapControls } from './MapControls';
import { type LngLatAccuracy, circlePolygon, distanceMeters, zoomForAccuracy } from './geo';
import { type BaseLayer, DEFAULT_LAYER, initialView, mapStyle, styleKey, tokenColor } from './mapStyles';
import { ScanOverlay } from './ScanOverlay';

// MapLibre 6 locates its worker relative to its own module, which bundling breaks. Hand Vite's
// emitted URL to it explicitly (same-origin, so CSP stays `worker-src 'self' blob:`).
setWorkerUrl(workerUrl);

const SOURCE = 'fp-accuracy';
const JUMP_INSTEAD_OF_GLIDE_M = 5_000;

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Full-screen map with the device marker, accuracy circle and custom controls.
 * - `target` moves the marker; changes glide over 600 ms (rAF, eased), or jump under reduced motion.
 * - `focusKey` changing (a new search result) flies the camera to fit the accuracy circle.
 * - `searching` shows a radar sweep over the map while a lookup is in flight.
 */
export function MapView({
  target,
  live,
  focusKey,
  padding,
  searching = false,
}: {
  target: LngLatAccuracy | null;
  live: boolean;
  focusKey: string | null;
  padding: Padding;
  searching?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const shown = useRef<LngLatAccuracy | null>(null);
  const frame = useRef<number | null>(null);
  // Own flag: map.isStyleLoaded() is false whenever tiles are loading, i.e. during every flyTo.
  const styleReady = useRef(false);
  const [failed, setFailed] = useState(() => !supportsWebGL());
  const [layer, setLayer] = useState<BaseLayer>(DEFAULT_LAYER);
  const dark = usePrefersDark();
  const reducedMotion = useReducedMotion();

  // --- map lifecycle ---------------------------------------------------------------------------
  useEffect(() => {
    if (!container.current || failed) return;
    let m: MapLibreMap;
    try {
      m = new MapLibreMap({
        container: container.current,
        style: mapStyle(DEFAULT_LAYER, window.matchMedia('(prefers-color-scheme: dark)').matches),
        center: initialView.center,
        zoom: initialView.zoom,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        maxPitch: 0,
      });
    } catch (e) {
      log.error('map.init_failed', e);
      // Reacting to an external system failing to initialise is what effects are for.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    m.addControl(new AttributionControl({ compact: true }), 'top-right');
    m.touchZoomRotate.disableRotation();
    m.on('error', (e) => log.warn('map.error', { type: e.type }));
    m.on('style.load', () => {
      styleReady.current = true;
      syncAccuracyLayer(m, shown.current, true);
    });
    map.current = m;
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      marker.current?.remove();
      marker.current = null;
      m.remove();
      map.current = null;
    };
    // Runs once. `failed` only ever changes from the initial WebGL check or this effect's catch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme or base-layer change → swap style; the accuracy layer is re-added on 'style.load'.
  const currentStyle = useRef<string | null>(null);
  useEffect(() => {
    const key = styleKey(layer, dark);
    if (currentStyle.current === null) {
      currentStyle.current = key; // The constructor already loaded this one.
      return;
    }
    if (key === currentStyle.current) return;
    currentStyle.current = key;
    styleReady.current = false;
    map.current?.setStyle(mapStyle(layer, dark));
  }, [layer, dark]);

  // --- marker + accuracy circle ----------------------------------------------------------------
  const place = useCallback((p: LngLatAccuracy) => {
    const m = map.current;
    if (!m) return;
    shown.current = p;
    if (!marker.current) {
      // First appearance pops in (CSS, skipped under reduced motion); later moves glide.
      marker.current = new Marker({ element: createMarkerElement(), anchor: 'center' }).setLngLat([p.lng, p.lat]).addTo(m);
    } else {
      marker.current.setLngLat([p.lng, p.lat]);
    }
    syncAccuracyLayer(m, p, styleReady.current);
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);

    if (!target) {
      marker.current?.remove();
      marker.current = null;
      shown.current = null;
      syncAccuracyLayer(m, null, styleReady.current);
      return;
    }

    const from = shown.current;
    if (!from || reducedMotion || distanceMeters(from, target) > JUMP_INSTEAD_OF_GLIDE_M) {
      place(target);
      return;
    }
    const start = performance.now();
    const step = (t: number) => {
      const k = easeMove(Math.min(1, (t - start) / MARKER_GLIDE_MS));
      place({
        lat: from.lat + (target.lat - from.lat) * k,
        lng: from.lng + (target.lng - from.lng) * k,
        accuracy: from.accuracy + (target.accuracy - from.accuracy) * k,
      });
      frame.current = k < 1 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
  }, [target, reducedMotion, place]);

  useEffect(() => {
    marker.current?.getElement().classList.toggle('is-stale', !live);
  }, [live, target]);

  // --- camera -----------------------------------------------------------------------------------
  const focus = useCallback(
    (p: LngLatAccuracy, animate: boolean) => {
      const m = map.current;
      if (!m) return;
      const camera = { center: [p.lng, p.lat] as [number, number], zoom: zoomForAccuracy(p.accuracy, p.lat), padding };
      if (!animate || reducedMotion) m.jumpTo(camera);
      else m.flyTo({ ...camera, maxDuration: CAMERA_MAX_MS, curve: 1.42 });
    },
    [padding, reducedMotion],
  );

  const targetRef = useRef(target);
  useEffect(() => {
    targetRef.current = target; // declared before the effect below, so it runs first
  });
  useEffect(() => {
    if (focusKey && targetRef.current) focus(targetRef.current, true);
    // Only a new search result moves the camera; live updates move the marker, not the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const zoomBy = (delta: number) => {
    const m = map.current;
    if (!m) return;
    m.easeTo({ zoom: m.getZoom() + delta, duration: reducedMotion ? 0 : 200 });
  };

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center bg-subtle p-6 text-center text-body text-secondary">
        The map couldn't load in this browser (WebGL is off or unsupported). Device details are still shown in the panel.
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" role="region" aria-label="Map showing the device's location" />
      <ScanOverlay active={searching} padding={padding} />
      <MapControls
        onZoomIn={() => zoomBy(1)}
        onZoomOut={() => zoomBy(-1)}
        onRecenter={() => target && focus(target, true)}
        canRecenter={Boolean(target)}
        satelliteAvailable
        satellite={layer === 'satellite'}
        onToggleSatellite={() => setLayer((l) => (l === 'satellite' ? 'standard' : 'satellite'))}
      />
    </div>
  );
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Teal dot, white ring, thin dark outer edge (visible on any tile), plus a pulse ring when live. */
function createMarkerElement(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'fp-marker';
  el.setAttribute('aria-hidden', 'true');
  // MapLibre owns the outer element's transform; animations run on the inner body instead.
  el.innerHTML =
    '<span class="fp-marker__body">' +
    '<span class="fp-marker__ripple"></span>' +
    '<span class="fp-marker__pulse"></span>' +
    '<span class="fp-marker__dot"></span>' +
    '</span>';
  return el;
}

function syncAccuracyLayer(m: MapLibreMap, p: LngLatAccuracy | null, styleReady: boolean) {
  if (!styleReady) return; // re-run from the style.load handler
  const data: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: p ? [circlePolygon(p, p.accuracy)] : [],
  };
  const source = m.getSource<GeoJSONSource>(SOURCE);
  if (source) {
    source.setData(data);
    return;
  }
  m.addSource(SOURCE, { type: 'geojson', data });
  m.addLayer({
    id: `${SOURCE}-fill`,
    type: 'fill',
    source: SOURCE,
    paint: { 'fill-color': tokenColor('--fp-map-accuracy-fill') },
  });
  m.addLayer({
    id: `${SOURCE}-line`,
    type: 'line',
    source: SOURCE,
    paint: { 'line-color': tokenColor('--fp-map-accuracy-stroke'), 'line-width': 1.5 },
  });
}
