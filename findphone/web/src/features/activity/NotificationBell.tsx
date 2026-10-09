import { Bell } from 'lucide-react';
import { actions, useApp } from '../../app/store';
import { cn, focusRing } from '../../design-system/cn';
import { Menu } from '../../design-system/components/Menu';
import { EventList } from './ActivityPanel';

/** Header bell: unread count, the five latest events, and a link to the full log. */
export function NotificationBell() {
  const unread = useApp((s) => s.unread);
  const events = useApp((s) => s.events);

  return (
    <Menu
      label="Recent activity"
      trigger={({ open, toggle, id }) => (
        <button
          type="button"
          aria-label={unread ? `Activity, ${unread} new` : 'Activity'}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={() => {
            toggle();
            if (!open) actions.markRead();
          }}
          className={cn(
            'fp-glass relative flex size-11 items-center justify-center rounded-full text-secondary hover:text-primary',
            focusRing,
          )}
        >
          <Bell aria-hidden size={20} strokeWidth={1.75} />
          {unread > 0 && (
            <span className="fp-pop absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-label-sm text-on-danger">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="w-80 max-w-[calc(100vw-2rem)] p-2">
          <p className="px-2 pt-1 pb-2 text-label text-primary">Recent activity</p>
          {events.length === 0 ? (
            <p className="px-2 pb-2 text-body text-secondary">Nothing yet. Alerts appear here as they happen.</p>
          ) : (
            <EventList events={events.slice(0, 5)} onPick={close} />
          )}
          <button
            type="button"
            onClick={() => {
              close();
              actions.go('activity');
            }}
            className={cn('mt-1 h-11 w-full rounded-md text-label text-accent hover:bg-hover', focusRing)}
          >
            See all activity
          </button>
        </div>
      )}
    </Menu>
  );
}
