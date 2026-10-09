import type { LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { cn, focusRing } from '../cn';

export interface MenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
}

/** Button that opens a small list of actions. Closes on outside click, Esc or selection. */
export function Menu({
  trigger,
  label,
  items,
  align = 'end',
  children,
}: {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode;
  label: string;
  items?: MenuItem[];
  align?: 'start' | 'end';
  children?: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={root} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), id })}
      {open && (
        <div
          id={id}
          role={items ? 'menu' : 'dialog'}
          aria-label={label}
          className={cn(
            'fp-glass-strong fp-enter absolute top-full z-(--fp-z-toast) mt-2 min-w-56 rounded-lg p-1',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items?.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                item.onSelect();
              }}
              className={cn(
                'flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-label',
                item.danger ? 'text-danger-text hover:bg-danger-subtle' : 'text-primary hover:bg-hover',
                focusRing,
              )}
            >
              <item.icon aria-hidden size={18} strokeWidth={1.75} className={item.danger ? '' : 'text-secondary'} />
              {item.label}
            </button>
          ))}
          {children?.(close)}
        </div>
      )}
    </div>
  );
}
