import { useEffect } from 'react';
import type { ThemePreference } from '@/types';
import { useSettings } from './useApp';

/**
 * Applies the theme by toggling `.dark` on <html>. In 'system' mode it follows
 * the OS setting live, so changing it doesn't need a reload.
 */
export function useTheme(): ThemePreference {
  const { theme } = useSettings();

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', isDark);
    };

    apply();
    if (theme !== 'system') return undefined;

    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return theme;
}
