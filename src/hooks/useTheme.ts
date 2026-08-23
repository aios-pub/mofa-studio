/**
 * Theme Hook
 */

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../stores';
import type { ThemeMode } from '../types';

export function useTheme() {
  const { theme, setTheme } = useAppStore();
  const [isDark, setIsDark] = useState(false);

  // 获取实际的Theme mode
  const getActualTheme = useCallback((mode: ThemeMode): 'light' | 'dark' => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  }, []);

  // 应用Theme
  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    const actualTheme = getActualTheme(mode);
    const dark = actualTheme === 'dark';

    root.classList.toggle('dark', dark);
    setIsDark(dark);
  }, [getActualTheme]);

  // 监听系统Theme变化
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      applyTheme('system');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  // 初始化Theme
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // 切换Theme
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
