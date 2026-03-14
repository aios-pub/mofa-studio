/**
 * 设置抽屉组件
 */

import { useTranslation } from 'react-i18next';
import { Drawer, Switch, Slider, Button, Divider, Card, Tooltip } from 'antd';
import {
  CheckOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  BgColorsOutlined,
  LayoutOutlined,
  FontSizeOutlined,
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useSettings, useSettingActions, themeColorPresetsMap, type ThemeColorPresets, type ThemeLayout } from '../../stores/useSettingStore';
import { useAppStore } from '../../stores';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const { t } = useTranslation();
  const settings = useSettings();
  const { setSettings, resetSettings } = useSettingActions();
  const { theme, setTheme } = useAppStore();

  const [isFullscreen, setIsFullscreen] = useState(false);

  // 全屏切换
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const colorOptions: { value: ThemeColorPresets; color: string }[] = [
    { value: 'default', color: themeColorPresetsMap.default.default },
    { value: 'cyan', color: themeColorPresetsMap.cyan.default },
    { value: 'purple', color: themeColorPresetsMap.purple.default },
    { value: 'blue', color: themeColorPresetsMap.blue.default },
    { value: 'orange', color: themeColorPresetsMap.orange.default },
    { value: 'red', color: themeColorPresetsMap.red.default },
  ];

  const handleColorChange = (color: ThemeColorPresets) => {
    setSettings({ ...settings, themeColorPresets: color });
    // 更新 CSS 变量
    const root = document.documentElement;
    const colors = themeColorPresetsMap[color];
    root.style.setProperty('--color-primary', colors.default);
    root.style.setProperty('--color-primary-light', colors.light);
  };

  const handleLayoutChange = (layout: ThemeLayout) => {
    setSettings({ ...settings, themeLayout: layout });
  };

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  // 布局背景色
  const getLayoutBg = (layout: ThemeLayout) => {
    return settings.themeLayout === layout
      ? themeColorPresetsMap[settings.themeColorPresets].default
      : '#919EAB';
  };

  return (
    <Drawer
      title={t('settings.title')}
      placement="right"
      onClose={onClose}
      open={open}
      width={320}
      className="settings-drawer"
      footer={
        <Button
          block
          onClick={toggleFullScreen}
          icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        >
          {isFullscreen
            ? t('settings.exitFullscreen', '退出全屏')
            : t('settings.fullscreen', '全屏模式')}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* 主题模式 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            {theme === 'light' ? (
              <SunOutlined className="text-[var(--color-text-secondary)]" />
            ) : theme === 'dark' ? (
              <MoonOutlined className="text-[var(--color-text-secondary)]" />
            ) : (
              <DesktopOutlined className="text-[var(--color-text-secondary)]" />
            )}
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('settings.themeMode', '主题模式')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Card
              hoverable
              size="small"
              className={`cursor-pointer text-center py-3 ${theme === 'light' ? 'border-2' : ''}`}
              style={{ borderColor: theme === 'light' ? themeColorPresetsMap[settings.themeColorPresets].default : undefined }}
              onClick={() => setTheme('light')}
            >
              <SunOutlined className="text-lg mx-auto mb-1" style={{ color: theme === 'light' ? themeColorPresetsMap[settings.themeColorPresets].default : undefined }} />
              <span className="text-xs">{t('theme.light', '浅色')}</span>
            </Card>
            <Card
              hoverable
              size="small"
              className={`cursor-pointer text-center py-3 ${theme === 'dark' ? 'border-2' : ''}`}
              style={{ borderColor: theme === 'dark' ? themeColorPresetsMap[settings.themeColorPresets].default : undefined }}
              onClick={() => setTheme('dark')}
            >
              <MoonOutlined className="text-lg mx-auto mb-1" style={{ color: theme === 'dark' ? themeColorPresetsMap[settings.themeColorPresets].default : undefined }} />
              <span className="text-xs">{t('theme.dark', '深色')}</span>
            </Card>
            <Card
              hoverable
              size="small"
              className={`cursor-pointer text-center py-3 ${theme === 'system' ? 'border-2' : ''}`}
              style={{ borderColor: theme === 'system' ? themeColorPresetsMap[settings.themeColorPresets].default : undefined }}
              onClick={() => setTheme('system')}
            >
              <DesktopOutlined className="text-lg mx-auto mb-1" style={{ color: theme === 'system' ? themeColorPresetsMap[settings.themeColorPresets].default : undefined }} />
              <span className="text-xs">{t('theme.system', '系统')}</span>
            </Card>
          </div>
        </div>

        <Divider />

        {/* 布局模式 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <LayoutOutlined className="text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('settings.layout', '布局模式')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* 垂直布局 */}
            <Card
              hoverable
              className={`cursor-pointer p-2 ${settings.themeLayout === 'vertical' ? 'border-primary border-2' : ''}`}
              onClick={() => handleLayoutChange('vertical')}
            >
              <div className="flex h-12 gap-1">
                <div className="flex flex-col w-5 gap-0.5 p-0.5">
                  <div className="w-2 h-2 rounded-sm" style={{ background: getLayoutBg('vertical') }} />
                  <div className="w-full h-1 rounded-sm opacity-50" style={{ background: getLayoutBg('vertical') }} />
                  <div className="w-3 h-1 rounded-sm opacity-20" style={{ background: getLayoutBg('vertical') }} />
                </div>
                <div className="flex flex-col flex-1 gap-0.5 p-0.5">
                  <div className="w-full h-1 rounded-sm opacity-20" style={{ background: getLayoutBg('vertical') }} />
                  <div className={`flex-1 rounded-sm opacity-20 ${!settings.themeStretch && 'w-8 mx-auto'}`} style={{ background: getLayoutBg('vertical') }} />
                </div>
              </div>
            </Card>

            {/* 迷你布局 */}
            <Card
              hoverable
              className={`cursor-pointer p-2 ${settings.themeLayout === 'mini' ? 'border-primary border-2' : ''}`}
              onClick={() => handleLayoutChange('mini')}
            >
              <div className="flex h-12 gap-0">
                <div className="flex flex-col w-3 gap-0.5 p-0.5 items-center">
                  <div className="w-2 h-2 rounded-sm" style={{ background: getLayoutBg('mini') }} />
                  <div className="w-full h-1 rounded-sm opacity-50" style={{ background: getLayoutBg('mini') }} />
                  <div className="w-full h-1 rounded-sm opacity-20" style={{ background: getLayoutBg('mini') }} />
                </div>
                <div className="flex flex-col flex-1 gap-0.5 p-0.5">
                  <div className="w-full h-1 rounded-sm opacity-20" style={{ background: getLayoutBg('mini') }} />
                  <div className={`flex-1 rounded-sm opacity-20 ${!settings.themeStretch && 'w-8 mx-auto'}`} style={{ background: getLayoutBg('mini') }} />
                </div>
              </div>
            </Card>

            {/* 水平布局 */}
            <Card
              hoverable
              className={`cursor-pointer p-2 ${settings.themeLayout === 'horizontal' ? 'border-primary border-2' : ''}`}
              onClick={() => handleLayoutChange('horizontal')}
            >
              <div className="flex flex-col h-12 gap-0">
                <div className="flex items-center gap-1 p-0.5">
                  <div className="w-2 h-2 rounded-sm" style={{ background: getLayoutBg('horizontal') }} />
                  <div className="w-4 h-1 rounded-sm opacity-50" style={{ background: getLayoutBg('horizontal') }} />
                  <div className="w-3 h-1 rounded-sm opacity-20" style={{ background: getLayoutBg('horizontal') }} />
                </div>
                <div className="w-full h-1 rounded-sm opacity-20 mx-1" style={{ background: getLayoutBg('horizontal') }} />
                <div className={`flex-1 rounded-sm opacity-20 m-1 ${!settings.themeStretch && 'w-8 mx-auto'}`} style={{ background: getLayoutBg('horizontal') }} />
              </div>
            </Card>
          </div>

          {/* 内容拉伸 */}
          <div className="flex items-center justify-between mt-3">
            <Tooltip title={t('settings.stretchTip', '拉伸内容以填充整个页面宽度')}>
              <span className="text-sm text-[var(--color-text-secondary)] cursor-help">
                {t('settings.stretch', '内容拉伸')}
              </span>
            </Tooltip>
            <Switch
              checked={settings.themeStretch}
              onChange={() => handleToggle('themeStretch')}
            />
          </div>
        </div>

        <Divider />

        {/* 主题颜色 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BgColorsOutlined className="text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('settings.themeColor', '主题颜色')}
            </span>
          </div>
          <div className="flex gap-1">
            {colorOptions.map((option) => (
              <Tooltip key={option.value} title={option.value.charAt(0).toUpperCase() + option.value.slice(1)}>
                <button
                  onClick={() => handleColorChange(option.value)}
                  className={`relative flex h-10 w-6 cursor-pointer items-center justify-center rounded transition-all duration-300 ${
                    settings.themeColorPresets === option.value ? 'w-10' : ''
                  }`}
                  style={{ backgroundColor: option.color }}
                >
                  <div
                    className={`w-full h-full flex items-center justify-center rounded transition-all ${
                      settings.themeColorPresets === option.value ? 'bg-white/30' : 'hover:bg-white/20'
                    }`}
                  >
                    {settings.themeColorPresets === option.value && (
                      <CheckOutlined className="text-white text-base" />
                    )}
                  </div>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        <Divider />

        {/* 字体大小 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FontSizeOutlined className="text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('settings.fontSize', '字体大小')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              min={12}
              max={20}
              value={settings.fontSize}
              onChange={(value) => setSettings({ ...settings, fontSize: value })}
              className="flex-1"
            />
            <span className="text-sm text-[var(--color-text-secondary)] w-10 text-right">
              {settings.fontSize}px
            </span>
          </div>
        </div>

        <Divider />

        {/* 页面配置 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <LayoutOutlined className="text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('settings.pageConfig', '页面配置')}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {t('settings.breadcrumb', '面包屑')}
              </span>
              <Switch
                checked={settings.breadCrumb}
                onChange={() => handleToggle('breadCrumb')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {t('settings.multiTab', '多标签页')}
              </span>
              <Switch
                checked={settings.multiTab}
                onChange={() => handleToggle('multiTab')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {t('settings.darkSidebar', '深色侧边栏')}
              </span>
              <Switch
                checked={settings.darkSidebar}
                onChange={() => handleToggle('darkSidebar')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {t('settings.accordion', '手风琴菜单')}
              </span>
              <Switch
                checked={settings.accordion}
                onChange={() => handleToggle('accordion')}
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* 重置按钮 */}
        <Button
          block
          onClick={resetSettings}
        >
          {t('settings.reset', '恢复默认设置')}
        </Button>
      </div>
    </Drawer>
  );
}
