/**
 * 仪表盘页面
 */

import {
  MessageSquare,
  Bot,
  Zap,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// 统计卡片数据
const stats = [
  {
    title: '今日对话',
    value: '128',
    change: '+12%',
    icon: MessageSquare,
    color: 'bg-blue-500',
  },
  {
    title: '活跃 Agent',
    value: '8',
    change: '+2',
    icon: Bot,
    color: 'bg-green-500',
  },
  {
    title: 'Token 消耗',
    value: '1.2M',
    change: '+8%',
    icon: Zap,
    color: 'bg-purple-500',
  },
  {
    title: '平均响应',
    value: '2.3s',
    change: '-15%',
    icon: Clock,
    color: 'bg-orange-500',
  },
];

// 快捷操作
const quickActions = [
  { label: '新建对话', path: '/conversation', icon: MessageSquare },
  { label: 'Agent 管理', path: '/management/agents', icon: Bot },
  { label: '统计分析', path: '/analytics', icon: TrendingUp },
];

export default function Dashboard() {
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">仪表盘</h1>
        <p className="text-[var(--color-text-secondary)]">欢迎回来，这是您的数据概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <span
                className={`text-sm font-medium ${
                  stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {stat.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* 快捷操作 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="flex items-center gap-3 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors group"
            >
              <div className="p-2 rounded-lg bg-[var(--color-primary)]/10">
                <action.icon className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <span className="flex-1 text-[var(--color-text-primary)]">{action.label}</span>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* 最近对话 */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">最近对话</h2>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
          <div className="p-8 text-center text-[var(--color-text-tertiary)]">
            暂无对话记录，<Link to="/conversation" className="text-[var(--color-primary)] hover:underline">开始新对话</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
