import type { LookupErrorKind } from '../../lib/errors';
import type { PhoneNumber } from '../../shared/phone/normalize';
import type { DeviceRecord } from './domain/device';

/** Live state of one watched number. Input validation and cooldowns live in the add form. */
export type LookupState =
  | { kind: 'idle' }
  | { kind: 'loading'; phone: PhoneNumber }
  | { kind: 'notFound'; phone: PhoneNumber }
  | { kind: 'found'; phone: PhoneNumber; device: DeviceRecord; reconnecting: boolean }
  | { kind: 'error'; phone: PhoneNumber; error: LookupErrorKind };

export type LookupAction =
  | { type: 'reset' }
  | { type: 'loading'; phone: PhoneNumber }
  | { type: 'snapshot'; device: DeviceRecord | null; fromCache: boolean }
  | { type: 'error'; error: LookupErrorKind };

function phoneOf(s: LookupState): PhoneNumber | null {
  return 'phone' in s ? s.phone : null;
}

export function lookupReducer(state: LookupState, action: LookupAction): LookupState {
  switch (action.type) {
    case 'reset':
      return { kind: 'idle' };
    case 'loading':
      return { kind: 'loading', phone: action.phone };
    case 'snapshot': {
      const phone = phoneOf(state);
      if (!phone) return state;
      if (action.device) return { kind: 'found', phone, device: action.device, reconnecting: action.fromCache };
      // An empty answer from the cache isn't an answer yet: keep waiting for the server.
      if (action.fromCache) return state.kind === 'found' ? { ...state, reconnecting: true } : state;
      return { kind: 'notFound', phone };
    }
    case 'error': {
      const phone = phoneOf(state);
      return phone ? { kind: 'error', phone, error: action.error } : state;
    }
  }
}
