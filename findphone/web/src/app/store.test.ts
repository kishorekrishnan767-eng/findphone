import { beforeEach, expect, test } from 'vitest';
import { actions, getState } from './store';

const A = '+919876543210';
const B = '+447700900123';

beforeEach(() => actions.forgetAll());

test('adding selects the device; adding it again does not duplicate it', () => {
  actions.addDevice(A, 'Amma');
  actions.addDevice(A, null);
  expect(getState().watched.map((w) => w.e164)).toEqual([A]);
  expect(getState().selected).toBe(A);
  expect(getState().tab).toBe('map');
});

test('removing the selected device selects the next one and clears its data', () => {
  actions.addDevice(A, null);
  actions.addDevice(B, null);
  actions.setGeofence(B, { lat: 1, lng: 2, radius: 500, enabled: true, inside: null });
  actions.removeDevice(B);
  expect(getState().selected).toBe(A);
  expect(getState().geofences[B]).toBeUndefined();
});

test('events count as unread until the activity tab is opened', () => {
  actions.log({ e164: A, kind: 'stale', title: 't', body: 'b' });
  actions.log({ e164: A, kind: 'live', title: 't', body: 'b' });
  expect(getState().unread).toBe(2);
  actions.go('activity');
  expect(getState().unread).toBe(0);
  expect(getState().events[0]!.kind).toBe('live'); // newest first
});

test('rename sets or clears the label', () => {
  actions.addDevice(A, null);
  actions.rename(A, 'Work phone');
  expect(getState().watched[0]!.nickname).toBe('Work phone');
  actions.rename(A, null);
  expect(getState().watched[0]!.nickname).toBeNull();
});
