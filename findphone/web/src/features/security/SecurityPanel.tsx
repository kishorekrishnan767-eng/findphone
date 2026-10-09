import { BadgeCheck, Clock, EyeOff, Hand, KeyRound, ListX, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { actions, useApp } from '../../app/store';
import { env } from '../../config/env';
import { Button } from '../../design-system/components/Button';
import { PanelHeader } from '../../design-system/components/PanelHeader';
import { StatusBadge } from '../../design-system/components/StatusBadge';

/** How FindPhone protects the people being located, stated plainly. */
export function SecurityPanel() {
  const watched = useApp((s) => s.watched.length);
  const appCheck = env.useEmulators ? 'emulator' : env.recaptchaSiteKey ? 'on' : 'off';

  const facts = [
    { icon: Hand, title: 'Opt-in only', body: 'A phone appears only after its owner agreed and turned sharing on in the app.' },
    { icon: EyeOff, title: 'Pause hides it', body: 'Pausing removes the location from the server, not just from view.' },
    { icon: Clock, title: 'Latest position only', body: 'No location history is stored. Records with no update for 7 days show as not found.' },
    { icon: ListX, title: 'No browsing', body: 'A phone can only be looked up by its exact number. Listing or searching all phones is blocked by the server.' },
    { icon: KeyRound, title: 'Owner-only changes', body: 'Only the registered phone can change or delete its record. Reclaiming needs its recovery code.' },
    {
      icon: Lock,
      title: 'Ring, never lock or wipe',
      body: 'This site has no login, so the only remote action is a one-minute-limited ring. Lock or erase would let anyone who knows a number wipe a stranger’s phone.',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader title="Security & privacy" subtitle="How FindPhone protects the people it locates." />

      <div className="flex items-center gap-3 rounded-lg border border-line bg-subtle/60 p-3">
        <BadgeCheck aria-hidden size={20} className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-label text-primary">App Check</p>
          <p className="text-caption text-tertiary">Proves requests come from this site, blocking scripts.</p>
        </div>
        <StatusBadge
          status={appCheck === 'on' ? 'live' : 'stale'}
          label={appCheck === 'on' ? 'Active' : appCheck === 'emulator' ? 'Local test' : 'Not set up'}
        />
      </div>

      <ul className="fp-stagger flex flex-col gap-3">
        {facts.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3 rounded-lg border border-line bg-subtle/60 p-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
              <Icon aria-hidden size={18} strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-label text-primary">{title}</span>
              <span className="block text-caption text-secondary">{body}</span>
            </span>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3 rounded-lg border border-line p-3" aria-labelledby="fp-browser-data">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden size={18} className="text-accent" />
          <h3 id="fp-browser-data" className="text-label text-primary">
            This browser
          </h3>
        </div>
        <p className="text-caption text-secondary">
          {watched} watched number{watched === 1 ? '' : 's'}, labels and safe zones are saved only here. Nothing about what you
          look up is sent anywhere except the single record you open.
        </p>
        <Button
          variant="ghost"
          icon={Trash2}
          className="self-start text-danger-text hover:bg-danger-subtle"
          disabled={watched === 0}
          onClick={() => {
            actions.forgetAll();
            actions.toast('Saved devices, safe zones and activity cleared from this browser');
          }}
        >
          Forget everything on this browser
        </Button>
      </section>
    </div>
  );
}
