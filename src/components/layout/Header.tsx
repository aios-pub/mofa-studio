/**
 * Header component
 */

import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Breadcrumb, Dropdown, Button, Space, Tooltip } from "antd";
import {
  HomeOutlined,
  SunOutlined,
  MoonOutlined,
  GlobalOutlined,
  SettingOutlined,
  SearchOutlined,
  MenuOutlined,
  DesktopOutlined,
} from "@ant-design/icons";
import type { MenuProps, BreadcrumbProps } from "antd";
import { useAppStore } from "../../stores";
import AccountDropdown from "./AccountDropdown";
import NotificationDropdown from "./NotificationDropdown";
import { useSettingsDrawer } from "./MainLayout";
import { SearchCommand } from "../common";


interface HeaderProps {
  showBreadcrumb?: boolean;
  /** Left slot - for logo or mobile nav button */
  leftSlot?: ReactNode;
}

export default function Header({
  showBreadcrumb = true,
  leftSlot,
}: HeaderProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme, language, setLanguage, toggleSidebar } =
    useAppStore();
  const { setSettingsOpen } = useSettingsDrawer();
  const [searchOpen, setSearchOpen] = useState(false);

  // Path mapping
  const pathMap: Record<string, string> = {
    conversation: t("nav.conversation"),
    management: t("nav.management"),
    agents: t("nav.agents"),
    prompts: t("nav.prompts"),
    skills: t("nav.skills"),
    "test-sets": t("nav.testSets"),
    providers: t("nav.providers"),
    tasks: t("nav.tasks"),
    analytics: t("nav.analytics"),
    monitoring: t("nav.monitoring"),
    organization: t("nav.organization"),
    users: t("nav.users"),
    departments: t("nav.departments"),
    system: t("nav.system"),
    resources: t("nav.resources"),
    "audit-logs": t("nav.auditLogs"),
    settings: t("nav.settings"),
    profile: t("nav.profile"),
    tracing: t("nav.tracing"),
    evaluation: t("nav.evaluation"),
    menu: t("nav.menu", "菜单管理"),
    role: t("nav.role", "角色管理"),
  };

  // Generate breadcrumbs from the path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbProps["items"] = [
      {
        title: (
          <a onClick={() => navigate("/")}>
            <HomeOutlined />
          </a>
        ),
      },
    ];

    paths.forEach((path, index) => {
      const label = pathMap[path] || path;
      const pathStr = "/" + paths.slice(0, index + 1).join("/");
      breadcrumbs.push({
        title:
          index === paths.length - 1 ? (
            label
          ) : (
            <a onClick={() => navigate(pathStr)}>{label}</a>
          ),
      });
    });

    return breadcrumbs;
  };

  // Language switch menu
  const languageMenu: MenuProps["items"] = [
    {
      key: "zh-CN",
      label: t("中文"),
      onClick: () => setLanguage("zh-CN"),
    },
    {
      key: "en-US",
      label: "English",
      onClick: () => setLanguage("en-US"),
    },
  ];

  // Theme switch menu
  const themeMenu: MenuProps["items"] = [
    {
      key: "light",
      label: (
        <Space>
          <SunOutlined />
          {t("theme.light")}
        </Space>
      ),
      onClick: () => setTheme("light"),
    },
    {
      key: "dark",
      label: (
        <Space>
          <MoonOutlined />
          {t("theme.dark")}
        </Space>
      ),
      onClick: () => setTheme("dark"),
    },
    {
      key: "system",
      label: (
        <Space>
          <DesktopOutlined />
          {t("theme.system", "跟随系统")}
        </Space>
      ),
      onClick: () => setTheme("system"),
    },
  ];

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <SunOutlined />;
      case "dark":
        return <MoonOutlined />;
      case "system":
        return <DesktopOutlined />;
      default:
        return <SunOutlined />;
    }
  };

  return (
    <header
      className="
        sticky top-0 z-[var(--z-sticky)]
        flex items-center justify-between px-4
        h-14
        bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl
        border-b border-[var(--color-border)]
        transition-all duration-200
      "
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Left slot - for logo or other content */}
        {leftSlot}

        {/* Sidebar toggle — the single collapse control at every width */}
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={toggleSidebar}
        />

        {/* Breadcrumb */}
        {showBreadcrumb && (
          <Breadcrumb items={getBreadcrumbs()} className="hidden" />
        )}
      </div>

      {/* Inert middle area doubles as a window-drag region (CustomTitlebar) */}
      <div data-window-drag-region className="flex-1 self-stretch" />

      {/* Right toolbar */}
      <div className="flex items-center gap-1 pr-1">
        {/* Search button */}
        <Tooltip title={`${t("common.search", "搜索")} (Ctrl+K)`}>
          <Button
            type="text"
            icon={<SearchOutlined />}
            onClick={() => setSearchOpen(true)}
            className="rounded-full hover:bg-[var(--color-action-hover)]"
          />
        </Tooltip>

        {/* Notification button */}
        <NotificationDropdown />

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

        {/* Language switching */}
        <Dropdown
          menu={{ items: languageMenu, selectedKeys: [language] }}
          trigger={["click"]}
        >
          <Button
            type="text"
            icon={<GlobalOutlined />}
            className="rounded-full hover:bg-[var(--color-action-hover)]"
          />
        </Dropdown>

        {/* Theme switching */}
        <Dropdown
          menu={{ items: themeMenu, selectedKeys: [theme] }}
          trigger={["click"]}
        >
          <Button
            type="text"
            icon={getThemeIcon()}
            className="rounded-full hover:bg-[var(--color-action-hover)]"
          />
        </Dropdown>

        {/* Settings button */}
        <Tooltip title={t("common.settings", "设置")}>
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => setSettingsOpen(true)}
            className="rounded-full hover:bg-[var(--color-action-hover)]"
          />
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

        {/* Account dropdown */}
        <AccountDropdown />
      </div>

      {/* Search command palette */}
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
