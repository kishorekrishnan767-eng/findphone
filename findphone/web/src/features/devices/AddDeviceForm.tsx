import { Search, Timer } from 'lucide-react';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { actions, getState } from '../../app/store';
import { env } from '../../config/env';
import { Banner } from '../../design-system/components/Banner';
import { Button } from '../../design-system/components/Button';
import { PhoneInput } from '../../design-system/components/PhoneInput';
import { countryByIso } from '../../shared/phone/countries';
import { formatNational, parsePhone, phoneErrorMessage } from '../../shared/phone/normalize';
import { useNow } from '../../shared/hooks/useNow';
import { RateLimiter, sessionStorageOrNull } from '../lookup/rateLimiter';

/** Number + optional label. Adding a number starts watching it (one document `get` listener). */
export function AddDeviceForm({ submitLabel = 'Find device', autoFocus = false }: { submitLabel?: string; autoFocus?: boolean }) {
  const [country, setCountry] = useState(() => countryByIso(env.defaultCountry));
  const [number, setNumber] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const labelId = useId();
  const limiter = useMemo(() => new RateLimiter(env.searchLimitPerMinute, 60_000, sessionStorageOrNull()), []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parsePhone(number, country.iso);
    if (!parsed.ok) {
      setError(phoneErrorMessage(parsed, formatNational(country.example, country)));
      return;
    }
    setError(null);
    const e164 = parsed.number.e164;
    if (getState().watched.some((w) => w.e164 === e164)) {
      actions.select(e164); // already watching: just show it
      return;
    }
    const allowed = limiter.tryConsume();
    if (!allowed.ok) {
      setRetryAt(Date.now() + allowed.retryInMs);
      return;
    }
    setRetryAt(null);
    actions.addDevice(e164, nickname.trim() || null);
    setNumber('');
    setNickname('');
  };

  const now = useNow(1000, retryAt !== null);
  const retryIn = retryAt ? Math.max(0, Math.ceil((retryAt - now.getTime()) / 1000)) : 0;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" role="search" aria-label="Find a device by number">
      <PhoneInput
        label="Mobile number"
        country={country}
        onCountryChange={setCountry}
        value={number}
        onChange={(v) => {
          setNumber(v);
          if (error) setError(null);
        }}
        error={error}
        inputRef={autoFocus ? (el) => el?.focus() : undefined}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor={labelId} className="text-label text-primary">
          Label <span className="text-tertiary">(optional)</span>
        </label>
        <input
          id={labelId}
          value={nickname}
          maxLength={30}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. Amma's phone"
          className="h-11 rounded-md border border-line-control bg-surface px-3 text-body text-primary outline-none placeholder:text-tertiary focus:outline-2 focus:-outline-offset-1 focus:outline-accent"
        />
        <p className="text-caption text-tertiary">Only saved in this browser.</p>
      </div>
      <Button type="submit" icon={Search} block>
        {submitLabel}
      </Button>
      {retryIn > 0 && (
        <Banner icon={Timer} kind="warning">
          Too many lookups. Try again in {retryIn} s.
        </Banner>
      )}
    </form>
  );
}
