import type { Padding } from './MapView';

/**
 * Radar sweep drawn over the map while a lookup is in flight: three rings expanding outward and a
 * rotating beam, centred in the part of the map the panel doesn't cover. Decorative only
 * (aria-hidden; the panel announces "Searching"), click-through, and reduced to a static ring set
 * under prefers-reduced-motion (see index.css).
 */
export function ScanOverlay({ active, padding }: { active: boolean; padding: Padding }) {
  return (
    <div
      aria-hidden
      className="fp-scan pointer-events-none absolute inset-0 z-(--fp-z-map-controls)"
      data-active={active || undefined}
      style={{
        // Centre of the uncovered map area.
        paddingTop: padding.top,
        paddingRight: padding.right,
        paddingBottom: padding.bottom,
        paddingLeft: padding.left,
      }}
    >
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="fp-scan__radar">
          <span className="fp-scan__ring" />
          <span className="fp-scan__ring" />
          <span className="fp-scan__ring" />
          <span className="fp-scan__beam" />
          <span className="fp-scan__core" />
        </div>
      </div>
    </div>
  );
}
