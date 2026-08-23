/**
 * Theme provider component
 * Responsible for applying theme, color presets, fonts, etc.
 */

import { useEffect, type ReactNode } from 'react';
import { useSettings } from '@/stores/useSettingStore';
import { useTheme } from '@/hooks';
import { HtmlDataAttribute } from '@/config';
import { themeColorPresetsMap } from '@/stores/useSettingStore';
import { AntdAdapter } from './antd-adapter';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme provider
 * - Manage light/dark theme switching
 * - Manage theme color presets
 * - Manage font size
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme: themeMode } = useTheme();
  const settings = useSettings();

  // Update HTML data attributes to support theme switching
  useEffect(() => {
    const root = window.document.documentElement;

    // Set theme mode
    root.setAttribute(HtmlDataAttribute.ThemeMode, themeMode);

    // Update class to support Tailwind dark mode
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode]);

  // Dynamically update theme color CSS variables
  useEffect(() => {
    const root = window.document.documentElement;
    const colorPreset = themeColorPresetsMap[settings.themeColorPresets];

    if (colorPreset) {
      root.setAttribute(HtmlDataAttribute.ColorPalette, settings.themeColorPresets);

      // Update CSS variables
      root.style.setProperty('--color-primary-lighter', colorPreset.lighter);
      root.style.setProperty('--color-primary-light', colorPreset.light);
      root.style.setProperty('--color-primary', colorPreset.default);
      root.style.setProperty('--color-primary-dark', colorPreset.dark);
      root.style.setProperty('--color-primary-darker', colorPreset.darker);
    }
  }, [settings.themeColorPresets]);

  // Update font size
  useEffect(() => {
    const root = window.document.documentElement;
    root.style.fontSize = `${settings.fontSize}px`;
  }, [settings.fontSize]);

  return (
    <AntdAdapter mode={themeMode}>
      {children}
    </AntdAdapter>
  );
}

export default ThemeProvider;
