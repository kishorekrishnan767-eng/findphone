// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { ToastProvider } from '../../../design-system/components/Toast';
import { parsePhone } from '../../../shared/phone/normalize';
import type { DeviceRecord } from '../domain/device';
import { deriveStatus } from '../domain/status';
import { ResultCard } from './ResultCard';

afterEach(cleanup);

const NOW = new Date('2026-10-08T12:00:00Z');
const r = parsePhone('9876543210', 'IN');
if (!r.ok) throw new Error('fixture');
const phone = r.number;

function device(overrides: Partial<DeviceRecord> = {}): DeviceRecord {
  return {
    name: 'Asha Rao',
    deviceCode: 'FP-7K3Q',
    platform: 'android',
    model: 'Pixel 7a',
    position: { lat: 12.9716, lng: 77.5946, accuracy: 12 },
    battery: 64,
    locatedAt: new Date(NOW.getTime() - 10_000),
    updatedAt: new Date(NOW.getTime() - 5_000),
    sharingEnabled: true,
    ...overrides,
  };
}

function renderCard(d: DeviceRecord) {
  const status = deriveStatus(d, NOW, 120_000);
  if (status.kind === 'expired') throw new Error('expired');
  return render(
    <ToastProvider>
      <ResultCard phone={phone} device={d} status={status} now={NOW} reconnecting={false} onRefresh={async () => {}} />
    </ToastProvider>,
  );
}

describe('ResultCard', () => {
  test('live device: name, Device ID, masked number, monospace coordinates, Google Maps link', () => {
    renderCard(device());
    expect(screen.getByRole('heading', { name: 'Asha Rao' })).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getAllByText('FP-7K3Q').length).toBeGreaterThan(0);
    expect(screen.getByText('+91 98••• ••210')).toBeTruthy();
    expect(screen.getByText('12.97160, 77.59460')).toBeTruthy();
    const link = screen.getByRole('link', { name: /Open in Google Maps/ });
    expect(link.getAttribute('rel')).toContain('noopener');
    // The full number is never rendered.
    expect(document.body.textContent).not.toContain('9876543210');
  });

  test('paused device: a clear message and no coordinates or map link', () => {
    renderCard(device({ sharingEnabled: false, position: null, locatedAt: null }));
    expect(screen.getByText('Sharing is paused')).toBeTruthy();
    expect(screen.queryByText(/12\.97/)).toBeNull();
    expect(screen.queryByRole('link', { name: /Google Maps/ })).toBeNull();
  });

  test('stale device: "Last seen" with relative time', () => {
    renderCard(device({ locatedAt: new Date(NOW.getTime() - 18 * 60_000), updatedAt: new Date(NOW.getTime() - 18 * 60_000) }));
    expect(screen.getByText('Last seen 18 min ago')).toBeTruthy();
  });
});
