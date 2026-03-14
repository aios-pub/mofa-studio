/**
 * 主题 Hook
 */

import { useEffect, useCallback } from 'react';
import { useAppStore } from '../stores';
import type { ThemeMode } from '../types';

export function useTheme() {
  const { theme, setTheme } = useAppStore();

  // 应用主题
  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;

    if (mode === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    } else {
      root.classList.toggle('dark', mode === 'dark');
    }
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (_e: MediaQueryListEvent) => {
      applyTheme('system');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  // 初始化主题
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // 切换主题
  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(nextTheme);
  }, [theme, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: typeof window !== 'undefined' && document.documentElement.classList.contains('dark'),
  };
}
