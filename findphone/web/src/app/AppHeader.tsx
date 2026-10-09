import { Activity, Map as MapIcon, Settings, ShieldCheck, Smartphone, type LucideIcon } from 'lucide-react';
import { cn, focusRing } from '../design-system/cn';
import { NotificationBell } from '../features/activity/NotificationBell';
import { BrandMark } from './BrandMark';
import { type Tab, actions, useApp } from './store';

export const NAV: Array<{ tab: Tab; label: string; icon: LucideIcon }> = [
  { tab: 'map', label: 'Map', icon: MapIcon },
  { tab: 'devices', label: 'Devices', icon: Smartphone },
  { tab: 'activity', label: 'Activity', icon: Activity },
  { tab: 'security', label: 'Security', icon: ShieldCheck },
  { tab: 'settings', label: 'Settings', icon: Settings },
];

export function AppHeader({ compact }: { compact: boolean }) {
  const tab = useApp((s) => s.tab);
  const watched = useApp((s) => s.watched.length);

  return (
    <header className="z-(--fp-z-banner) flex h-16 shrink-0 items-center gap-4 px-4 lg:h-20 lg:px-6">
      <BrandMark />

      {!compact && (
        <nav aria-label="Main" className="fp-glass mx-auto flex items-center gap-1 rounded-xl p-1">
          {NAV.map(({ tab: t, label, icon: Icon }) => {
            const active = t === tab;
            return (
              <button
                key={t}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => actions.go(t)}
                className={cn(
                  'flex h-11 items-center gap-2 rounded-lg px-3 text-label transition-colors duration-150 ease-standard xl:px-4',
                  active ? 'fp-accent-wash fp-glow text-primary' : 'text-secondary hover:bg-hover hover:text-primary',
                  focusRing,
                )}
              >
                <Icon aria-hidden size={18} strokeWidth={1.75} className={active ? 'text-accent' : ''} />
                <span className="hidden lg:inline">{label}</span>
                {t === 'devices' && watched > 0 && (
                  <span className="rounded-xs bg-accent-subtle px-1 font-mono text-mono-sm text-on-accent-subtle">{watched}</span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      <div className={cn('flex items-center gap-3', compact && 'ml-auto')}>
        <NotificationBell />
      </div>
    </header>
  );
}

/** Mobile: the same five destinations as a bottom tab bar. */
export function BottomNav() {
  const tab = useApp((s) => s.tab);
  return (
    <nav
      aria-label="Main"
      className="fp-glass-strong fixed inset-x-0 bottom-0 z-(--fp-z-banner) grid grid-cols-5 rounded-none border-x-0 border-b-0"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV.map(({ tab: t, label, icon: Icon }) => {
        const active = t === tab;
        return (
          <button
            key={t}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => actions.go(t)}
            className={cn('flex h-16 flex-col items-center justify-center gap-1 text-label-sm', active ? 'text-accent' : 'text-tertiary', focusRing)}
          >
            <Icon aria-hidden size={20} strokeWidth={active ? 2 : 1.75} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
