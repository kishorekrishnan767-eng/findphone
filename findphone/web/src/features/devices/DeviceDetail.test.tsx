// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { actions, setState } from '../../app/store';
import { parsePhone } from '../../shared/phone/normalize';
import type { DeviceRecord } from '../lookup/domain/device';
import { DeviceDetail } from './DeviceDetail';

// No network in unit tests: the address and ring status come from stubs.
vi.mock('../places/usePlaces', () => ({
  useAddress: () => ({ line1: 'SRM University, SRM Auditorium Road', line2: 'Potheri, Chengalpattu' }),
}));
vi.mock('../ring/useRing', () => ({
  useRing: () => ({ status: { kind: 'idle' }, cooldownLeft: 0, ring: vi.fn(), lastRungAt: null, acknowledged: false }),
}));

const E164 = '+919876543210';
const phone = (() => {
  const r = parsePhone(E164, 'IN');
  if (!r.ok) throw new Error('fixture');
  return r.number;
})();

function seed(overrides: Partial<DeviceRecord> = {}) {
  const now = Date.now();
  const device: DeviceRecord = {
    name: 'Asha Rao',
    deviceCode: 'FP-7K3Q',
    platform: 'android',
    model: 'Pixel 7a',
    position: { lat: 12.9716, lng: 77.5946, accuracy: 18 },
    battery: 64,
    locatedAt: new Date(now - 4_000),
    updatedAt: new Date(now - 2_000),
    sharingEnabled: true,
    ...overrides,
  };
  actions.addDevice(E164, null);
  setState((s) => ({ lookups: { ...s.lookups, [E164]: { kind: 'found', phone, device, reconnecting: false } } }));
}

beforeEach(() => actions.forgetAll());
afterEach(cleanup);

describe('DeviceDetail', () => {
  test('live device: identity, status, actions, stats and address; never the full number', () => {
    seed();
    render(<DeviceDetail e164={E164} />);
    expect(screen.getByRole('heading', { name: 'Asha Rao' })).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('FP-7K3Q')).toBeTruthy();
    expect(screen.getByText('Pixel 7a')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ring/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Get route/ }).getAttribute('href')).toContain('/maps/dir/');
    expect(screen.getByRole('link', { name: /Street View/ }).getAttribute('href')).toContain('map_action=pano');
    expect(screen.getByText('64%')).toBeTruthy();
    expect(screen.getByText('± 18 m')).toBeTruthy();
    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.getByText(/SRM University/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open in Google Maps/ })).toBeTruthy();
    expect(document.body.textContent).not.toContain('9876543210');
  });

  test('paused device: no location, no route, ring disabled', () => {
    seed({ sharingEnabled: false, position: null, locatedAt: null });
    render(<DeviceDetail e164={E164} />);
    expect(screen.getByText('Sharing is paused')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Open in Google Maps/ })).toBeNull();
    expect((screen.getByRole('button', { name: /Ring/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /Get route/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  test('low battery shows the warning tone', () => {
    seed({ battery: 9 });
    render(<DeviceDetail e164={E164} />);
    expect(screen.getByRole('meter', { name: 'Battery level' }).getAttribute('aria-valuenow')).toBe('9');
  });
});
