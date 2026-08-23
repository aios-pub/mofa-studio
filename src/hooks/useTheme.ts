/**
 * Theme Hook
 */

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../stores';
import type { ThemeMode } from '../types';

export function useTheme() {
  const { theme, setTheme } = useAppStore();
  const [isDark, setIsDark] = useState(false);

  // Get the actual theme mode
  const getActualTheme = useCallback((mode: ThemeMode): 'light' | 'dark' => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }, []);

  // Apply theme
  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    const actualTheme = getActualTheme(mode);
    const dark = actualTheme === 'dark';

    root.classList.toggle('dark', dark);
    setIsDark(dark);
  }, [getActualTheme]);

  // Watch system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      applyTheme('system');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  // Initialize theme
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Switch theme
  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(nextTheme);
  }, [theme, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
  };
}
