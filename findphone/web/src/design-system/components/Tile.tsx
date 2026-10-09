import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../cn';

/** Stat tile: icon in a tinted circle, small label, value. */
export function StatTile({
  icon: Icon,
  label,
  children,
  tone = 'accent',
  className,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  tone?: 'accent' | 'live' | 'stale' | 'error' | 'muted';
  className?: string;
}) {
  const tones = {
    accent: 'text-accent',
    live: 'text-live-dot',
    stale: 'text-stale-dot',
    error: 'text-error-dot',
    muted: 'text-tertiary',
  } as const;
  return (
    <div className={cn('flex min-h-20 items-center gap-3 rounded-lg border border-line bg-subtle/70 px-3 py-3', className)}>
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full bg-raised', tones[tone])}>
        <Icon aria-hidden size={20} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-caption text-tertiary">{label}</p>
        <div className="text-label text-primary">{children}</div>
      </div>
    </div>
  );
}

/** Square action tile: icon over label. Used for device actions and tools. */
export function ActionTile({
  icon: Icon,
  label,
  onClick,
  href,
  tone = 'default',
  active = false,
  disabled = false,
  busy = false,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  tone?: 'default' | 'accent' | 'danger';
  active?: boolean;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
}) {
  const cls = cn(
    'fp-tile flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-center text-label-sm',
    'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
    'disabled:cursor-not-allowed disabled:opacity-50',
    active || tone === 'accent'
      ? 'fp-accent-wash fp-glow border-transparent text-primary'
      : tone === 'danger'
        ? 'border-line bg-subtle/70 text-danger-text hover:bg-danger-subtle'
        : 'border-line bg-subtle/70 text-primary hover:bg-hover',
  );
  const icon = busy ? (
    <span aria-hidden className="fp-spin size-5 rounded-full border-2 border-current border-t-transparent" />
  ) : (
    <Icon aria-hidden size={22} strokeWidth={1.75} className={tone === 'danger' ? '' : 'text-accent'} />
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} title={hint}>
        {icon}
        <span>{label}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-busy={busy || undefined} className={cls} title={hint}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
