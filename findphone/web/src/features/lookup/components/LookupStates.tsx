import { CircleAlert, MapPinOff, ShieldAlert, WifiOff } from 'lucide-react';
import { Button } from '../../../design-system/components/Button';
import { EmptyState } from '../../../design-system/components/EmptyState';
import { Skeleton, useDelayed } from '../../../design-system/components/Skeleton';
import { type LookupErrorKind, lookupErrorCopy } from '../../../lib/errors';

/**
 * Shown while a lookup is in flight: a small radar (it echoes the sweep drawn over the map) with
 * the masked number being searched, above a skeleton shaped like the result card so nothing jumps
 * when data arrives. Appears after 150 ms, so fast answers don't flash it.
 */
export function SearchingState({ active, label }: { active: boolean; label: string | null }) {
  const show = useDelayed(active);
  if (!show) return null;
  return (
    <div className="fp-enter flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-md border border-line bg-subtle px-3 py-3">
        <span aria-hidden className="fp-mini-radar">
          <span className="fp-mini-radar__ring" />
          <span className="fp-mini-radar__ring" />
          <span className="fp-mini-radar__core" />
        </span>
        <div className="min-w-0">
          <p className="text-label text-primary">
            Searching<span aria-hidden className="fp-dots" />
          </p>
          {label && <p className="truncate font-mono text-mono-sm text-tertiary">{label}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-4" aria-hidden>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-7 w-48" />
        <div className="flex flex-col gap-3 rounded-md bg-subtle p-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 w-full bg-hover" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="fp-enter">
      <EmptyState icon={MapPinOff} title="No device found for this number">
        Check the number, or ask the owner to open FindPhone and turn sharing on.
      </EmptyState>
    </div>
  );
}

const errorIcons: Record<LookupErrorKind, typeof WifiOff> = {
  network: WifiOff,
  blocked: ShieldAlert,
  quota: CircleAlert,
  unknown: CircleAlert,
};

export function LookupError({ error, onRetry }: { error: LookupErrorKind; onRetry: () => void }) {
  const copy = lookupErrorCopy[error];
  return (
    <div className="fp-enter">
    <EmptyState
      icon={errorIcons[error]}
      title={copy.title}
      action={
        error === 'blocked' ? undefined : (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    >
      {copy.body}
    </EmptyState>
    </div>
  );
}
