import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Check,
  Clock,
  Copy,
  Crosshair,
  ExternalLink,
  Hourglass,
  Pause,
  RefreshCw,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Banner } from '../../../design-system/components/Banner';
import { Button, ButtonLink } from '../../../design-system/components/Button';
import { EmptyState } from '../../../design-system/components/EmptyState';
import { IconButton } from '../../../design-system/components/IconButton';
import { InfoList, InfoRow } from '../../../design-system/components/InfoRow';
import { type BadgeStatus, StatusBadge } from '../../../design-system/components/StatusBadge';
import { useToast } from '../../../design-system/components/Toast';
import { formatAgo, formatExact } from '../../../lib/time';
import { maskNumber } from '../../../shared/phone/mask';
import type { PhoneNumber } from '../../../shared/phone/normalize';
import { formatCoordinates, googleMapsUrl } from '../../map/geo';
import type { DeviceRecord } from '../domain/device';
import type { DeviceStatus } from '../domain/status';

type Shown = Exclude<DeviceStatus, { kind: 'expired' }>;

export function badgeFor(status: Shown, now: Date): { status: BadgeStatus; label: string } {
  switch (status.kind) {
    case 'live':
      return { status: 'live', label: 'Live' };
    case 'stale':
      return { status: 'stale', label: `Last seen ${formatAgo(status.seenAt, now)}` };
    // Short labels: the empty state below the header explains these in full.
    case 'paused':
      return { status: 'paused', label: 'Paused' };
    case 'waiting':
      return { status: 'paused', label: 'Waiting' };
  }
}

function batteryIcon(level: number) {
  if (level <= 15) return BatteryWarning;
  if (level <= 40) return BatteryLow;
  if (level <= 80) return BatteryMedium;
  return BatteryFull;
}

const REFRESH_COOLDOWN_MS = 5000;

export function ResultCard({
  phone,
  device,
  status,
  now,
  reconnecting,
  onRefresh,
}: {
  phone: PhoneNumber;
  device: DeviceRecord;
  status: Shown;
  now: Date;
  reconnecting: boolean;
  onRefresh: () => Promise<void>;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [copied, setCopied] = useState(false);
  const badge = badgeFor(status, now);
  const position = status.kind === 'live' || status.kind === 'stale' ? device.position : null;

  // Move focus to the result when it first appears, so keyboard and screen-reader users land on it.
  useEffect(() => {
    heading.current?.focus();
  }, [phone.e164]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      toast('Location refreshed');
    } catch {
      toast("Couldn't refresh. Check your connection.", { isError: true });
    } finally {
      setRefreshing(false);
      setCoolingDown(true);
      window.setTimeout(() => setCoolingDown(false), REFRESH_COOLDOWN_MS);
    }
  };

  const copyCoordinates = async () => {
    if (!position) return;
    try {
      await navigator.clipboard.writeText(formatCoordinates(position));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Couldn't copy to the clipboard.", { isError: true });
    }
  };

  return (
    <article className="fp-stagger flex flex-col gap-4" aria-labelledby="fp-result-name">
      <header className="flex flex-col gap-2">
        {/* Keyed by status so the badge pops when it changes (e.g. Live → Last seen). */}
        <StatusBadge key={badge.status} status={badge.status} label={badge.label} />
        <div className="flex items-end justify-between gap-3">
          <h2 id="fp-result-name" ref={heading} tabIndex={-1} className="min-w-0 truncate text-title text-primary outline-none">
            {device.name}
          </h2>
          {/* Placed beside the name so it's easy to compare with the ID on the owner's phone. */}
          <div className="shrink-0 text-right" title="Matches the ID shown in the owner's app">
            <span className="block text-caption text-tertiary">Device ID</span>
            <span className="block font-mono text-mono text-primary">{device.deviceCode}</span>
            <span className="sr-only">Matches the ID shown in the owner's app.</span>
          </div>
        </div>
      </header>

      {reconnecting && (
        <Banner icon={WifiOff} kind="warning">
          Reconnecting. Showing the last update received.
        </Banner>
      )}

      {position && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={RefreshCw}
            loading={refreshing}
            disabled={coolingDown}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
          <ButtonLink href={googleMapsUrl(position)} icon={ExternalLink}>
            Open in Google Maps
          </ButtonLink>
        </div>
      )}

      {status.kind === 'paused' && (
        <EmptyState icon={Pause} title="Sharing is paused">
          The owner has paused location sharing, so no location is shown.
        </EmptyState>
      )}
      {status.kind === 'waiting' && (
        <EmptyState icon={Hourglass} title="Waiting for first location">
          This phone is registered but hasn't sent its location yet.
        </EmptyState>
      )}

      <InfoList className="fp-stagger fp-stagger--late">
        <InfoRow label="Number" mono>
          {maskNumber(phone)}
        </InfoRow>
        <InfoRow label="Model" icon={Smartphone}>
          {device.model}
        </InfoRow>
        {position && device.battery !== null && (
          <InfoRow label="Battery" icon={batteryIcon(device.battery)}>
            {device.battery}%{device.battery <= 15 ? ' · Low' : ''}
          </InfoRow>
        )}
        {position && (
          <InfoRow
            label="Accuracy"
            icon={Crosshair}
            hint={position.accuracy > 500 ? 'Low accuracy: the phone may be indoors or using approximate location.' : undefined}
          >
            ± {Math.round(position.accuracy)} m
          </InfoRow>
        )}
        {position && (
          <InfoRow
            label="Coordinates"
            mono
            trailing={
              <IconButton
                icon={copied ? Check : Copy}
                label={copied ? 'Coordinates copied' : 'Copy coordinates'}
                onClick={() => void copyCoordinates()}
                className="-my-2 -mr-2 rounded-md"
              />
            }
          >
            {formatCoordinates(position)}
          </InfoRow>
        )}
        {(status.kind === 'live' || status.kind === 'stale') && (
          <InfoRow label="Last update" icon={Clock} mono>
            {formatExact(status.seenAt)}
          </InfoRow>
        )}
      </InfoList>
    </article>
  );
}
