import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Bell,
  BellRing,
  ChevronLeft,
  Check,
  Clock,
  Copy,
  Crosshair,
  Ellipsis,
  ExternalLink,
  Footprints,
  Hourglass,
  MapPin,
  MapPinOff,
  Navigation,
  Pause,
  Pencil,
  Radar,
  RefreshCw,
  Share2,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { actions, useApp } from '../../app/store';
import { cn, focusRing } from '../../design-system/cn';
import { Banner } from '../../design-system/components/Banner';
import { Button, ButtonLink } from '../../design-system/components/Button';
import { EmptyState } from '../../design-system/components/EmptyState';
import { Menu } from '../../design-system/components/Menu';
import { PanelHeader } from '../../design-system/components/PanelHeader';
import { Skeleton } from '../../design-system/components/Skeleton';
import { StatusBadge } from '../../design-system/components/StatusBadge';
import { ActionTile, StatTile } from '../../design-system/components/Tile';
import { lookupErrorCopy } from '../../lib/errors';
import { formatClock, formatDayZone, formatDistance } from '../../lib/units';
import { maskNumber } from '../../shared/phone/mask';
import { retryWatch } from '../lookup/deviceWatchers';
import type { DeviceRecord } from '../lookup/domain/device';
import { formatCoordinates, googleMapsUrl } from '../map/geo';
import { directionsUrl, streetViewUrl } from '../places/geoServices';
import { useAddress } from '../places/usePlaces';
import { useRing } from '../ring/useRing';
import { DeviceIllustration } from './DeviceIllustration';
import { type DeviceView, describeStatus, deviceTitle, useDeviceView } from './deviceView';

export function DeviceDetail({ e164 }: { e164: string }) {
  const v = useDeviceView(e164)!;
  const back = { label: 'All devices', onClick: () => actions.go('devices') };
  const l = v.lookup;

  if (!l || l.kind === 'idle' || l.kind === 'loading') return <DetailSkeleton back={back} />;

  if (l.kind === 'error') {
    const copy = lookupErrorCopy[l.error];
    return (
      <div className="flex flex-col gap-5">
        <PanelHeader title="All devices" back={back} />
        <div className="fp-enter">
          <EmptyState
            icon={WifiOff}
            title={copy.title}
            action={
              l.error !== 'blocked' && (
                <Button variant="secondary" icon={RefreshCw} onClick={() => retryWatch(e164)}>
                  Try again
                </Button>
              )
            }
          >
            {copy.body}
          </EmptyState>
        </div>
      </div>
    );
  }

  if (l.kind === 'notFound' || v.status?.kind === 'expired') {
    return (
      <div className="flex flex-col gap-5">
        <PanelHeader title="All devices" back={back} />
        <div className="fp-enter">
          <EmptyState
            icon={MapPinOff}
            title="No device found for this number"
            action={
              <Button variant="ghost" icon={Trash2} onClick={() => actions.removeDevice(e164)}>
                Remove from list
              </Button>
            }
          >
            <span className="font-mono">{maskNumber(l.phone)}</span> isn&apos;t registered, or its owner deleted their data.
            Ask them to open FindPhone and turn sharing on.
          </EmptyState>
        </div>
      </div>
    );
  }

  return <FoundDetail v={v} device={l.device} reconnecting={l.reconnecting} back={back} />;
}

function FoundDetail({
  v,
  device,
  reconnecting,
  back,
}: {
  v: DeviceView;
  device: DeviceRecord;
  reconnecting: boolean;
  back: { label: string; onClick: () => void };
}) {
  const units = useApp((s) => s.settings.units);
  const s = describeStatus(v);
  const kind = v.status?.kind;
  const position = kind === 'live' || kind === 'stale' ? device.position : null;
  const seenAt = kind === 'live' || kind === 'stale' ? v.status!.seenAt : device.updatedAt;

  return (
    <div className="fp-stagger flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={back.onClick}
          className={cn('-ml-2 flex h-11 items-center gap-1 rounded-md px-2 text-label text-secondary hover:bg-hover hover:text-primary', focusRing)}
        >
          <ChevronLeft aria-hidden size={18} /> All devices
        </button>
        <span className="font-mono text-mono-sm text-tertiary">{v.lookup?.kind === 'found' ? maskNumber(v.lookup.phone) : null}</span>
      </div>

      <Hero v={v} device={device} badge={s} />

      {reconnecting && (
        <Banner icon={WifiOff} kind="warning">
          Reconnecting. Showing the last update received.
        </Banner>
      )}

      <Actions v={v} device={device} position={position} />

      <div className="grid grid-cols-2 gap-3">
        <BatteryTile battery={device.battery} />
        <StatTile icon={Crosshair} label="Accuracy" tone={position ? 'accent' : 'muted'}>
          {position ? `± ${formatDistance(position.accuracy, units)}` : '—'}
        </StatTile>
        <StatTile
          icon={kind === 'live' ? Wifi : kind === 'paused' ? Pause : WifiOff}
          label="Network"
          tone={kind === 'live' ? 'live' : kind === 'stale' ? 'stale' : 'muted'}
        >
          {kind === 'live' ? 'Online' : kind === 'stale' ? 'Offline' : kind === 'paused' ? 'Paused' : 'Waiting'}
        </StatTile>
        <StatTile icon={Clock} label="Last updated">
          <span className="block font-mono text-mono">{formatClock(seenAt)}</span>
          <span className="block font-mono text-mono-sm text-tertiary">{formatDayZone(seenAt)}</span>
        </StatTile>
      </div>

      {position ? (
        <LocationCard position={position} />
      ) : kind === 'paused' ? (
        <EmptyState icon={Pause} title="Sharing is paused">
          The owner paused location sharing, so the location is removed until they resume.
        </EmptyState>
      ) : (
        <EmptyState icon={Hourglass} title="Waiting for first location">
          This phone is registered but hasn&apos;t sent its location yet.
        </EmptyState>
      )}

      <Tools e164={v.e164} hasPosition={Boolean(position)} />
    </div>
  );
}

function Hero({ v, device, badge }: { v: DeviceView; device: DeviceRecord; badge: ReturnType<typeof describeStatus> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(v.nickname ?? '');
  const title = deviceTitle(v);

  return (
    <section className="flex gap-4 rounded-xl border border-line bg-subtle/60 p-4" aria-labelledby="fp-device-name">
      <DeviceIllustration platform={device.platform} dim={badge.badge === 'paused'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1">
          {editing ? (
            <form
              className="flex min-w-0 flex-1 items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                actions.rename(v.e164, draft.trim() || null);
                setEditing(false);
              }}
            >
              <input
                autoFocus
                value={draft}
                maxLength={30}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Label for this device"
                placeholder={device.name}
                className="h-9 min-w-0 flex-1 rounded-md border border-accent bg-surface px-2 text-label text-primary outline-none"
              />
              <button type="submit" aria-label="Save label" className={cn('flex size-9 items-center justify-center rounded-md text-accent hover:bg-hover', focusRing)}>
                <Check aria-hidden size={18} />
              </button>
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => setEditing(false)}
                className={cn('flex size-9 items-center justify-center rounded-md text-secondary hover:bg-hover', focusRing)}
              >
                <X aria-hidden size={18} />
              </button>
            </form>
          ) : (
            <>
              <h2 id="fp-device-name" className="min-w-0 truncate text-title text-primary">
                {title}
              </h2>
              <button
                type="button"
                aria-label="Edit label"
                title="Edit label (this browser only)"
                onClick={() => {
                  setDraft(v.nickname ?? '');
                  setEditing(true);
                }}
                className={cn('flex size-8 shrink-0 items-center justify-center rounded-md text-tertiary hover:bg-hover hover:text-primary', focusRing)}
              >
                <Pencil aria-hidden size={14} />
              </button>
            </>
          )}
          <MoreMenu v={v} device={device} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge key={badge.badge} status={badge.badge} label={badge.label} />
          <span className="text-caption text-secondary">{badge.line.replace(/^Live · /, '')}</span>
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-caption">
          {v.nickname && (
            <>
              <dt className="text-tertiary">Owner</dt>
              <dd className="truncate text-secondary">{device.name}</dd>
            </>
          )}
          <dt className="text-tertiary">Model</dt>
          <dd className="truncate text-secondary">{device.model}</dd>
          <dt className="text-tertiary">Device ID</dt>
          <dd className="font-mono text-mono-sm text-primary">{device.deviceCode}</dd>
        </dl>
      </div>
    </section>
  );
}

function MoreMenu({ v, device }: { v: DeviceView; device: DeviceRecord }) {
  const p = device.position;
  return (
    <Menu
      label="More actions"
      trigger={({ open, toggle, id }) => (
        <button
          type="button"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={toggle}
          className={cn('-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary', focusRing)}
        >
          <Ellipsis aria-hidden size={20} />
        </button>
      )}
      items={[
        ...(p && device.sharingEnabled
          ? [
              {
                label: 'Copy coordinates',
                icon: Copy,
                onSelect: () => void copy(formatCoordinates(p), 'Coordinates copied'),
              },
            ]
          : []),
        { label: 'Remove from this browser', icon: Trash2, danger: true, onSelect: () => actions.removeDevice(v.e164) },
      ]}
    />
  );
}

function Actions({ v, device, position }: { v: DeviceView; device: DeviceRecord; position: DeviceRecord['position'] }) {
  const ring = useRing(v.e164, device.sharingEnabled);
  const busy = ring.status.kind === 'sending';
  const ringLabel =
    ring.status.kind === 'ringing' ? 'Ringing' : ring.status.kind === 'sent' ? 'Sent' : ring.cooldownLeft > 0 ? `${ring.cooldownLeft}s` : 'Ring';

  const share = async () => {
    if (!position) return;
    const url = googleMapsUrl(position);
    const text = `${deviceTitle(v)} · ${formatCoordinates(position)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'FindPhone location', text, url });
      else await copy(`${text}\n${url}`, 'Location link copied');
    } catch {
      // The user closed the share sheet.
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2">
        <ActionTile
          icon={BellRing}
          label={ringLabel}
          tone="accent"
          busy={busy}
          disabled={!device.sharingEnabled || ring.cooldownLeft > 0 || busy}
          onClick={() => void ring.ring()}
          hint={device.sharingEnabled ? 'Play an alarm on the phone for 30 seconds' : 'Unavailable while sharing is paused'}
        />
        {position ? (
          <>
            <ActionTile icon={Navigation} label="Get route" href={directionsUrl(position)} hint="Directions in Google Maps" />
            <ActionTile icon={Footprints} label="Street View" href={streetViewUrl(position)} hint="Street-level imagery in Google Maps" />
            <ActionTile icon={Share2} label="Share" onClick={() => void share()} hint="Share this location" />
          </>
        ) : (
          <>
            <ActionTile icon={Navigation} label="Get route" disabled hint="No location to route to" />
            <ActionTile icon={Footprints} label="Street View" disabled hint="No location yet" />
            <ActionTile icon={Share2} label="Share" disabled hint="No location to share" />
          </>
        )}
      </div>
      <p className="min-h-4 text-caption text-tertiary" aria-live="polite">
        {ring.status.kind === 'ringing' && <span className="text-live">The phone confirmed it is ringing.</span>}
        {ring.status.kind === 'sent' && 'Ring request sent. Waiting for the phone to confirm…'}
        {ring.status.kind === 'error' && <span className="text-danger-text">{ring.status.message}</span>}
        {ring.status.kind === 'idle' &&
          (ring.lastRungAt
            ? `Last rung at ${formatClock(ring.lastRungAt)}${ring.acknowledged ? ', confirmed by the phone' : ''}.`
            : 'Ring plays an alarm for 30 s, even on silent.')}
      </p>
    </div>
  );
}

function BatteryTile({ battery }: { battery: number | null }) {
  if (battery === null)
    return (
      <StatTile icon={BatteryMedium} label="Battery" tone="muted">
        Unknown
      </StatTile>
    );
  const Icon = battery <= 15 ? BatteryWarning : battery <= 40 ? BatteryLow : battery <= 80 ? BatteryMedium : BatteryFull;
  const tone = battery <= 15 ? 'error' : battery <= 40 ? 'stale' : 'live';
  const fill = battery <= 15 ? 'bg-error-dot' : battery <= 40 ? 'bg-stale-dot' : 'bg-live-dot';
  return (
    <StatTile icon={Icon} label="Battery" tone={tone}>
      <span className="block">{battery}%</span>
      <span className="fp-meter mt-1 block" role="meter" aria-valuenow={battery} aria-valuemin={0} aria-valuemax={100} aria-label="Battery level">
        <span className={fill} style={{ width: `${battery}%` }} />
      </span>
    </StatTile>
  );
}

function LocationCard({ position }: { position: NonNullable<DeviceRecord['position']> }) {
  const address = useAddress(position);
  const coords = formatCoordinates(position);
  const copyAll = () =>
    void copy(address ? `${address.line1}, ${address.line2}\n${coords}` : coords, address ? 'Address copied' : 'Coordinates copied');

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-subtle/60 p-4" aria-label="Current location">
      <div className="flex items-start gap-3">
        <MapPin aria-hidden size={20} strokeWidth={1.75} className="mt-1 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-caption text-tertiary">Current location</p>
          {address === undefined ? (
            <div className="mt-1 flex flex-col gap-2" aria-hidden>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          ) : address ? (
            <p className="text-body text-primary">
              {address.line1}
              {address.line2 && <span className="block text-secondary">{address.line2}</span>}
            </p>
          ) : (
            <p className="text-body text-secondary">Address unavailable for this spot.</p>
          )}
          <p className="mt-1 font-mono text-mono-sm text-tertiary">{coords}</p>
        </div>
        <button
          type="button"
          onClick={copyAll}
          aria-label="Copy location"
          title="Copy location"
          className={cn('-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary', focusRing)}
        >
          <Copy aria-hidden size={18} />
        </button>
      </div>
      <ButtonLink href={googleMapsUrl(position)} icon={ExternalLink} variant="primary" block className="fp-glow">
        Open in Google Maps
      </ButtonLink>
    </section>
  );
}

function Tools({ e164, hasPosition }: { e164: string; hasPosition: boolean }) {
  const fence = useApp((s) => s.geofences[e164]);
  const trailCount = useApp((s) => s.trails[e164]?.length ?? 0);
  return (
    <section aria-label="Tools" className="grid grid-cols-4 gap-2 border-t border-line pt-4">
      <ActionTile
        icon={Footprints}
        label={trailCount ? `History (${trailCount})` : 'History'}
        onClick={() => actions.openTool('history')}
        hint="Where it moved while this page was open"
      />
      <ActionTile
        icon={Radar}
        label="Safe zone"
        active={Boolean(fence?.enabled)}
        disabled={!hasPosition && !fence}
        onClick={() => actions.openTool('geofence')}
        hint="Get alerted when it leaves an area"
      />
      <ActionTile icon={Bell} label="Alerts" onClick={() => actions.openTool('alerts')} hint="What to notify you about" />
      <ActionTile icon={Trash2} label="Remove" tone="danger" onClick={() => actions.removeDevice(e164)} hint="Stop watching this device in this browser" />
    </section>
  );
}

function DetailSkeleton({ back }: { back: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col gap-4">
      <PanelHeader title="All devices" back={back} />
      <div className="flex items-center gap-3 rounded-md border border-line bg-subtle px-3 py-3">
        <span aria-hidden className="fp-mini-radar">
          <span className="fp-mini-radar__ring" />
          <span className="fp-mini-radar__ring" />
          <span className="fp-mini-radar__core" />
        </span>
        <p className="text-label text-primary">
          Locating<span aria-hidden className="fp-dots" />
        </p>
      </div>
      <div className="flex gap-4" aria-hidden>
        <Skeleton className="h-28 w-16 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    actions.toast(done);
  } catch {
    actions.toast("Couldn't copy to the clipboard.", true);
  }
}
