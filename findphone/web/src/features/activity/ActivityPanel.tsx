import { Activity, Trash2 } from 'lucide-react';
import { actions, useApp, type AppEvent } from '../../app/store';
import { cn, focusRing } from '../../design-system/cn';
import { Button } from '../../design-system/components/Button';
import { EmptyState } from '../../design-system/components/EmptyState';
import { PanelHeader } from '../../design-system/components/PanelHeader';
import { formatAgo } from '../../lib/time';
import { formatClock } from '../../lib/units';
import { useNow } from '../../shared/hooks/useNow';
import { eventMeta, toneClass } from './eventMeta';

/** Everything that happened to watched devices while this page was open. */
export function ActivityPanel() {
  const events = useApp((s) => s.events);
  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        title="Activity"
        subtitle="Status changes, safe-zone crossings, battery and rings while this page is open."
        action={
          events.length > 0 && (
            <Button variant="ghost" icon={Trash2} onClick={actions.clearEvents}>
              Clear
            </Button>
          )
        }
      />
      {events.length === 0 ? (
        <EmptyState icon={Activity} title="Nothing yet">
          Events appear here as watched phones go online or offline, cross a safe zone, run low on battery, or get rung.
        </EmptyState>
      ) : (
        <EventList events={events} />
      )}
    </div>
  );
}

export function EventList({ events, onPick }: { events: AppEvent[]; onPick?: () => void }) {
  const now = useNow(15_000);
  return (
    <ol className="fp-stagger flex flex-col gap-1">
      {events.map((e) => {
        const meta = eventMeta[e.kind];
        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => {
                actions.select(e.e164);
                onPick?.();
              }}
              className={cn('flex w-full items-start gap-3 rounded-md p-2 text-left hover:bg-hover', focusRing)}
            >
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', toneClass[meta.tone])}>
                <meta.icon aria-hidden size={16} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-label text-primary">{e.title}</span>
                <span className="block text-caption text-secondary">{e.body}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-mono-sm text-tertiary">{formatClock(new Date(e.at))}</span>
                <span className="block text-caption text-tertiary">{formatAgo(new Date(e.at), now)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
