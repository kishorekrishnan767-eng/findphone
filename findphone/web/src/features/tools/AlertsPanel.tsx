import { Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { actions, useApp } from '../../app/store';
import { Banner } from '../../design-system/components/Banner';
import { Button } from '../../design-system/components/Button';
import { PanelHeader } from '../../design-system/components/PanelHeader';
import { Switch } from '../../design-system/components/Switch';

type Permission = NotificationPermission | 'unsupported';

function currentPermission(): Permission {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
}

/** What to be alerted about, and permission for system notifications when the tab is hidden. */
export function AlertsPanel({ back = true }: { back?: boolean }) {
  const settings = useApp((s) => s.settings);
  const [permission, setPermission] = useState<Permission>(currentPermission);

  const request = async () => {
    if (permission === 'unsupported') return;
    setPermission(await Notification.requestPermission());
  };

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        title="Alerts"
        subtitle="Shown in the app and in the activity log. System notifications appear when this tab is in the background."
        back={back ? { label: 'Back to device', onClick: () => actions.openTool('overview') } : undefined}
      />

      <div className="flex items-center gap-3 rounded-lg border border-line bg-subtle/60 p-3">
        {permission === 'granted' ? (
          <CheckCircle2 aria-hidden size={20} className="shrink-0 text-live" />
        ) : (
          <BellOff aria-hidden size={20} className="shrink-0 text-tertiary" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-label text-primary">System notifications</p>
          <p className="text-caption text-tertiary">
            {permission === 'granted'
              ? 'Allowed for this site.'
              : permission === 'denied'
                ? 'Blocked. Allow them in the browser’s site settings.'
                : permission === 'unsupported'
                  ? 'Not supported in this browser.'
                  : 'Not allowed yet.'}
          </p>
        </div>
        {permission === 'default' && (
          <Button variant="secondary" icon={Bell} onClick={() => void request()}>
            Allow
          </Button>
        )}
      </div>

      <div className="divide-y divide-line-subtle rounded-lg border border-line bg-subtle/60 px-3">
        <Switch
          label="Online and offline"
          description="When a phone goes quiet, comes back, or pauses sharing"
          checked={settings.notifyStatus}
          onChange={(v) => actions.updateSettings({ notifyStatus: v })}
        />
        <Switch
          label="Low battery"
          description="When a phone drops to 15% or below"
          checked={settings.notifyBattery}
          onChange={(v) => actions.updateSettings({ notifyBattery: v })}
        />
        <Switch
          label="Safe zone"
          description="When a phone leaves or returns to its zone"
          checked={settings.notifyGeofence}
          onChange={(v) => actions.updateSettings({ notifyGeofence: v })}
        />
      </div>

      <Banner icon={Bell}>Alerts are checked in this browser, so they work while the page is open.</Banner>
    </div>
  );
}
