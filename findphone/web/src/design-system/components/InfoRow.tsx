import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../cn';

/** A `<dl>` on a subtle block; rows divided by hairlines. */
export function InfoList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('divide-y divide-line-subtle rounded-md bg-subtle', className)}>{children}</dl>;
}

export function InfoRow({
  label,
  icon: Icon,
  mono = false,
  trailing,
  hint,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  mono?: boolean;
  trailing?: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center gap-2 px-3 py-2">
      <dt className="flex w-28 shrink-0 items-center gap-2 text-caption text-tertiary">
        {Icon && <Icon aria-hidden size={16} strokeWidth={1.75} />}
        {label}
      </dt>
      <dd className="min-w-0 flex-1">
        <span className={cn('block break-words text-primary', mono ? 'font-mono text-mono' : 'text-body')}>
          {children}
        </span>
        {hint && <span className="block text-caption text-tertiary">{hint}</span>}
      </dd>
      {trailing}
    </div>
  );
}
