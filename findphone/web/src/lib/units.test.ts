import { expect, test } from 'vitest';
import { accuracyBars, formatDistance, formatTemperature } from './units';

test('distances in metric and imperial', () => {
  expect(formatDistance(18, 'metric')).toBe('18 m');
  expect(formatDistance(1500, 'metric')).toBe('1.5 km');
  expect(formatDistance(18, 'imperial')).toBe('59 ft');
  expect(formatDistance(1609.344, 'imperial')).toBe('1.0 mi');
});

test('temperatures', () => {
  expect(formatTemperature(28, 'metric')).toBe('28°C');
  expect(formatTemperature(28, 'imperial')).toBe('82°F');
});

test('accuracy → signal bars', () => {
  expect([10, 20, 21, 50, 51, 200, 201, 3000].map(accuracyBars)).toEqual([4, 4, 3, 3, 2, 2, 1, 1]);
});
