import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { Banknote, BusFront, Fuel, GraduationCap, Hospital, Landmark as LandmarkIcon, MapPin, ShieldCheck, Smartphone, TrainFront } from 'lucide-react';
import { AttributionControl, MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { type Geofence, type MapMode, type TrailPoint, actions } from '../../app/store';
import { CAMERA_MAX_MS, MARKER_GLIDE_MS, easeMove } from '../../lib/easing';
import { log } from '../../lib/log';
import { useReducedMotion } from '../../shared/hooks/useMediaQuery';
import type { Landmark, PlaceResult } from '../places/geoServices';
import { MapRail } from './MapRail';
import { ScanOverlay } from './ScanOverlay';
import { type LngLatAccuracy, distanceMeters, zoomForAccuracy } from './geo';
import { type Overlays, syncOverlays } from './mapLayers';
import { initialView, mapStyle, styleKey } from './mapStyles';

// MapLibre 6 locates its worker relative to its own module, which bundling breaks. Hand Vite's
// emitted URL to it explicitly (same-origin, so CSP stays `worker-src 'self' blob:`).
setWorkerUrl(workerUrl);

const JUMP_INSTEAD_OF_GLIDE_M = 5_000;
const PITCH_3D = 58;

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MapDevice {
  e164: string;
  name: string;
  position: LngLatAccuracy;
  live: boolean;
}

export interface MapViewProps {
  /** The selected device, if it has a position. Its marker glides between updates. */
  focus: MapDevice | null;
  /** Other watched devices with positions: small markers, click to select. */
  others: MapDevice[];
  trail: TrailPoint[] | null;
  geofence: Geofence | null;
  landmarks: Landmark[];
  place: PlaceResult | null;
  mode: MapMode;
  dark: boolean;
  showAccuracy: boolean;
  /** Changes when the user picks another device: the camera flies to it. */
  focusKey: string | null;
  recenterNonce: number;
  padding: Padding;
  scanPadding?: Padding;
  searching?: boolean;
  railTopClass?: string;
}

export function MapView(props: MapViewProps) {
  const { focus, others, trail, geofence, landmarks, place, mode, dark, showAccuracy, focusKey, recenterNonce, padding, searching = false } = props;
  const scanPadding = props.scanPadding ?? padding;

  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const styleReady = useRef(false);
  const overlays = useRef<Overlays>({ accuracy: null, trail: null, geofence: null, buildings: false, satellite: true });
  const focusMarker = useRef<Marker | null>(null);
  const shown = useRef<LngLatAccuracy | null>(null);
  const frame = useRef<number | null>(null);
  const [failed, setFailed] = useState(() => !supportsWebGL());
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);
  // The callout above the focused marker; React renders the device name into it via a portal.
  const [tagEl] = useState(() => {
    const d = document.createElement('div');
    d.className = 'fp-device-tag';
    return d;
  });
  const markerFor = useRef<string | null>(null);
  const reducedMotion = useReducedMotion();

  const applyOverlays = useCallback((patch: Partial<Overlays>) => {
    overlays.current = { ...overlays.current, ...patch };
    const m = map.current;
    if (m && styleReady.current) syncOverlays(m, overlays.current);
  }, []);

  // --- lifecycle -------------------------------------------------------------------------------
  useEffect(() => {
    if (!container.current || failed) return;
    let m: MapLibreMap;
    try {
      m = new MapLibreMap({
        container: container.current,
        style: mapStyle(mode, dark),
        center: initialView.center,
        zoom: initialView.zoom,
        attributionControl: false,
        maxPitch: 70,
        pitch: mode === '3d' ? PITCH_3D : 0,
      });
    } catch (e) {
      log.error('map.init_failed', e);
      // Reacting to an external system failing to initialise is what effects are for.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    m.addControl(new AttributionControl({ compact: true }), 'bottom-right');
    m.on('error', (e) => log.warn('map.error', { type: e.type }));
    m.on('style.load', () => {
      styleReady.current = true;
      syncOverlays(m, overlays.current);
    });
    m.on('rotate', () => setBearing(m.getBearing()));
    // Landmark labels only make sense at street level; hide them when zoomed out (CSS keys off this).
    const markNear = () => container.current?.toggleAttribute('data-near', m.getZoom() >= 14);
    m.on('zoom', markNear);
    markNear();
    // Start with the attribution collapsed to its (i) button so it never sits under the live bar.
    m.once('load', () => container.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));
    m.on('pitch', () => setPitch(m.getPitch()));
    map.current = m;
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      focusMarker.current?.remove();
      focusMarker.current = null;
      m.remove();
      map.current = null;
    };
    // Runs once; later style/mode changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- mode / theme ---------------------------------------------------------------------------
  const currentStyle = useRef<string | null>(null);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const key = styleKey(mode, dark);
    const satellite = mode !== 'map';
    overlays.current = { ...overlays.current, buildings: mode === '3d', satellite };
    if (currentStyle.current === null) currentStyle.current = key; // constructor loaded it
    else if (key !== currentStyle.current) {
      currentStyle.current = key;
      styleReady.current = false;
      m.setStyle(mapStyle(mode, dark));
    } else if (styleReady.current) {
      syncOverlays(m, overlays.current); // same base style; toggle buildings only
    }

    // 3D: tilt and allow rotation. Flat modes: face north, top-down, no rotation gestures.
    if (mode === '3d') {
      m.dragRotate.enable();
      m.touchZoomRotate.enableRotation();
      m.touchPitch.enable();
      m.easeTo({ pitch: PITCH_3D, bearing: m.getBearing() || -20, duration: reducedMotion ? 0 : 900 });
    } else {
      m.dragRotate.disable();
      m.touchZoomRotate.disableRotation();
      m.touchPitch.disable();
      if (m.getPitch() || m.getBearing()) m.easeTo({ pitch: 0, bearing: 0, duration: reducedMotion ? 0 : 700 });
    }
  }, [mode, dark, reducedMotion]);

  // --- overlays --------------------------------------------------------------------------------
  useEffect(() => applyOverlays({ trail }), [trail, applyOverlays]);
  useEffect(() => applyOverlays({ geofence: geofence ?? null }), [geofence, applyOverlays]);
  useEffect(() => applyOverlays({ accuracy: showAccuracy ? shown.current : null }), [showAccuracy, applyOverlays]);

  // --- focused device marker (glides between positions) -----------------------------------------
  const place_ = useCallback(
    (p: LngLatAccuracy) => {
      const m = map.current;
      if (!m) return;
      shown.current = p;
      if (!focusMarker.current) {
        const el = createMarkerElement();
        el.appendChild(tagEl);
        focusMarker.current = new Marker({ element: el, anchor: 'center' }).setLngLat([p.lng, p.lat]).addTo(m);
      } else {
        focusMarker.current.setLngLat([p.lng, p.lat]);
      }
      applyOverlays({ accuracy: showAccuracy ? p : null });
    },
    [applyOverlays, showAccuracy, tagEl],
  );

  const target = focus?.position ?? null;
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);

    // Another device was picked, or the position went away: drop the old marker (the next one pops in).
    if (!target || markerFor.current !== focusKey) {
      focusMarker.current?.remove();
      focusMarker.current = null;
      shown.current = null;
      markerFor.current = focusKey;
    }
    if (!target) {
      applyOverlays({ accuracy: null });
      return;
    }
    const from = shown.current;
    if (!from || reducedMotion || distanceMeters(from, target) > JUMP_INSTEAD_OF_GLIDE_M) {
      place_(target);
      return;
    }
    const start = performance.now();
    const step = (t: number) => {
      const k = easeMove(Math.min(1, (t - start) / MARKER_GLIDE_MS));
      place_({
        lat: from.lat + (target.lat - from.lat) * k,
        lng: from.lng + (target.lng - from.lng) * k,
        accuracy: from.accuracy + (target.accuracy - from.accuracy) * k,
      });
      frame.current = k < 1 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng, target?.accuracy, focusKey, reducedMotion, place_, applyOverlays]);

  useEffect(() => {
    focusMarker.current?.getElement().classList.toggle('is-stale', !focus?.live);
  }, [focus?.live, target?.lat, target?.lng]);

  // --- other devices ---------------------------------------------------------------------------
  const otherMarkers = useRef(new Map<string, Marker>());
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const keep = new Set(others.map((d) => d.e164));
    for (const [id, mk] of otherMarkers.current) {
      if (!keep.has(id)) {
        mk.remove();
        otherMarkers.current.delete(id);
      }
    }
    for (const d of others) {
      let mk = otherMarkers.current.get(d.e164);
      if (!mk) {
        const el = createMarkerElement();
        el.classList.add('fp-marker--secondary');
        el.setAttribute('aria-hidden', 'false');
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.addEventListener('click', () => actions.select(d.e164));
        el.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') actions.select(d.e164);
        });
        mk = new Marker({ element: el, anchor: 'center' }).setLngLat([d.position.lng, d.position.lat]).addTo(m);
        otherMarkers.current.set(d.e164, mk);
      } else {
        mk.setLngLat([d.position.lng, d.position.lat]);
      }
      mk.getElement().setAttribute('aria-label', `Show ${d.name}`);
      mk.getElement().title = d.name;
    }
  }, [others]);

  // --- landmarks -------------------------------------------------------------------------------
  // One host element per landmark; React renders the label into it via a portal.
  const landmarkHosts = useMemo(() => landmarks.map((l) => ({ l, el: document.createElement('div') })), [landmarks]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const markers = landmarkHosts.map(({ l, el }) =>
      new Marker({ element: el, anchor: 'left', offset: [-12, 0] }).setLngLat([l.lng, l.lat]).addTo(m),
    );
    return () => {
      for (const mk of markers) mk.remove();
    };
  }, [landmarkHosts]);

  // --- searched place --------------------------------------------------------------------------
  const placeMarker = useRef<Marker | null>(null);
  useEffect(() => {
    const m = map.current;
    placeMarker.current?.remove();
    placeMarker.current = null;
    if (!m || !place) return;
    const el = document.createElement('div');
    el.className = 'fp-place-pin';
    el.title = place.name;
    el.innerHTML = '<span></span>';
    placeMarker.current = new Marker({ element: el, anchor: 'bottom', offset: [0, -4] }).setLngLat([place.lng, place.lat]).addTo(m);
    m.flyTo({ center: [place.lng, place.lat], zoom: Math.max(m.getZoom(), 16), padding, maxDuration: CAMERA_MAX_MS, animate: !reducedMotion });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place]);

  // --- camera ----------------------------------------------------------------------------------
  const flyToFocus = useCallback(() => {
    const m = map.current;
    if (!m || !target) return;
    const camera = {
      center: [target.lng, target.lat] as [number, number],
      zoom: zoomForAccuracy(target.accuracy, target.lat),
      padding,
      pitch: mode === '3d' ? PITCH_3D : 0,
    };
    if (reducedMotion) m.jumpTo(camera);
    else m.flyTo({ ...camera, maxDuration: CAMERA_MAX_MS, curve: 1.42 });
  }, [target, padding, mode, reducedMotion]);

  // Fly when a device is picked (once its position is known) and when "centre" is pressed.
  const flownFor = useRef<string | null>(null);
  useEffect(() => {
    if (!focusKey || !target || flownFor.current === focusKey) return;
    flownFor.current = focusKey;
    flyToFocus();
  }, [focusKey, target, flyToFocus]);

  useEffect(() => {
    if (recenterNonce) flyToFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterNonce]);

  const zoomBy = (delta: number) => map.current?.easeTo({ zoom: map.current.getZoom() + delta, duration: reducedMotion ? 0 : 200 });
  const resetNorth = () => {
    const m = map.current;
    if (!m) return;
    m.easeTo({ bearing: 0, pitch: mode === '3d' ? m.getPitch() : 0, duration: reducedMotion ? 0 : 400 });
  };

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center bg-subtle p-6 text-center text-body text-secondary">
        The map couldn&apos;t load in this browser (WebGL is off or unsupported). Device details are still shown in the panel.
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" role="region" aria-label="Map showing device locations" />
      <ScanOverlay active={searching} padding={scanPadding} />
      <MapRail
        bearing={bearing}
        pitched={pitch > 1}
        onResetNorth={resetNorth}
        onZoom={zoomBy}
        canRecenter={Boolean(target)}
        topClass={props.railTopClass}
      />

      {focus &&
        createPortal(
          <>
            <Smartphone aria-hidden size={14} className="text-accent" />
            {focus.name}
          </>,
          tagEl,
        )}
      {landmarkHosts.map(({ l, el }) => createPortal(<LandmarkLabel l={l} />, el, l.id))}
    </div>
  );
}

const landmarkIcons = {
  education: GraduationCap,
  health: Hospital,
  safety: ShieldCheck,
  transport: TrainFront,
  fuel: Fuel,
  // Neutral building glyph: places of worship here are temples, mosques and churches alike.
  worship: LandmarkIcon,
  money: Banknote,
} as const;

function LandmarkLabel({ l }: { l: Landmark }) {
  const Icon = l.kind === 'transport' && /bus/i.test(l.name) ? BusFront : (landmarkIcons[l.kind] ?? MapPin);
  return (
    <span className="fp-label" title={l.name}>
      <span className="fp-label__icon" data-kind={l.kind}>
        <Icon aria-hidden size={13} strokeWidth={2.25} />
      </span>
      <span className="fp-label__text">{l.name}</span>
    </span>
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

/** Teal dot, white ring, thin dark edge; pops in with one ripple; pulses while live. */
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
