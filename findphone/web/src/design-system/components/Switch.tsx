import { useId } from 'react';
import { cn, focusRing } from '../cn';

/** Labelled on/off switch. The whole row is the hit target (≥ 44 px). */
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn('flex min-h-11 cursor-pointer items-center gap-3 py-2', disabled && 'cursor-not-allowed opacity-60')}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-label text-primary">{label}</span>
        {description && <span className="block text-caption text-tertiary">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150 ease-standard',
          checked ? 'border-accent bg-accent' : 'border-line-control bg-subtle',
          focusRing,
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-[3px] left-[3px] size-4 rounded-full shadow-e1 transition-transform duration-150 ease-standard',
            checked ? 'translate-x-5 bg-on-accent' : 'bg-secondary',
          )}
        />
      </button>
    </label>
  );
}
