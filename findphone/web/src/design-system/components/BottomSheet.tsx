import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn, focusRing } from '../cn';

const PEEK_PX = 176; // size.sheetPeek

/**
 * Mobile container for the search panel. Two snap points: peek (176 px) and expanded (content
 * height, ≤ 85 dvh). Drag the handle, or use it as a button: it's a real <button aria-expanded>,
 * so keyboard and screen-reader users get the same control. Esc collapses.
 */
export function BottomSheet({
  expanded,
  onExpandedChange,
  label,
  children,
}: {
  expanded: boolean;
  onExpandedChange: (v: boolean) => void;
  label: string;
  children: ReactNode;
}) {
  const [dragY, setDragY] = useState<number | null>(null);
  const start = useRef<{ y: number; expanded: boolean } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expanded) onExpandedChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, onExpandedChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { y: e.clientY, expanded };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (start.current) setDragY(e.clientY - start.current.y);
  };
  const onPointerUp = () => {
    if (!start.current) return;
    const dy = dragY ?? 0;
    // A small movement is a tap: toggle. A drag snaps by direction.
    if (Math.abs(dy) < 8) onExpandedChange(!start.current.expanded);
    else onExpandedChange(dy < 0);
    start.current = null;
    setDragY(null);
  };

  return (
    <section
      aria-label={label}
      className={cn(
        'fixed inset-x-0 bottom-0 z-(--fp-z-sheet) flex flex-col rounded-t-lg border-t border-line bg-raised shadow-e3',
        dragY === null && 'transition-[max-height] duration-250 ease-standard',
      )}
      style={{
        maxHeight: expanded ? '85dvh' : `${PEEK_PX + Math.max(0, -(dragY ?? 0))}px`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse details' : 'Expand details'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn('flex h-6 w-full shrink-0 cursor-grab touch-none items-center justify-center', focusRing)}
      >
        <span aria-hidden className="h-1 w-8 rounded-full bg-line" />
      </button>
      <div className={cn('min-h-0 flex-1 px-4 pb-4', expanded ? 'overflow-y-auto' : 'overflow-hidden')}>
        {children}
      </div>
    </section>
  );
}
