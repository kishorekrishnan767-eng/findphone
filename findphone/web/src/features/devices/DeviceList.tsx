import { ChevronRight, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { actions, useApp } from '../../app/store';
import { cn, focusRing } from '../../design-system/cn';
import { Button } from '../../design-system/components/Button';
import { PanelHeader } from '../../design-system/components/PanelHeader';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { maskNumber } from '../../shared/phone/mask';
import { parsePhone } from '../../shared/phone/normalize';
import { AddDeviceForm } from './AddDeviceForm';
import { DeviceIllustration } from './DeviceIllustration';
import { describeStatus, deviceTitle, useDeviceView } from './deviceView';

export function DeviceList() {
  const watched = useApp((s) => s.watched);
  const [adding, setAdding] = useState(watched.length === 0);

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        title="All devices"
        subtitle={watched.length ? `${watched.length} watched in this browser` : undefined}
        action={
          !adding && (
            <Button variant="secondary" icon={Plus} onClick={() => setAdding(true)} className="fp-glow">
              Add device
            </Button>
          )
        }
      />

      {adding && (
        <section className="fp-enter flex flex-col gap-3 rounded-lg border border-line bg-subtle/60 p-4" aria-label="Add a device">
          <div className="flex items-center justify-between">
            <h3 className="text-label text-primary">Add a device</h3>
            {watched.length > 0 && (
              <button
                type="button"
                aria-label="Cancel adding a device"
                onClick={() => setAdding(false)}
                className={cn('flex size-11 items-center justify-center rounded-md text-secondary hover:bg-hover', focusRing, '-my-2 -mr-2')}
              >
                <X aria-hidden size={18} />
              </button>
            )}
          </div>
          <AddDeviceForm submitLabel="Add and find" autoFocus />
        </section>
      )}

      <ul className="fp-stagger flex flex-col gap-2">
        {watched.map((w) => (
          <li key={w.e164}>
            <DeviceRow e164={w.e164} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeviceRow({ e164 }: { e164: string }) {
  const v = useDeviceView(e164)!;
  const selected = useApp((s) => s.selected === e164);
  const s = describeStatus(v);
  const parsed = parsePhone(e164, 'IN');
  const device = v.lookup?.kind === 'found' ? v.lookup.device : null;

  return (
    <button
      type="button"
      onClick={() => actions.select(e164)}
      className={cn(
        'fp-tile flex w-full items-center gap-3 rounded-lg border p-3 text-left',
        selected ? 'fp-accent-wash fp-glow border-transparent' : 'border-line bg-subtle/60 hover:bg-hover',
        focusRing,
      )}
    >
      <DeviceIllustration platform={device?.platform ?? null} size="sm" dim={s.badge === 'paused' || s.badge === 'error'} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label text-primary">{deviceTitle(v)}</span>
        <span className="block truncate font-mono text-mono-sm text-tertiary">
          {parsed.ok ? maskNumber(parsed.number) : e164}
          {device ? ` · ${device.deviceCode}` : ''}
        </span>
        <span className="mt-1 block truncate text-caption text-secondary">{s.line}</span>
      </span>
      <StatusBadge key={s.badge} status={s.badge} label={s.label} />
      <ChevronRight aria-hidden size={18} className="shrink-0 text-tertiary" />
    </button>
  );
}
