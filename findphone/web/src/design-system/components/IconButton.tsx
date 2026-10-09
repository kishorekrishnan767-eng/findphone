import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn, focusRing } from '../cn';

/** 44 × 44 icon-only button. `label` is required: it's the accessible name and the tooltip. */
export function IconButton({
  icon: Icon,
  label,
  className,
  type = 'button',
  ...rest
}: { icon: LucideIcon; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 items-center justify-center text-secondary transition-colors duration-150 ease-standard',
        'hover:bg-hover hover:text-primary active:bg-pressed disabled:cursor-not-allowed disabled:text-disabled disabled:hover:bg-transparent',
        focusRing,
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden size={20} strokeWidth={1.75} />
    </button>
  );
}
