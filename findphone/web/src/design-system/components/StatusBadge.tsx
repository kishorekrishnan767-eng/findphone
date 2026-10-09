import { cn } from '../cn';

export type BadgeStatus = 'live' | 'stale' | 'paused' | 'error';

const styles: Record<BadgeStatus, { badge: string; dot: string }> = {
  live: { badge: 'bg-live-bg text-live', dot: 'bg-live-dot' },
  stale: { badge: 'bg-stale-bg text-stale', dot: 'bg-stale-dot' },
  paused: { badge: 'bg-paused-bg text-paused', dot: 'bg-paused-dot' },
  error: { badge: 'bg-error-bg text-error', dot: 'bg-error-dot' },
};

/** Dot + words, never colour alone. The live dot pulses (off under reduced motion, see index.css). */
export function StatusBadge({ status, label }: { status: BadgeStatus; label: string }) {
  const s = styles[status];
  return (
    <span
      className={cn(
        'fp-pop inline-flex h-6 w-fit self-start items-center gap-2 rounded-xs px-2 text-label-sm whitespace-nowrap',
        'transition-colors duration-150 ease-standard',
        s.badge,
      )}
    >
      <span aria-hidden className={cn('relative size-2 rounded-full', s.dot, status === 'live' && 'fp-pulse-dot')} />
      {label}
    </span>
  );
}
