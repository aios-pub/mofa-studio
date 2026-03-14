/**
 * 侧边栏导航组件
 */

import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  FileText,
  Zap,
  FlaskConical,
  Server,
  Clock,
  BarChart3,
  Eye,
  Users,
  Building2,
  FileBox,
  ScrollText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../../stores';

// 菜单配置
const menuGroups = [
  {
    title: '工作台',
    items: [
      { path: '/', icon: LayoutDashboard, label: '仪表盘' },
      { path: '/conversation', icon: MessageSquare, label: '对话' },
    ],
  },
  {
    title: '管理',
    items: [
      { path: '/management/agents', icon: Bot, label: 'Agent 管理' },
      { path: '/management/prompts', icon: FileText, label: '提示词管理' },
      { path: '/management/skills', icon: Zap, label: 'Skills 管理' },
      { path: '/management/test-sets', icon: FlaskConical, label: '测试集管理' },
      { path: '/management/providers', icon: Server, label: 'Provider 管理' },
      { path: '/management/tasks', icon: Clock, label: '定时任务' },
    ],
  },
  {
    title: '监控',
    items: [
      { path: '/analytics', icon: BarChart3, label: '统计分析' },
      { path: '/monitoring', icon: Eye, label: '实时监控' },
    ],
  },
  {
    title: '组织',
    items: [
      { path: '/organization/users', icon: Users, label: '用户管理' },
      { path: '/organization/departments', icon: Building2, label: '部门管理' },
    ],
  },
  {
    title: '系统',
    items: [
      { path: '/system/resources', icon: FileBox, label: '资源管理' },
      { path: '/system/audit-logs', icon: ScrollText, label: '审计日志' },
    ],
  },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={`flex flex-col h-full bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo 区域 */}
      <div className="flex items-center justify-center h-14 border-b border-[var(--color-border)]">
        {sidebarCollapsed ? (
          <Bot className="w-8 h-8 text-[var(--color-primary)]" />
        ) : (
          <span className="text-lg font-bold text-[var(--color-text-primary)]">Amos-Claw</span>
        )}
      </div>

      {/* 菜单列表 */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuGroups.map((group) => (
          <div key={group.title} className="mb-4">
            {!sidebarCollapsed && (
              <h3 className="px-4 mb-1 text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                {group.title}
              </h3>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 mx-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* 底部折叠按钮 */}
      <div className="p-2 border-t border-[var(--color-border)]">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="ml-2">收起</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
