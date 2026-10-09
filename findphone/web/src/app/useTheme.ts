import { useEffect } from 'react';
import { usePrefersDark } from '../shared/hooks/useMediaQuery';
import { useApp } from './store';

/** Applies the theme preference to <html data-theme> and returns the resolved theme. */
export function useResolvedTheme(): 'dark' | 'light' {
  const pref = useApp((s) => s.settings.theme);
  const prefersDark = usePrefersDark();
  const resolved = pref === 'system' ? (prefersDark ? 'dark' : 'light') : pref;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--fp-bg-canvas').trim();
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = bg;
      meta.removeAttribute('media');
    }
  }, [resolved]);

  return resolved;
}
