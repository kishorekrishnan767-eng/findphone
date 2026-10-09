import { describe, expect, test } from 'vitest';
import { type Landmark, aerialPreview, describeWeather, directionsUrl, formatAddress, pickLandmarks, streetViewUrl } from './geoServices';

describe('formatAddress', () => {
  test('place and street first, then area, city and state with postcode', () => {
    expect(
      formatAddress({
        name: 'SRM University',
        address: {
          road: 'SRM Auditorium Road',
          suburb: 'Potheri',
          city: 'Chengalpattu',
          state: 'Tamil Nadu',
          postcode: '603203',
        },
      }),
    ).toEqual({ line1: 'SRM University, SRM Auditorium Road', line2: 'Potheri, Chengalpattu, Tamil Nadu 603203' });
  });

  test('no repeated parts when the place name is the area', () => {
    const a = formatAddress({ address: { suburb: 'Potheri', city: 'Chengalpattu', state: 'Tamil Nadu' } });
    expect(a).toEqual({ line1: 'Potheri', line2: 'Chengalpattu, Tamil Nadu' });
  });

  test('nothing usable → null', () => {
    expect(formatAddress({ address: {} })).toBeNull();
  });
});

test('WMO weather codes map to readable conditions', () => {
  expect(describeWeather(0)).toEqual({ kind: 'clear', label: 'Clear' });
  expect(describeWeather(2).kind).toBe('partly');
  expect(describeWeather(45).kind).toBe('fog');
  expect(describeWeather(63).kind).toBe('rain');
  expect(describeWeather(81).label).toBe('Rain showers');
  expect(describeWeather(95).kind).toBe('storm');
});

describe('pickLandmarks', () => {
  const centre = { lat: 12.8231, lng: 80.0444 };
  const at = (id: string, kind: Landmark['kind'], dLat: number, dLng = 0): Landmark => ({
    id,
    name: id,
    kind,
    lat: centre.lat + dLat,
    lng: centre.lng + dLng,
  });

  test('ranks education and health first, then by distance, and keeps labels ≥ 150 m apart', () => {
    const picked = pickLandmarks(
      [
        at('atm', 'money', 0, 0.003), // ~325 m east, clear of the others
        at('college', 'education', 0.006),
        at('hospital', 'health', 0.003),
        at('hospital-twin', 'health', 0.0031), // ~11 m from "hospital": dropped
        at('station', 'transport', -0.004),
      ],
      centre,
    );
    expect(picked.map((l) => l.id)).toEqual(['hospital', 'college', 'station', 'atm']);
  });

  test('skips anything sitting on the device marker', () => {
    expect(pickLandmarks([at('here', 'education', 0.0001)], centre)).toEqual([]);
  });

  test('caps the count', () => {
    const many = Array.from({ length: 20 }, (_, i) => at(`s${i}`, 'education', 0.002 * (i + 1)));
    expect(pickLandmarks(many, centre, 8)).toHaveLength(8);
  });
});

test('aerial preview tile contains the point', () => {
  const p = aerialPreview({ lat: 12.9716, lng: 77.5946 });
  expect(p.url).toMatch(/World_Imagery\/MapServer\/tile\/18\/\d+\/\d+$/);
  expect(p.x).toBeGreaterThanOrEqual(0);
  expect(p.x).toBeLessThan(256);
  expect(p.y).toBeGreaterThanOrEqual(0);
  expect(p.y).toBeLessThan(256);
});

test('Google links need no API key', () => {
  const p = { lat: 12.97, lng: 77.59 };
  expect(streetViewUrl(p)).toBe('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=12.970000,77.590000');
  expect(directionsUrl(p)).toBe('https://www.google.com/maps/dir/?api=1&destination=12.970000,77.590000');
});
