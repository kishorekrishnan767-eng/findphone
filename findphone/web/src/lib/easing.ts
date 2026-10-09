import tokens from '../../../shared/design-tokens.json';

/**
 * CSS-style cubic-bézier easing for requestAnimationFrame animations, so JS motion uses exactly
 * the same curves as the CSS tokens. Solves x(t) = progress with Newton's method.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (p: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const y = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (p) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 6; i++) {
      const err = x(t) - p;
      const d = dx(t);
      if (Math.abs(err) < 1e-5 || d === 0) break;
      t -= err / d;
    }
    return y(Math.min(1, Math.max(0, t)));
  };
}

const [m1, m2, m3, m4] = tokens.motion.easing.move as [number, number, number, number];
export const easeMove = cubicBezier(m1, m2, m3, m4);
export const MARKER_GLIDE_MS = tokens.motion.duration.markerGlide;
export const CAMERA_MAX_MS = tokens.motion.duration.cameraMax;
