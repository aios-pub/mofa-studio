/**
 * 头部组件
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumb, Dropdown, Button, Space, Tooltip } from 'antd';
import {
  HomeOutlined,
  SunOutlined,
  MoonOutlined,
  GlobalOutlined,
  SettingOutlined,
  BellOutlined,
  SearchOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import type { MenuProps, BreadcrumbProps } from 'antd';
import { useAppStore } from '../../stores';
import AccountDropdown from './AccountDropdown';
import { useSettingsDrawer } from './MainLayout';
import { SearchCommand } from '../common';

interface HeaderProps {
  showBreadcrumb?: boolean;
}

export default function Header({ showBreadcrumb = true }: HeaderProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme, language, setLanguage, toggleSidebar } = useAppStore();
  const { setSettingsOpen } = useSettingsDrawer();
  const [searchOpen, setSearchOpen] = useState(false);

  // 路径映射
  const pathMap: Record<string, string> = {
    conversation: t('nav.conversation'),
    management: t('nav.management'),
    agents: t('nav.agents'),
    prompts: t('nav.prompts'),
    skills: t('nav.skills'),
    'test-sets': t('nav.testSets'),
    providers: t('nav.providers'),
    tasks: t('nav.tasks'),
    analytics: t('nav.analytics'),
    monitoring: t('nav.monitoring'),
    organization: t('nav.organization'),
    users: t('nav.users'),
    departments: t('nav.departments'),
    system: t('nav.system'),
    resources: t('nav.resources'),
    'audit-logs': t('nav.auditLogs'),
    settings: t('nav.settings'),
    profile: t('nav.profile'),
    tracing: t('nav.tracing'),
    evaluation: t('nav.evaluation'),
  };

  // 根据路径生成面包屑
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbProps['items'] = [
      {
        title: (
          <a onClick={() => navigate('/')}>
            <HomeOutlined />
          </a>
        ),
      },
    ];

    paths.forEach((path, index) => {
      const label = pathMap[path] || path;
      const pathStr = '/' + paths.slice(0, index + 1).join('/');
      breadcrumbs.push({
        title: index === paths.length - 1 ? label : <a onClick={() => navigate(pathStr)}>{label}</a>,
      });
    });

    return breadcrumbs;
  };

  // 语言切换菜单
  const languageMenu: MenuProps['items'] = [
    {
      key: 'zh-CN',
      label: '中文',
      onClick: () => setLanguage('zh-CN'),
    },
    {
      key: 'en-US',
      label: 'English',
      onClick: () => setLanguage('en-US'),
    },
  ];

  // 主题切换菜单
  const themeMenu: MenuProps['items'] = [
    {
      key: 'light',
      label: (
        <Space>
          <SunOutlined />
          {t('theme.light')}
        </Space>
      ),
      onClick: () => setTheme('light'),
    },
    {
      key: 'dark',
      label: (
        <Space>
          <MoonOutlined />
          {t('theme.dark')}
        </Space>
      ),
      onClick: () => setTheme('dark'),
    },
    {
      key: 'system',
      label: (
        <Space>
          <GlobalOutlined />
          {t('theme.system', '跟随系统')}
        </Space>
      ),
      onClick: () => setTheme('system'),
    },
  ];

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunOutlined />;
      case 'dark':
        return <MoonOutlined />;
      case 'system':
        return <GlobalOutlined />;
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
      {/* 左侧 */}
      <div className="flex items-center gap-4">
        {/* 移动端菜单按钮 */}
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={toggleSidebar}
          className="lg:hidden"
        />

        {/* 面包屑 */}
        {showBreadcrumb && <Breadcrumb items={getBreadcrumbs()} className="hidden md:flex" />}
      </div>

      {/* 右侧工具栏 */}
      <div className="flex items-center gap-1">
        {/* 搜索按钮 */}
        <Tooltip title={`${t('common.search', '搜索')} (Ctrl+K)`}>
          <Button
            type="text"
            icon={<SearchOutlined />}
            onClick={() => setSearchOpen(true)}
            className="rounded-full hover:bg-[var(--color-action-hover)]"
          />
        </Tooltip>

        {/* 通知按钮 */}
        <Tooltip title={t('common.notifications', '通知')}>
          <Button
            type="text"
            className="rounded-full hover:bg-[var(--color-action-hover)]"
            icon={
              <div className="relative">
                <BellOutlined />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--color-error)] rounded-full animate-pulse" />
              </div>
            }
          />
        </Tooltip>

        {/* 分隔线 */}
        <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

        {/* 语言切换 */}
        <Dropdown menu={{ items: languageMenu, selectedKeys: [language] }} trigger={['click']}>
          <Button
            type="text"
            icon={<GlobalOutlined />}
            className="rounded-full hover:bg-[var(--color-action-hover)]"
          />
        </Dropdown>

        {/* 主题切换 */}
        <Dropdown menu={{ items: themeMenu, selectedKeys: [theme] }} trigger={['click']}>
          <Button
            type="text"
            icon={getThemeIcon()}
            className="rounded-full hover:bg-[var(--color-action-hover)]"
          />
        </Dropdown>

        {/* 设置按钮 */}
        <Tooltip title={t('common.settings', '设置')}>
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => setSettingsOpen(true)}
            className="rounded-full hover:bg-[var(--color-action-hover)]"
          />
        </Tooltip>

        {/* 分隔线 */}
        <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

        {/* 账户下拉 */}
        <AccountDropdown />
      </div>

      {/* 搜索命令面板 */}
      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
