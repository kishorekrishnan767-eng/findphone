import type { LucideIcon } from 'lucide-react';
import { cn, focusRing } from '../cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/** Radio-group pill: one active segment with an accent wash and glow. Arrow keys move. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const move = (dir: 1 | -1) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length];
    if (next) onChange(next.value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('fp-glass inline-flex items-center gap-1 rounded-lg p-1', className)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          move(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-md text-label whitespace-nowrap transition-colors duration-150 ease-standard',
              size === 'md' ? 'h-9 px-4' : 'h-8 px-3',
              active ? 'fp-accent-wash fp-glow text-primary' : 'text-secondary hover:bg-hover hover:text-primary',
              focusRing,
            )}
          >
            {Icon && <Icon aria-hidden size={size === 'md' ? 18 : 16} strokeWidth={1.75} className={active ? 'text-accent' : ''} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
