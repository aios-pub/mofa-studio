/**
 * 侧边栏导航组件
 * 支持桌面端固定侧边栏和移动端抽屉模式
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Tooltip } from 'antd';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { MenuProps } from 'antd';
import { useAppStore, useSettings } from '../../stores';
import AccountDropdown from './AccountDropdown';

const { Sider } = Layout;

interface SidebarProps {
  isMobile?: boolean;
}

// 菜单配置
const menuItems: MenuProps['items'] = [
  {
    key: 'workbench',
    label: '工作台',
    type: 'group',
  },
  {
    key: '/',
    icon: <span className="i-lucide-layout-dashboard w-5 h-5" />,
    label: '仪表盘',
  },
  {
    key: '/conversation',
    icon: <span className="i-lucide-message-square w-5 h-5" />,
    label: '对话',
  },
  { type: 'divider' },
  {
    key: 'management',
    label: '管理',
    type: 'group',
  },
  {
    key: '/management/agents',
    icon: <span className="i-lucide-bot w-5 h-5" />,
    label: 'Agent 管理',
  },
  {
    key: '/management/prompts',
    icon: <span className="i-lucide-file-text w-5 h-5" />,
    label: '提示词管理',
  },
  {
    key: '/management/skills',
    icon: <span className="i-lucide-zap w-5 h-5" />,
    label: 'Skills 管理',
  },
  {
    key: '/management/test-sets',
    icon: <span className="i-lucide-flask-conical w-5 h-5" />,
    label: '测试集管理',
  },
  {
    key: '/management/providers',
    icon: <span className="i-lucide-server w-5 h-5" />,
    label: 'Provider 管理',
  },
  {
    key: '/management/tasks',
    icon: <span className="i-lucide-clock w-5 h-5" />,
    label: '定时任务',
  },
  { type: 'divider' },
  {
    key: 'monitoring',
    label: '监控',
    type: 'group',
  },
  {
    key: '/analytics',
    icon: <span className="i-lucide-bar-chart-3 w-5 h-5" />,
    label: '统计分析',
  },
  {
    key: '/monitoring',
    icon: <span className="i-lucide-eye w-5 h-5" />,
    label: '实时监控',
  },
  { type: 'divider' },
  {
    key: 'tracing',
    label: '追踪与评估',
    type: 'group',
  },
  {
    key: '/tracing',
    icon: <span className="i-lucide-activity w-5 h-5" />,
    label: '追踪分析',
  },
  {
    key: '/evaluation',
    icon: <span className="i-lucide-clipboard-check w-5 h-5" />,
    label: 'Agent 评估',
  },
  { type: 'divider' },
  {
    key: 'organization',
    label: '组织',
    type: 'group',
  },
  {
    key: '/organization/users',
    icon: <span className="i-lucide-users w-5 h-5" />,
    label: '用户管理',
  },
  {
    key: '/organization/departments',
    icon: <span className="i-lucide-building-2 w-5 h-5" />,
    label: '部门管理',
  },
  { type: 'divider' },
  {
    key: 'system',
    label: '系统',
    type: 'group',
  },
  {
    key: '/system/resources',
    icon: <span className="i-lucide-file-box w-5 h-5" />,
    label: '资源管理',
  },
  {
    key: '/system/audit-logs',
    icon: <span className="i-lucide-scroll-text w-5 h-5" />,
    label: '审计日志',
  },
  {
    key: '/system/settings',
    icon: <span className="i-lucide-settings w-5 h-5" />,
    label: '设置',
  },
];

export default function Sidebar({ isMobile = false }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useAppStore();
  const settings = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const isMini = isMobile ? false : (settings.themeLayout === 'mini' || sidebarCollapsed);
  const isHorizontal = settings.themeLayout === 'horizontal';

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
    // 移动端点击菜单后自动关闭抽屉
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  // 水平布局且非移动端时不显示侧边栏
  if (isHorizontal && !isMobile) {
    return null;
  }

  // 移动端模式 - 渲染为普通 div（在 Drawer 中使用）
  if (isMobile) {
    return (
      <div className="h-full bg-[#001529] flex flex-col">
        {/* Logo 区域 */}
        <div className="flex items-center gap-2 h-14 px-4 border-b border-white/10">
          <Bot className="w-8 h-8 text-[var(--color-primary)]" />
          <span className="text-lg font-bold text-white">AmosClaw</span>
        </div>

        {/* 菜单列表 */}
        <div className="flex-1 overflow-y-auto">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            onClick={handleMenuClick}
            items={menuItems}
            className="!border-none"
          />
        </div>

        {/* 底部用户区域 */}
        <div className="border-t border-white/10">
          <div className="p-2">
            <AccountDropdown />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Sider
      collapsible
      collapsed={isMini}
      onCollapse={toggleSidebar}
      width={224}
      collapsedWidth={64}
      className="!bg-[#001529] h-screen overflow-hidden relative transition-all duration-300 ease-in-out"
      trigger={null}
    >
      {/* Logo 区域 */}
      <div className="flex items-center justify-center h-14 border-b border-white/10 transition-all duration-300">
        {isMini ? (
          <Bot className="w-8 h-8 text-[var(--color-primary)]" />
        ) : (
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-[var(--color-primary)]" />
            <span className="text-lg font-bold text-white">AmosClaw</span>
          </div>
        )}
      </div>

      {/* 菜单列表 - 使用自定义滚动条 */}
      <div className="h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={isMini}
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={menuItems}
          className="!border-none"
        />
      </div>

      {/* 底部用户区域 */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#001529] border-t border-white/10">
        {/* 账户下拉 */}
        <div className="p-2">
          <AccountDropdown collapsed={isMini} />
        </div>

        {/* 折叠按钮 */}
        <div className="p-2 border-t border-white/10">
          <Tooltip title={isMini ? '展开侧边栏' : '收起侧边栏'} placement="right">
            <Button
              type="text"
              onClick={toggleSidebar}
              className="w-full !text-white/70 hover:!bg-white/10 hover:!text-white flex items-center justify-center transition-colors duration-200"
            >
              {isMini ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <>
                  <ChevronLeft className="w-5 h-5" />
                  <span className="ml-2">收起</span>
                </>
              )}
            </Button>
          </Tooltip>
        </div>
      </div>
    </Sider>
  );
}
