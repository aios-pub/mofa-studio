/**
 * Antd theme adapter
 */

import { StyleProvider } from '@ant-design/cssinjs';
import { App, ConfigProvider, theme } from 'antd';
import type { ThemeConfig } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useAppStore, useSettings } from '../stores';
import { themeColorPresetsMap } from '../stores/useSettingStore';

interface AntdAdapterProps {
  children: React.ReactNode;
  mode?: 'light' | 'dark' | 'system';
}

export function AntdAdapter({ children, mode }: AntdAdapterProps) {
  const { language } = useAppStore();
  const settings = useSettings();

  // Determine the actual theme mode
  const themeMode = mode || 'light';

  // Configure dayjs locale
  dayjs.locale(language === 'zh-CN' ? 'zh-cn' : 'en');

  // Choose algorithm by theme mode
  const algorithm =
    themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;

  // Get theme color
  const primaryColor = themeColorPresetsMap[settings.themeColorPresets].default;

  // antd theme configuration
  const token: ThemeConfig['token'] = {
    colorPrimary: primaryColor,
    colorPrimaryBg: themeColorPresetsMap[settings.themeColorPresets].lighter,
    colorPrimaryBgHover: themeColorPresetsMap[settings.themeColorPresets].light,
    colorPrimaryBorder: themeColorPresetsMap[settings.themeColorPresets].light,
    colorPrimaryBorderHover: themeColorPresetsMap[settings.themeColorPresets].default,
    colorPrimaryHover: themeColorPresetsMap[settings.themeColorPresets].light,
    colorPrimaryActive: themeColorPresetsMap[settings.themeColorPresets].dark,
    colorPrimaryTextHover: themeColorPresetsMap[settings.themeColorPresets].light,
    colorPrimaryText: themeColorPresetsMap[settings.themeColorPresets].dark,
    colorPrimaryTextActive: themeColorPresetsMap[settings.themeColorPresets].darker,
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#06b6d4',
    fontSize: settings.fontSize,
    borderRadius: 6,
    wireframe: false,
  };

  // Component-level configuration
  const components: ThemeConfig['components'] = {
    Menu: {
      itemBorderRadius: 6,
      subMenuItemBorderRadius: 6,
      darkItemBg: '#001529',
      darkItemSelectedBg: primaryColor,
    },
    Layout: {
      siderBg: '#001529',
    },
    Button: {
      borderRadius: 6,
      primaryColor: '#fff',
    },
    Card: {
      borderRadius: 8,
    },
    Modal: {
      borderRadius: 8,
    },
    Drawer: {
      borderRadius: 0,
    },
  };

  return (
    <ConfigProvider
      locale={language === 'zh-CN' ? zhCN : enUS}
      theme={{
        algorithm,
        token,
        components,
      }}
    >
      <StyleProvider hashPriority="high">
        <App>{children}</App>
      </StyleProvider>
    </ConfigProvider>
  );
}
