import { BellRing, LocateFixed, Radar, ShieldCheck } from 'lucide-react';
import { AddDeviceForm } from './AddDeviceForm';

/** First visit: what FindPhone does, then the number field. */
export function Welcome() {
  const points = [
    { icon: LocateFixed, text: 'Live location on satellite or 3D maps, with the street address' },
    { icon: BellRing, text: 'Ring the phone at full volume, even on silent' },
    { icon: Radar, text: 'Safe-zone alerts and a trail of where it moved' },
    { icon: ShieldCheck, text: 'Only phones whose owners turned sharing on' },
  ];
  return (
    <div className="fp-stagger flex flex-col gap-6">
      <div>
        <p className="text-label-sm text-accent">Find a device</p>
        <h2 className="mt-1 text-title-lg text-primary">Where is the phone?</h2>
        <p className="mt-2 text-body text-secondary">Enter the number registered in the FindPhone app.</p>
      </div>
      <AddDeviceForm autoFocus />
      <ul className="flex flex-col gap-3 border-t border-line pt-5">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-body text-secondary">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
              <Icon aria-hidden size={16} strokeWidth={1.75} />
            </span>
            <span className="pt-1">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
