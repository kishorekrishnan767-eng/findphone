import { LocateFixed, Timer } from 'lucide-react';
import { Banner } from '../../../design-system/components/Banner';
import { Button } from '../../../design-system/components/Button';
import { cn } from '../../../design-system/cn';
import { maskNumber } from '../../../shared/phone/mask';
import type { DeviceStatus } from '../domain/status';
import type { LookupState } from '../useDeviceLookup';
import { LookupError, NotFound, SearchingState } from './LookupStates';
import { ResultCard } from './ResultCard';
import { SearchForm } from './SearchForm';

interface Props {
  variant: 'panel' | 'sheet';
  state: LookupState;
  status: DeviceStatus | null;
  now: Date;
  onSearch: (input: string, countryIso: string) => void;
  onRefresh: () => Promise<void>;
  onRetry: () => void;
  onReset: () => void;
}

/** What screen readers hear when the result changes. Never includes the number or a location. */
function announcement(state: LookupState, status: DeviceStatus | null): string {
  switch (state.kind) {
    case 'loading':
      return 'Searching';
    case 'notFound':
      return 'No device found for this number';
    case 'error':
      return 'The search failed';
    case 'rateLimited':
      return 'Too many searches';
    case 'found':
      if (!status || status.kind === 'expired') return 'No device found for this number';
      return status.kind === 'live'
        ? 'Device found. Live.'
        : status.kind === 'stale'
          ? 'Device found. Last seen earlier.'
          : status.kind === 'paused'
            ? 'Device found. Sharing is paused.'
            : 'Device found. Waiting for its first location.';
    default:
      return '';
  }
}

export function SearchPanel({ variant, state, status, now, onSearch, onRefresh, onRetry, onReset }: Props) {
  // An expired record (≥ 7 days old) is shown exactly like a missing one.
  const shown = state.kind === 'found' && status && status.kind !== 'expired' ? status : null;
  const showNotFound = state.kind === 'notFound' || (state.kind === 'found' && status?.kind === 'expired');

  const summary = state.kind === 'found' && (
    <div className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-1">
      <span className="font-mono text-mono text-secondary">{maskNumber(state.phone)}</span>
      <Button variant="ghost" onClick={onReset} className="-mr-2">
        New search
      </Button>
    </div>
  );

  const retryIn = state.kind === 'rateLimited' ? Math.max(0, Math.ceil((state.retryAt - now.getTime()) / 1000)) : 0;

  return (
    <div className={cn('flex flex-col gap-5', variant === 'panel' && 'p-5')}>
      <p className="sr-only" aria-live="polite">
        {announcement(state, status)}
      </p>

      {variant === 'panel' && (
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-on-accent">
            <LocateFixed aria-hidden size={16} strokeWidth={2} />
          </span>
          <span className="text-title-sm text-primary">FindPhone</span>
        </div>
      )}

      {state.kind === 'found' ? (
        variant === 'panel' && summary
      ) : (
        <section className="flex flex-col gap-4" aria-labelledby="fp-find-heading">
          <div>
            <h2 id="fp-find-heading" className="text-title text-primary">
              Find a phone
            </h2>
            <p className="mt-1 text-body text-secondary">Enter the number registered in the FindPhone app.</p>
          </div>
          <SearchForm
            onSearch={onSearch}
            error={state.kind === 'invalid' ? state.message : null}
            busy={state.kind === 'loading'}
          />
          {state.kind === 'rateLimited' && retryIn > 0 && (
            <Banner icon={Timer} kind="warning">
              Too many searches. Try again in {retryIn} s.
            </Banner>
          )}
        </section>
      )}

      <SearchingState active={state.kind === 'loading'} label={state.kind === 'loading' ? maskNumber(state.phone) : null} />
      {showNotFound && <NotFound />}
      {state.kind === 'error' && <LookupError error={state.error} onRetry={onRetry} />}
      {state.kind === 'found' && shown && (
        <ResultCard
          phone={state.phone}
          device={state.device}
          status={shown}
          now={now}
          reconnecting={state.reconnecting}
          onRefresh={onRefresh}
        />
      )}

      {variant === 'sheet' && summary}
    </div>
  );
}
