import { Smartphone } from 'lucide-react';
import { cn } from '../../design-system/cn';

/** A stylised phone (no photo of the real device exists): screen glow, camera, phone glyph. */
export function DeviceIllustration({
  platform,
  size = 'lg',
  dim = false,
}: {
  platform: 'android' | 'ios' | null;
  size?: 'sm' | 'lg';
  dim?: boolean;
}) {
  return (
    <div
      aria-hidden
      data-platform={platform ?? undefined}
      className={cn('fp-phone shrink-0', size === 'lg' ? 'h-28 w-16' : 'h-12 w-7 rounded-md p-px', dim && 'opacity-60 grayscale')}
    >
      <div className="fp-phone__screen flex items-end justify-center pb-2">
        {size === 'lg' && <span className="fp-phone__camera" />}
        {size === 'lg' && <Smartphone size={16} strokeWidth={1.75} className="fp-phone__glyph" />}
      </div>
    </div>
  );
}
