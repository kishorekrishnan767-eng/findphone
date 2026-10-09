import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { env } from '../../config/env';
import { type LookupErrorKind, toLookupError } from '../../lib/errors';
import { log } from '../../lib/log';
import { countryByIso } from '../../shared/phone/countries';
import { type PhoneNumber, formatNational, parsePhone, phoneErrorMessage } from '../../shared/phone/normalize';
import { fetchDevice, watchDevice } from './data/deviceRepository';
import type { DeviceRecord } from './domain/device';
import { RateLimiter, sessionStorageOrNull } from './rateLimiter';

export type LookupState =
  | { kind: 'idle' }
  | { kind: 'invalid'; message: string }
  | { kind: 'rateLimited'; retryAt: number }
  | { kind: 'loading'; phone: PhoneNumber }
  | { kind: 'notFound'; phone: PhoneNumber }
  | { kind: 'found'; phone: PhoneNumber; device: DeviceRecord; reconnecting: boolean }
  | { kind: 'error'; phone: PhoneNumber; error: LookupErrorKind };

type Action =
  | { type: 'reset' }
  | { type: 'invalid'; message: string }
  | { type: 'rateLimited'; retryAt: number }
  | { type: 'loading'; phone: PhoneNumber }
  | { type: 'snapshot'; device: DeviceRecord | null; fromCache: boolean }
  | { type: 'error'; error: LookupErrorKind };

function phoneOf(s: LookupState): PhoneNumber | null {
  return 'phone' in s ? s.phone : null;
}

export function lookupReducer(state: LookupState, action: Action): LookupState {
  switch (action.type) {
    case 'reset':
      return { kind: 'idle' };
    case 'invalid':
      return { kind: 'invalid', message: action.message };
    case 'rateLimited':
      return { kind: 'rateLimited', retryAt: action.retryAt };
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

const SLOW_MS = 12_000;

/**
 * The lookup state machine: validate → cooldown → listen to exactly one document. Switching to a
 * new search always tears down the previous listener.
 */
export function useDeviceLookup() {
  const [state, dispatch] = useReducer(lookupReducer, { kind: 'idle' } as LookupState);
  const unsubscribe = useRef<(() => void) | null>(null);
  const slowTimer = useRef<number | null>(null);
  const limiter = useMemo(() => new RateLimiter(env.searchLimitPerMinute, 60_000, sessionStorageOrNull()), []);

  const stop = useCallback(() => {
    unsubscribe.current?.();
    unsubscribe.current = null;
    if (slowTimer.current !== null) window.clearTimeout(slowTimer.current);
    slowTimer.current = null;
  }, []);

  const listen = useCallback(
    (phone: PhoneNumber) => {
      stop();
      dispatch({ type: 'loading', phone });
      let answered = false;
      // Offline on first load, Firestore may never answer from the server: don't spin forever.
      slowTimer.current = window.setTimeout(() => {
        if (!answered) dispatch({ type: 'error', error: 'network' });
      }, SLOW_MS);
      unsubscribe.current = watchDevice(
        phone.e164,
        ({ device, fromCache }) => {
          if (device || !fromCache) answered = true;
          dispatch({ type: 'snapshot', device, fromCache });
        },
        (e) => {
          answered = true;
          log.error('lookup.listen_failed', e);
          dispatch({ type: 'error', error: toLookupError(e) });
        },
      );
    },
    [stop],
  );

  const search = useCallback(
    (input: string, countryIso: string) => {
      const parsed = parsePhone(input, countryIso);
      if (!parsed.ok) {
        const c = countryByIso(countryIso);
        dispatch({ type: 'invalid', message: phoneErrorMessage(parsed, formatNational(c.example, c)) });
        return;
      }
      const allowed = limiter.tryConsume();
      if (!allowed.ok) {
        dispatch({ type: 'rateLimited', retryAt: Date.now() + allowed.retryInMs });
        return;
      }
      log.info('lookup.search');
      listen(parsed.number);
    },
    [limiter, listen],
  );

  /** Re-reads from the server. The live listener already pushes changes; this is for reassurance. */
  const refresh = useCallback(async () => {
    const phone = phoneOf(state);
    if (!phone) return;
    try {
      const device = await fetchDevice(phone.e164);
      dispatch({ type: 'snapshot', device, fromCache: false });
    } catch (e) {
      log.error('lookup.refresh_failed', e);
      throw e;
    }
  }, [state]);

  const retry = useCallback(() => {
    const phone = phoneOf(state);
    if (phone) listen(phone);
  }, [state, listen]);

  const reset = useCallback(() => {
    stop();
    dispatch({ type: 'reset' });
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { state, search, refresh, retry, reset };
}
