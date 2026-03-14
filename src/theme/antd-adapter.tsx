/**
 * Antd 主题适配器
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
}

export function AntdAdapter({ children }: AntdAdapterProps) {
  const { theme: themeMode, language } = useAppStore();
  const settings = useSettings();

  // 配置 dayjs 语言
  dayjs.locale(language === 'zh-CN' ? 'zh-cn' : 'en');

  // 根据主题模式选择算法
  const algorithm =
    themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;

  // 获取主题色
  const primaryColor = themeColorPresetsMap[settings.themeColorPresets].default;

  // antd 主题配置
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

  // 组件级别配置
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
