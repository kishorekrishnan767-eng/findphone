import { Box, Map as MapIcon, Monitor, Moon, Satellite, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { actions, useApp } from '../../app/store';
import { PanelHeader } from '../../design-system/components/PanelHeader';
import { Segmented } from '../../design-system/components/Segmented';
import { Switch } from '../../design-system/components/Switch';
import { AlertsPanel } from '../tools/AlertsPanel';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h3 className="text-label-sm text-tertiary">{title}</h3>
      {children}
    </section>
  );
}

export function SettingsPanel() {
  const s = useApp((x) => x.settings);
  return (
    <div className="flex flex-col gap-6">
      <PanelHeader title="Settings" subtitle="Saved in this browser." />

      <Group title="Appearance">
        <Segmented
          label="Theme"
          value={s.theme}
          onChange={(theme) => actions.updateSettings({ theme })}
          options={[
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'system', label: 'System', icon: Monitor },
          ]}
          className="w-full [&>button]:flex-1"
        />
        <Segmented
          label="Units"
          value={s.units}
          onChange={(units) => actions.updateSettings({ units })}
          options={[
            { value: 'metric', label: 'Metric' },
            { value: 'imperial', label: 'Imperial' },
          ]}
          className="w-full [&>button]:flex-1"
        />
      </Group>

      <Group title="Map">
        <Segmented
          label="Default map view"
          value={s.defaultMode}
          onChange={(defaultMode) => {
            actions.updateSettings({ defaultMode });
            actions.setMapMode(defaultMode);
          }}
          options={[
            { value: 'satellite', label: 'Satellite', icon: Satellite },
            { value: 'map', label: 'Map', icon: MapIcon },
            { value: '3d', label: '3D', icon: Box },
          ]}
          className="w-full [&>button]:flex-1"
        />
        <div className="divide-y divide-line-subtle rounded-lg border border-line bg-subtle/60 px-3">
          <Switch
            label="Nearby landmarks"
            description="Colleges, hospitals, stations near the phone (OpenStreetMap)"
            checked={s.showLandmarks}
            onChange={(showLandmarks) => actions.updateSettings({ showLandmarks })}
          />
          <Switch
            label="Movement trail"
            checked={s.showTrail}
            onChange={(showTrail) => actions.updateSettings({ showTrail })}
          />
          <Switch
            label="Accuracy circle"
            checked={s.showAccuracy}
            onChange={(showAccuracy) => actions.updateSettings({ showAccuracy })}
          />
        </div>
      </Group>

      <Group title="Privacy">
        <div className="rounded-lg border border-line bg-subtle/60 px-3">
          <Switch
            label="Remember devices on this browser"
            description="Off: the list is forgotten when you close the tab"
            checked={s.rememberDevices}
            onChange={(rememberDevices) => actions.updateSettings({ rememberDevices })}
          />
        </div>
      </Group>

      <AlertsPanel back={false} />

      <Group title="Data sources">
        <p className="text-caption text-tertiary">
          Imagery © Esri, Maxar, Earthstar Geographics · Maps, addresses, landmarks © OpenStreetMap contributors via
          OpenFreeMap, Nominatim, Photon and Overpass · Weather by Open-Meteo.
        </p>
      </Group>
    </div>
  );
}
