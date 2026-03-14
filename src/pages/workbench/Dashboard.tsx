/**
 * 仪表盘页面
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Bot,
  Zap,
  Clock,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UsageStats, DailyStats } from '../../services/mock/analytics';
import { analyticsApi } from '../../services/mock/analytics';
import type { AgentStatus } from '../../services/mock/monitoring';
import { monitoringApi } from '../../services/mock/monitoring';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewStats, daily, agents] = await Promise.all([
        analyticsApi.getOverviewStats(),
        analyticsApi.getDailyStats(),
        monitoringApi.getAgentStatuses(),
      ]);
      setStats(overviewStats);
      setDailyStats(daily.slice(-7));
      setAgentStatuses(agents);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // 计算趋势
  const calculateTrend = (data: DailyStats[], key: keyof DailyStats) => {
    if (data.length < 2) return 0;
    const current = data[data.length - 1][key];
    const previous = data[data.length - 2][key];
    if (typeof current !== 'number' || typeof previous !== 'number' || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // 统计卡片
  const statCards = stats
    ? [
        {
          title: '今日对话',
          value: formatNumber(dailyStats[dailyStats.length - 1]?.conversations || 0),
          change: `${calculateTrend(dailyStats, 'conversations') >= 0 ? '+' : ''}${calculateTrend(dailyStats, 'conversations').toFixed(0)}%`,
          icon: MessageSquare,
          color: 'bg-blue-500',
        },
        {
          title: 'Token 消耗',
          value: formatNumber(stats.totalTokens),
          change: `${calculateTrend(dailyStats, 'tokens') >= 0 ? '+' : ''}${calculateTrend(dailyStats, 'tokens').toFixed(0)}%`,
          icon: Zap,
          color: 'bg-purple-500',
        },
        {
          title: '平均响应',
          value: `${(stats.avgResponseTime / 1000).toFixed(1)}s`,
          change: `${calculateTrend(dailyStats, 'avgResponseTime') <= 0 ? '' : '+'}${calculateTrend(dailyStats, 'avgResponseTime').toFixed(0)}%`,
          icon: Clock,
          color: 'bg-orange-500',
        },
        {
          title: '成功率',
          value: `${stats.successRate.toFixed(1)}%`,
          change: `${calculateTrend(dailyStats, 'successRate') >= 0 ? '+' : ''}${calculateTrend(dailyStats, 'successRate').toFixed(1)}%`,
          icon: TrendingUp,
          color: 'bg-green-500',
        },
      ]
    : [];

  // 快捷操作
  const quickActions = [
    { label: '新建对话', path: '/conversation', icon: MessageSquare },
    { label: 'Agent 管理', path: '/management/agents', icon: Bot },
    { label: '统计分析', path: '/analytics', icon: TrendingUp },
  ];

  // Agent 状态统计
  const agentStats = {
    online: agentStatuses.filter((a) => a.status === 'online' || a.status === 'busy').length,
    offline: agentStatuses.filter((a) => a.status === 'offline').length,
    error: agentStatuses.filter((a) => a.status === 'error').length,
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">仪表盘</h1>
          <p className="text-[var(--color-text-secondary)]">欢迎回来，这是您的数据概览</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((stat) => (
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* 使用趋势图表 */}
            <div className="lg:col-span-2 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                近7天使用趋势
              </h2>
              <div className="h-48 flex items-end gap-2">
                {dailyStats.map((day, index) => {
                  const maxTokens = Math.max(...dailyStats.map((d) => d.tokens));
                  const height = (day.tokens / maxTokens) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className="w-full bg-[var(--color-primary)] rounded-t transition-all hover:bg-[var(--color-primary-hover)]"
                          style={{ height: `${height}%`, minHeight: '8px' }}
                          title={`${day.date}: ${formatNumber(day.tokens)} tokens`}
                        />
                      </div>
                      <span className="text-xs text-[var(--color-text-tertiary)] mt-2">
                        {new Date(day.date).toLocaleDateString('zh-CN', { weekday: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agent 状态概览 */}
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Agent 状态
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-500/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-[var(--color-text-primary)]">在线</span>
                  </div>
                  <span className="text-xl font-semibold text-green-500">{agentStats.online}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-500/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-[var(--color-text-primary)]">离线</span>
                  </div>
                  <span className="text-xl font-semibold text-gray-400">{agentStats.offline}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-[var(--color-text-primary)]">错误</span>
                  </div>
                  <span className="text-xl font-semibold text-red-500">{agentStats.error}</span>
                </div>
              </div>
              <Link
                to="/monitoring"
                className="flex items-center justify-center gap-1 mt-4 text-sm text-[var(--color-primary)] hover:underline"
              >
                查看详情
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
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
                  <span className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
                    {action.label}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-auto text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)]" />
                </Link>
              ))}
            </div>
          </div>

          {/* 最近活动 Agent */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              活跃 Agent 列表
            </h2>
            <div className="space-y-2">
              {agentStatuses.slice(0, 5).map((agent) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        agent.status === 'online'
                          ? 'bg-green-500'
                          : agent.status === 'busy'
                            ? 'bg-yellow-500'
                            : agent.status === 'error'
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                      }`}
                    />
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {agent.agentName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[var(--color-text-tertiary)]">
                    <span>{agent.metrics.conversationsToday} 对话</span>
                    <span>{agent.metrics.avgResponseTime}ms</span>
                    <span className={agent.metrics.successRate >= 95 ? 'text-green-500' : 'text-yellow-500'}>
                      {agent.metrics.successRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
