/**
 * Theme提供者组件
 * 负责应用Theme、颜色预设、字体等设置
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
 * Theme提供者
 * - 管理明暗Theme切换
 * - 管理Theme color presets
 * - 管理Font size
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme: themeMode } = useTheme();
  const settings = useSettings();

  // 更新 HTML data attributes以支持Theme切换
  useEffect(() => {
    const root = window.document.documentElement;

    // 设置Theme mode
    root.setAttribute(HtmlDataAttribute.ThemeMode, themeMode);

    // 更新 class 以支持 Tailwind dark mode
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode]);

  // 动态更新Theme颜色 CSS 变量
  useEffect(() => {
    const root = window.document.documentElement;
    const colorPreset = themeColorPresetsMap[settings.themeColorPresets];

    if (colorPreset) {
      root.setAttribute(HtmlDataAttribute.ColorPalette, settings.themeColorPresets);

      // 更新 CSS 变量
      root.style.setProperty('--color-primary-lighter', colorPreset.lighter);
      root.style.setProperty('--color-primary-light', colorPreset.light);
      root.style.setProperty('--color-primary', colorPreset.default);
      root.style.setProperty('--color-primary-dark', colorPreset.dark);
      root.style.setProperty('--color-primary-darker', colorPreset.darker);
    }
  }, [settings.themeColorPresets]);

  // 更新Font size
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
