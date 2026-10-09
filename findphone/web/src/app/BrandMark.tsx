import { MapPin } from 'lucide-react';

export function BrandMark() {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <span className="fp-brand-mark flex size-10 items-center justify-center rounded-full lg:size-12">
        <MapPin aria-hidden size={22} strokeWidth={2.25} />
      </span>
      <span className="leading-tight">
        <span className="fp-brand-word block text-title lg:text-title-lg">FindPhone</span>
        <span className="hidden text-caption text-secondary lg:block">Locate · Ring · Stay connected</span>
      </span>
    </div>
  );
}
