import { describe, expect, test } from 'vitest';
import { cubicBezier, easeMove } from '../../lib/easing';
import { circlePolygon, distanceMeters, formatCoordinates, googleMapsUrl, zoomForAccuracy } from './geo';

const BLR = { lat: 12.9716, lng: 77.5946 };

describe('accuracy circle', () => {
  test.each([10, 100, 1500])('every vertex is %i m from the centre (±0.5%%)', (r) => {
    const ring = circlePolygon(BLR, r).geometry.coordinates[0]!;
    expect(ring).toHaveLength(65);
    expect(ring[0]).toEqual(ring[64]); // closed
    for (const [lng, lat] of ring) {
      expect(Math.abs(distanceMeters(BLR, { lat: lat!, lng: lng! }) - r) / r).toBeLessThan(0.005);
    }
  });

  test('wraps longitude across the antimeridian', () => {
    const ring = circlePolygon({ lat: 0, lng: 179.9999 }, 1000).geometry.coordinates[0]!;
    for (const [lng] of ring) expect(Math.abs(lng!)).toBeLessThanOrEqual(180);
  });
});

describe('zoomForAccuracy', () => {
  test('≈17 for a precise fix, ≈13.6 at 1 km, clamped to [3, 17]', () => {
    expect(zoomForAccuracy(12, BLR.lat)).toBe(17);
    expect(zoomForAccuracy(1000, BLR.lat)).toBeCloseTo(13.6, 1);
    expect(zoomForAccuracy(5000, BLR.lat)).toBeGreaterThan(11);
    expect(zoomForAccuracy(10_000_000, BLR.lat)).toBe(3);
  });

  test('a larger radius never zooms in further', () => {
    let previous = Infinity;
    for (const r of [5, 20, 50, 200, 800, 3000]) {
      const z = zoomForAccuracy(r, BLR.lat);
      expect(z).toBeLessThanOrEqual(previous);
      previous = z;
    }
  });
});

test('formatting', () => {
  expect(formatCoordinates(BLR)).toBe('12.97160, 77.59460');
  expect(googleMapsUrl(BLR)).toBe('https://www.google.com/maps/search/?api=1&query=12.971600,77.594600');
});

test('easing matches CSS cubic-bezier endpoints and is monotonic for the move curve', () => {
  const linear = cubicBezier(0, 0, 1, 1);
  expect(linear(0.3)).toBeCloseTo(0.3, 3);
  expect(easeMove(0)).toBe(0);
  expect(easeMove(1)).toBe(1);
  let prev = 0;
  for (let p = 0.05; p <= 1; p += 0.05) {
    const v = easeMove(p);
    expect(v).toBeGreaterThanOrEqual(prev);
    prev = v;
  }
});
