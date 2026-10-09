import { ActivityPanel } from '../features/activity/ActivityPanel';
import { DeviceDetail } from '../features/devices/DeviceDetail';
import { DeviceList } from '../features/devices/DeviceList';
import { Welcome } from '../features/devices/Welcome';
import { SecurityPanel } from '../features/security/SecurityPanel';
import { SettingsPanel } from '../features/settings/SettingsPanel';
import { AlertsPanel } from '../features/tools/AlertsPanel';
import { GeofencePanel } from '../features/tools/GeofencePanel';
import { HistoryPanel } from '../features/tools/HistoryPanel';
import { useApp } from './store';

/** What the left panel (or mobile sheet) shows for the current tab and tool. */
export function SidePanel() {
  const tab = useApp((s) => s.tab);
  const tool = useApp((s) => s.tool);
  const selected = useApp((s) => s.selected);

  // Keyed so each view mounts fresh (staggered entrance, per-device state like Ring).
  switch (tab) {
    case 'devices':
      return <DeviceList key="devices" />;
    case 'activity':
      return <ActivityPanel key="activity" />;
    case 'security':
      return <SecurityPanel key="security" />;
    case 'settings':
      return <SettingsPanel key="settings" />;
    case 'map':
      if (!selected) return <Welcome key="welcome" />;
      if (tool === 'history') return <HistoryPanel key={`h-${selected}`} e164={selected} />;
      if (tool === 'geofence') return <GeofencePanel key={`g-${selected}`} e164={selected} />;
      if (tool === 'alerts') return <AlertsPanel key="alerts" />;
      return <DeviceDetail key={`d-${selected}`} e164={selected} />;
  }
}
