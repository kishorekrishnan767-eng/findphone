import { useEffect, useState } from 'react';
import { cn } from '../cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('fp-skeleton rounded-xs bg-subtle', className)} />;
}

/** Appears only after `delayMs`, so fast responses don't flash a placeholder. */
export function useDelayed(active: boolean, delayMs = 150): boolean {
  const [show, setShow] = useState(false);
  if (!active && show) setShow(false); // reset during render when deactivated
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(id);
  }, [active, delayMs]);
  return active && show;
}
