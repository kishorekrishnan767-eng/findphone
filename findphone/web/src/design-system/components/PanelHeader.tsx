import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn, focusRing } from '../cn';

/** Top row of a side-panel view: optional back link, title, optional action. */
export function PanelHeader({
  title,
  back,
  action,
  subtitle,
}: {
  title: string;
  back?: { label: string; onClick: () => void };
  action?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {back && (
        <button
          type="button"
          onClick={back.onClick}
          aria-label={back.label}
          title={back.label}
          className={cn('-ml-2 flex size-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary', focusRing)}
        >
          <ChevronLeft aria-hidden size={20} />
        </button>
      )}
      <div className={cn('min-w-0 flex-1', back && 'pt-3')}>
        <h2 className="text-title-sm text-primary">{title}</h2>
        {subtitle && <p className="mt-1 text-body text-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
