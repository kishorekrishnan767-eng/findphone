import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../cn';

type Kind = 'neutral' | 'warning' | 'error';

const kinds: Record<Kind, string> = {
  neutral: 'bg-paused-bg text-paused',
  warning: 'bg-stale-bg text-stale',
  error: 'bg-error-bg text-error',
};

/** Slim notice. Never uses the accent colour. Warnings and errors are announced. */
export function Banner({
  icon: Icon,
  kind = 'neutral',
  className,
  children,
}: {
  icon: LucideIcon;
  kind?: Kind;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={kind === 'error' ? 'alert' : kind === 'warning' ? 'status' : undefined}
      className={cn('flex min-h-8 items-start gap-2 rounded-md px-3 py-2 text-label-sm', kinds[kind], className)}
    >
      <Icon aria-hidden size={16} strokeWidth={1.75} className="mt-px shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
