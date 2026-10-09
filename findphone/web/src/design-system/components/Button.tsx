import type { LucideIcon } from 'lucide-react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn, focusRing } from '../cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed',
  secondary: 'bg-surface text-primary border border-line hover:bg-hover active:bg-pressed',
  ghost: 'bg-transparent text-secondary hover:bg-hover hover:text-primary active:bg-pressed',
  destructive: 'bg-danger text-on-danger hover:bg-danger-hover active:bg-danger-pressed',
};

const base = cn(
  'inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-md px-4 text-label whitespace-nowrap',
  // Press feedback: a 2% shrink, colour and scale both on the 150 ms token.
  'transition-[color,background-color,border-color,transform] duration-150 ease-standard select-none active:scale-[0.98] motion-reduce:active:scale-100',
  'disabled:cursor-not-allowed disabled:bg-subtle disabled:text-disabled disabled:border-transparent',
  focusRing,
);

interface CommonProps {
  variant?: Variant;
  icon?: LucideIcon;
  loading?: boolean;
  block?: boolean;
  children: ReactNode;
}

function Inner({ icon: Icon, loading, children }: Pick<CommonProps, 'icon' | 'loading' | 'children'>) {
  return (
    <>
      {loading ? (
        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        Icon && <Icon aria-hidden size={20} strokeWidth={1.75} />
      )}
      <span>{children}</span>
    </>
  );
}

export function Button({
  variant = 'primary',
  icon,
  loading = false,
  block = false,
  className,
  disabled,
  children,
  type = 'button',
  onClick,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  // While loading the button keeps its colours (it's busy, not unavailable) but ignores clicks and
  // form submits; `aria-disabled` + `aria-busy` tell assistive tech the same thing.
  return (
    <button
      type={loading ? 'button' : type}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      className={cn(
        base,
        variants[variant],
        (icon || loading) && 'pl-3',
        block && 'w-full',
        loading && 'cursor-progress active:scale-100',
        className,
      )}
      {...rest}
    >
      <Inner icon={icon} loading={loading}>
        {children}
      </Inner>
    </button>
  );
}

/** A link that looks like a button (e.g. "Open in Google Maps"). Opens in a new tab safely. */
export function ButtonLink({
  variant = 'secondary',
  icon,
  block = false,
  className,
  children,
  ...rest
}: Omit<CommonProps, 'loading'> & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cn(base, variants[variant], icon && 'pl-3', block && 'w-full', className)}
      {...rest}
    >
      <Inner icon={icon}>{children}</Inner>
    </a>
  );
}
