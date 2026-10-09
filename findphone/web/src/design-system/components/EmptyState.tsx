import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Left-aligned: 24 px icon in a 40 px subtle square, title, ≤ 2 lines, at most one action. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex size-10 items-center justify-center rounded-md bg-subtle text-secondary">
        <Icon aria-hidden size={24} strokeWidth={1.75} />
      </div>
      <div>
        <h3 className="text-title-sm text-primary">{title}</h3>
        <p className="mt-1 text-body text-secondary">{children}</p>
      </div>
      {action}
    </div>
  );
}
