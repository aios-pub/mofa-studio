/**
 * Settings drawer component
 */

import { useTranslation } from "react-i18next";
import { Drawer, Switch, Slider, Button, Card, Tooltip, Space } from "antd";
import {
  CheckOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
  QuestionCircleOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useState, useEffect, type CSSProperties } from "react";
import {
  useSettings,
  useSettingActions,
  themeColorPresetsMap,
  type ThemeColorPresets,
  type ThemeLayout,
} from "../../stores/useSettingStore";
import { useAppStore } from "../../stores";

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

  // Toggle fullscreen
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
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const colorOptions: { value: ThemeColorPresets; color: string }[] = [
    { value: "default", color: themeColorPresetsMap.default.default },
    { value: "cyan", color: themeColorPresetsMap.cyan.default },
    { value: "purple", color: themeColorPresetsMap.purple.default },
    { value: "blue", color: themeColorPresetsMap.blue.default },
    { value: "orange", color: themeColorPresetsMap.orange.default },
    { value: "red", color: themeColorPresetsMap.red.default },
  ];

  const handleColorChange = (color: ThemeColorPresets) => {
    setSettings({ ...settings, themeColorPresets: color });
    // Update CSS variables
    const root = document.documentElement;
    const colors = themeColorPresetsMap[color];
    root.style.setProperty("--color-primary", colors.default);
    root.style.setProperty("--color-primary-light", colors.light);
  };

  const handleLayoutChange = (layout: ThemeLayout) => {
    setSettings({ ...settings, themeLayout: layout });
  };

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  // Layout background color
  const getLayoutBg = (layout: ThemeLayout) => {
    return settings.themeLayout === layout
      ? themeColorPresetsMap[settings.themeColorPresets].default
      : "#919EAB";
  };

  // Theme color
  const primaryColor = themeColorPresetsMap[settings.themeColorPresets].default;

  // Drawer content background style - blur effect
  const drawerContentStyle: CSSProperties = {
    backdropFilter: "blur(20px)",
  };

  return (
    <Drawer
      title={
        <span className="text-base font-semibold">
          {t("settings.title", "系统设置")}
        </span>
      }
      placement="right"
      onClose={onClose}
      open={open}
      size={{ width: 340 }}
      className="settings-drawer"
      styles={{
        body: { padding: 0 },
        header: {
          padding: "16px 24px",
          borderBottom: "1px solid var(--color-border)",
        },
        footer: {
          padding: "16px 24px",
          borderTop: "1px solid var(--color-border)",
        },
      }}
      footer={
        <div className="space-y-3">
          <Button
            block
            onClick={toggleFullScreen}
            icon={
              isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />
            }
            className="h-10 border-dashed hover:!border-(--color-primary) hover:!text-[var(--color-primary)]"
          >
            {isFullscreen
              ? t("settings.exitFullscreen", "退出全屏")
              : t("settings.fullscreen", "全屏模式")}
          </Button>
          <Button block onClick={resetSettings} icon={<UndoOutlined />}>
            {t("settings.reset", "恢复默认设置")}
          </Button>
        </div>
      }
    >
      <div
        className="h-full overflow-y-auto scrollbar-thin"
        style={drawerContentStyle}
      >
        <div className="flex flex-col gap-6 p-6">
          {/* Theme mode */}
          <section className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
              {t("settings.mode", "主题模式")}
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <Card
                hoverable
                className={`
                  cursor-pointer text-center py-4 transition-all duration-200
                  ${theme === "light" ? "!border-2" : "!border"}
                `}
                style={{
                  borderColor: theme === "light" ? primaryColor : undefined,
                  boxShadow:
                    theme === "light" ? `0 0 0 1px ${primaryColor}` : undefined,
                }}
                onClick={() => setTheme("light")}
                styles={{ body: { padding: "8px" } }}
              >
                <SunOutlined
                  className="text-xl mb-2 transition-colors"
                  style={{
                    color:
                      theme === "light"
                        ? primaryColor
                        : "var(--color-text-tertiary)",
                  }}
                />
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {t("theme.light", "浅色")}
                </div>
              </Card>
              <Card
                hoverable
                className={`
                  cursor-pointer text-center py-4 transition-all duration-200
                  ${theme === "dark" ? "!border-2" : "!border"}
                `}
                style={{
                  borderColor: theme === "dark" ? primaryColor : undefined,
                  boxShadow:
                    theme === "dark" ? `0 0 0 1px ${primaryColor}` : undefined,
                }}
                onClick={() => setTheme("dark")}
                styles={{ body: { padding: "8px" } }}
              >
                <MoonOutlined
                  className="text-xl mb-2 transition-colors"
                  style={{
                    color:
                      theme === "dark"
                        ? primaryColor
                        : "var(--color-text-tertiary)",
                  }}
                />
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {t("theme.dark", "深色")}
                </div>
              </Card>
              <Card
                hoverable
                className={`
                  cursor-pointer text-center py-4 transition-all duration-200
                  ${theme === "system" ? "!border-2" : "!border"}
                `}
                style={{
                  borderColor: theme === "system" ? primaryColor : undefined,
                  boxShadow:
                    theme === "system"
                      ? `0 0 0 1px ${primaryColor}`
                      : undefined,
                }}
                onClick={() => setTheme("system")}
                styles={{ body: { padding: "8px" } }}
              >
                <DesktopOutlined
                  className="text-xl mb-2 transition-colors"
                  style={{
                    color:
                      theme === "system"
                        ? primaryColor
                        : "var(--color-text-tertiary)",
                  }}
                />
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {t("theme.system", "系统")}
                </div>
              </Card>
            </div>
          </section>

          {/* Layout mode */}
          <section className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
              {t("settings.layout", "布局模式")}
            </h4>

            <div className="grid grid-cols-3 gap-3">
              {/* Vertical layout */}
              <Card
                hoverable
                className={`cursor-pointer p-2 transition-all duration-200 ${
                  settings.themeLayout === "vertical" ? "!border-2" : "!border"
                }`}
                style={{
                  borderColor:
                    settings.themeLayout === "vertical"
                      ? primaryColor
                      : undefined,
                  boxShadow:
                    settings.themeLayout === "vertical"
                      ? `0 0 0 1px ${primaryColor}`
                      : undefined,
                }}
                onClick={() => handleLayoutChange("vertical")}
              >
                <div className="flex h-14 gap-1">
                  <div className="flex flex-col w-5 gap-0.5 p-1">
                    <div
                      className="w-2 h-2 rounded-sm"
                      style={{ background: getLayoutBg("vertical") }}
                    />
                    <div
                      className="w-full h-1 rounded-sm opacity-50"
                      style={{ background: getLayoutBg("vertical") }}
                    />
                    <div
                      className="w-3 h-1 rounded-sm opacity-20"
                      style={{ background: getLayoutBg("vertical") }}
                    />
                  </div>
                  <div className="flex flex-col flex-1 gap-0.5 p-1">
                    <div
                      className="w-full h-1.5 rounded-sm opacity-20"
                      style={{ background: getLayoutBg("vertical") }}
                    />
                    <div
                      className={`flex-1 rounded-sm opacity-20 transition-all duration-300 ${!settings.themeStretch ? "w-10 mx-auto" : ""}`}
                      style={{ background: getLayoutBg("vertical") }}
                    />
                  </div>
                </div>
              </Card>

              {/* Mini layout */}
              <Card
                hoverable
                className={`cursor-pointer p-2 transition-all duration-200 ${
                  settings.themeLayout === "mini" ? "!border-2" : "!border"
                }`}
                style={{
                  borderColor:
                    settings.themeLayout === "mini" ? primaryColor : undefined,
                  boxShadow:
                    settings.themeLayout === "mini"
                      ? `0 0 0 1px ${primaryColor}`
                      : undefined,
                }}
                onClick={() => handleLayoutChange("mini")}
              >
                <div className="flex h-14 gap-0">
                  <div className="flex flex-col w-3 gap-0.5 p-1 items-center">
                    <div
                      className="w-2 h-2 rounded-sm"
                      style={{ background: getLayoutBg("mini") }}
                    />
                    <div
                      className="w-full h-1 rounded-sm opacity-50"
                      style={{ background: getLayoutBg("mini") }}
                    />
                    <div
                      className="w-full h-1 rounded-sm opacity-20"
                      style={{ background: getLayoutBg("mini") }}
                    />
                  </div>
                  <div className="flex flex-col flex-1 gap-0.5 p-1">
                    <div
                      className="w-full h-1.5 rounded-sm opacity-20"
                      style={{ background: getLayoutBg("mini") }}
                    />
                    <div
                      className={`flex-1 rounded-sm opacity-20 transition-all duration-300 ${!settings.themeStretch ? "w-10 mx-auto" : ""}`}
                      style={{ background: getLayoutBg("mini") }}
                    />
                  </div>
                </div>
              </Card>

              {/* Horizontal layout */}
              <Card
                hoverable
                className={`cursor-pointer p-2 transition-all duration-200 ${
                  settings.themeLayout === "horizontal"
                    ? "!border-2"
                    : "!border"
                }`}
                style={{
                  borderColor:
                    settings.themeLayout === "horizontal"
                      ? primaryColor
                      : undefined,
                  boxShadow:
                    settings.themeLayout === "horizontal"
                      ? `0 0 0 1px ${primaryColor}`
                      : undefined,
                }}
                onClick={() => handleLayoutChange("horizontal")}
              >
                <div className="flex flex-col h-14 gap-0">
                  <div className="flex items-center gap-1 p-1">
                    <div
                      className="w-2 h-2 rounded-sm"
                      style={{ background: getLayoutBg("horizontal") }}
                    />
                    <div
                      className="w-4 h-1 rounded-sm opacity-50"
                      style={{ background: getLayoutBg("horizontal") }}
                    />
                    <div
                      className="w-3 h-1 rounded-sm opacity-20"
                      style={{ background: getLayoutBg("horizontal") }}
                    />
                  </div>
                  <div
                    className="w-full h-1.5 rounded-sm opacity-20 mx-1"
                    style={{ background: getLayoutBg("horizontal") }}
                  />
                  <div
                    className={`flex-1 rounded-sm opacity-20 m-1 transition-all duration-300 ${!settings.themeStretch ? "w-10 mx-auto" : ""}`}
                    style={{ background: getLayoutBg("horizontal") }}
                  />
                </div>
              </Card>
            </div>

            {/* Content stretch */}
            <div className="flex items-center justify-between">
              <Space size={4}>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t("settings.stretch", "内容拉伸")}
                </span>
                <Tooltip
                  title={t("settings.stretchTip", "拉伸内容以填充整个页面宽度")}
                >
                  <QuestionCircleOutlined className="text-[var(--color-text-tertiary)] cursor-help" />
                </Tooltip>
              </Space>
              <Switch
                checked={settings.themeStretch}
                onChange={() => handleToggle("themeStretch")}
              />
            </div>
          </section>

          {/* Theme colors */}
          <section className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
              {t("settings.presetThemes", "预设主题")}
            </h4>
            <div className="flex flex-wrap gap-1">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleColorChange(option.value)}
                  className={`
                    relative flex cursor-pointer items-center justify-center rounded
                    transition-all duration-300 ease-in-out
                    ${settings.themeColorPresets === option.value ? "w-12 h-12" : "w-5 h-12"}
                  `}
                  style={{ backgroundColor: option.color }}
                  title={
                    option.value.charAt(0).toUpperCase() + option.value.slice(1)
                  }
                >
                  <div
                    className={`
                      w-full h-full flex items-center justify-center rounded
                      transition-all duration-300
                      ${settings.themeColorPresets === option.value ? "bg-white/30" : "hover:bg-white/20"}
                    `}
                  >
                    {settings.themeColorPresets === option.value && (
                      <CheckOutlined className="text-white text-lg" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Font size */}
          <section className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
              {t("settings.fontSize", "字体大小")}
            </h4>
            <div className="flex items-center gap-4">
              <Slider
                min={12}
                max={20}
                value={settings.fontSize}
                onChange={(value) =>
                  setSettings({ ...settings, fontSize: value })
                }
                className="flex-1"
                tooltip={{ formatter: (value) => `${value}px` }}
              />
              <span className="text-sm font-medium text-[var(--color-text-secondary)] w-12 text-right">
                {settings.fontSize}px
              </span>
            </div>
          </section>

          {/* Page configuration */}
          <section className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] m-0">
              {t("settings.page", "页面配置")}
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t("settings.breadcrumb", "面包屑")}
                </span>
                <Switch
                  checked={settings.breadCrumb}
                  onChange={() => handleToggle("breadCrumb")}
                  size="small"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t("settings.multiTab", "多标签页")}
                </span>
                <Switch
                  checked={settings.multiTab}
                  onChange={() => handleToggle("multiTab")}
                  size="small"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t("settings.darkSidebar", "深色侧边栏")}
                </span>
                <Switch
                  checked={settings.darkSidebar}
                  onChange={() => handleToggle("darkSidebar")}
                  size="small"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t("settings.accordion", "手风琴菜单")}
                </span>
                <Switch
                  checked={settings.accordion}
                  onChange={() => handleToggle("accordion")}
                  size="small"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </Drawer>
  );
}
