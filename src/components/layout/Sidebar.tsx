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
  LayoutDashboard,
  MessageSquare,
  FileText,
  Zap,
  FlaskConical,
  Server,
  Clock,
  BarChart3,
  Eye,
  Activity,
  ClipboardCheck,
  Users,
  Building2,
  FileBox,
  ScrollText,
} from 'lucide-react';
import type { MenuProps } from 'antd';
import { useAppStore, useSettings } from '../../stores';
import { useTheme } from '../../hooks';

const { Sider } = Layout;

interface SidebarProps {
  isMobile?: boolean;
}

// 菜单配置 - 使用 Lucide React 组件
const menuItems: MenuProps['items'] = [
  {
    key: 'workbench',
    label: '工作台',
    type: 'group',
  },
  {
    key: '/',
    icon: <LayoutDashboard className="w-5 h-5" />,
    label: '仪表盘',
  },
  {
    key: '/conversation',
    icon: <MessageSquare className="w-5 h-5" />,
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
    icon: <Bot className="w-5 h-5" />,
    label: 'Agent 管理',
  },
  {
    key: '/management/prompts',
    icon: <FileText className="w-5 h-5" />,
    label: '提示词管理',
  },
  {
    key: '/management/skills',
    icon: <Zap className="w-5 h-5" />,
    label: 'Skills 管理',
  },
  {
    key: '/management/test-sets',
    icon: <FlaskConical className="w-5 h-5" />,
    label: '测试集管理',
  },
  {
    key: '/management/providers',
    icon: <Server className="w-5 h-5" />,
    label: 'Provider 管理',
  },
  {
    key: '/management/tasks',
    icon: <Clock className="w-5 h-5" />,
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
    icon: <BarChart3 className="w-5 h-5" />,
    label: '统计分析',
  },
  {
    key: '/monitoring',
    icon: <Eye className="w-5 h-5" />,
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
    icon: <Activity className="w-5 h-5" />,
    label: '追踪分析',
  },
  {
    key: '/evaluation',
    icon: <ClipboardCheck className="w-5 h-5" />,
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
    icon: <Users className="w-5 h-5" />,
    label: '用户管理',
  },
  {
    key: '/organization/departments',
    icon: <Building2 className="w-5 h-5" />,
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
    icon: <FileBox className="w-5 h-5" />,
    label: '资源管理',
  },
  {
    key: '/system/audit-logs',
    icon: <ScrollText className="w-5 h-5" />,
    label: '审计日志',
  },
];

export default function Sidebar({ isMobile = false }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useAppStore();
  const settings = useSettings();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isMini = isMobile ? false : (settings.themeLayout === 'mini' || sidebarCollapsed);
  const isHorizontal = settings.themeLayout === 'horizontal';

  // 主题相关样式
  const siderBg = isDark ? '#001529' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const logoTextColor = isDark ? 'text-white' : 'text-gray-900';
  const collapseBtnColor = isDark ? '!text-white/70 hover:!bg-white/10 hover:!text-white' : '!text-gray-600 hover:!bg-gray-100 hover:!text-gray-900';

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
      <div className="h-full flex flex-col" style={{ backgroundColor: siderBg }}>
        {/* Logo 区域 */}
        <div
          className="flex items-center gap-2 h-14 px-4 border-b"
          style={{ borderColor }}
        >
          <Bot className="w-8 h-8 text-[var(--color-primary)]" />
          <span className={`text-lg font-bold ${logoTextColor}`}>AmosClaw</span>
        </div>

        {/* 菜单列表 */}
        <div className="flex-1 overflow-y-auto">
          <Menu
            theme={isDark ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[location.pathname]}
            onClick={handleMenuClick}
            items={menuItems}
            className="!border-none"
          />
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
      className="h-screen overflow-hidden relative transition-all duration-300 ease-in-out"
      style={{ backgroundColor: siderBg }}
      trigger={null}
    >
      {/* Logo 区域 */}
      <div
        className="flex items-center justify-center h-14 border-b transition-all duration-300"
        style={{ borderColor }}
      >
        {isMini ? (
          <Bot className="w-8 h-8 text-[var(--color-primary)]" />
        ) : (
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-[var(--color-primary)]" />
            <span className={`text-lg font-bold ${logoTextColor}`}>AmosClaw</span>
          </div>
        )}
      </div>

      {/* 菜单列表 - 使用自定义滚动条 */}
      <div
        className="h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin"
        style={{
          scrollbarColor: isDark ? 'rgba(255,255,255,0.2) transparent' : 'rgba(0,0,0,0.2) transparent',
        }}
      >
        <Menu
          theme={isDark ? 'dark' : 'light'}
          mode="inline"
          inlineCollapsed={isMini}
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={menuItems}
          className="!border-none"
        />
      </div>

      {/* 底部折叠按钮区域 */}
      <div
        className="absolute bottom-0 left-0 right-0 border-t"
        style={{ backgroundColor: siderBg, borderColor }}
      >
        <div className="p-2">
          <Tooltip title={isMini ? '展开侧边栏' : '收起侧边栏'} placement="right">
            <Button
              type="text"
              onClick={toggleSidebar}
              className={`w-full flex items-center justify-center transition-colors duration-200 ${collapseBtnColor}`}
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
