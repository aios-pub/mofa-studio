/**
 * 统计分析页面
 */

import { useState, useEffect, useCallback } from 'react';
import {
  BarChartOutlined,
  UserOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
  SyncOutlined,
  FilterOutlined,
  DownOutlined,
  CalendarOutlined,
  MessageOutlined,
  ApiOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import type { AnalyticsFilter, UsageStats, DailyStats, AgentStats, UserStats, HourlyDistribution } from '../../services/mock/analytics';
import { analyticsApi } from '../../services/mock/analytics';

// 日期范围选项
const dateRangeOptions = [
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: '7days', label: '近7天' },
  { value: '30days', label: '近30天' },
  { value: 'custom', label: '自定义' },
];

// 获取日期范围
const getDateRange = (option: string): { startDate: string; endDate: string } => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  let startDate = endDate;

  switch (option) {
    case 'today':
      startDate = endDate;
      break;
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = yesterday.toISOString().split('T')[0];
      break;
    case '7days':
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      startDate = sevenDaysAgo.toISOString().split('T')[0];
      break;
    case '30days':
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      break;
    default:
      break;
  }

  return { startDate, endDate };
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState<UsageStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<HourlyDistribution[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'users'>('overview');

  // 筛选状态
  const [dateRangeOption, setDateRangeOption] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const range =
        dateRangeOption === 'custom'
          ? { startDate: customStartDate, endDate: customEndDate }
          : getDateRange(dateRangeOption);

      const filter: AnalyticsFilter = {
        startDate: range.startDate,
        endDate: range.endDate,
      };

      const [overview, daily, agents, users, hourly] = await Promise.all([
        analyticsApi.getOverviewStats(filter),
        analyticsApi.getDailyStats(filter),
        analyticsApi.getAgentStats(filter),
        analyticsApi.getUserStats(filter),
        analyticsApi.getHourlyDistribution(filter),
      ]);

      setOverviewStats(overview);
      setDailyStats(daily);
      setAgentStats(agents);
      setUserStats(users);
      setHourlyDistribution(hourly);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRangeOption, customStartDate, customEndDate]);

  useEffect(() => {
    if (dateRangeOption !== 'custom' || (customStartDate && customEndDate)) {
      loadStats();
    }
  }, [loadStats, dateRangeOption, customStartDate, customEndDate]);

  const handleExport = async (format: 'csv' | 'json') => {
    const range =
      dateRangeOption === 'custom'
        ? { startDate: customStartDate, endDate: customEndDate }
        : getDateRange(dateRangeOption);

    const filter: AnalyticsFilter = {
      startDate: range.startDate,
      endDate: range.endDate,
    };

    const data = await analyticsApi.exportData(format, filter);
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    return `$${num.toFixed(2)}`;
  };

  // 计算趋势（简单计算最近7天对比前7天）
  const calculateTrend = (data: DailyStats[], key: keyof DailyStats) => {
    if (data.length < 14) return 0;
    const recent = data.slice(-7).reduce((sum, d) => sum + (typeof d[key] === 'number' ? d[key] as number : 0), 0);
    const previous = data.slice(-14, -7).reduce((sum, d) => sum + (typeof d[key] === 'number' ? d[key] as number : 0), 0);
    if (previous === 0) return 0;
    return ((recent - previous) / previous) * 100;
  };

  const maxHourlyCount = Math.max(...hourlyDistribution.map((h) => h.count));

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">统计分析</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">查看使用数据和趋势分析</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg ${
              showFilters
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]'
            }`}
          >
            <FilterOutlined />
            筛选
          </button>
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
          >
            <SyncOutlined spin={loading} />
            刷新
          </button>
          <div className="relative group">
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">
              <DownloadOutlined />
              导出
              <DownOutlined className="text-xs" />
            </button>
            <div className="absolute right-0 mt-1 w-32 py-1 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-[var(--color-bg-tertiary)]"
              >
                导出 CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-[var(--color-bg-tertiary)]"
              >
                导出 JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      {showFilters && (
        <div className="p-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-[var(--color-text-tertiary)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">日期范围:</span>
            </div>
            <select
              value={dateRangeOption}
              onChange={(e) => setDateRangeOption(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
            >
              {dateRangeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {dateRangeOption === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                />
                <span className="text-[var(--color-text-tertiary)]">至</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 标签栏 */}
      <div className="flex gap-1 px-6 border-b border-[var(--color-border)]">
        {[
          { key: 'overview', label: '使用概览', icon: BarChartOutlined },
          { key: 'agents', label: 'Agent 统计', icon: ThunderboltOutlined },
          { key: 'users', label: '用户统计', icon: UserOutlined },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Icon />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <SyncOutlined spin className="text-3xl text-[var(--color-primary)]" />
          </div>
        ) : activeTab === 'overview' ? (
          <OverviewTab
            stats={overviewStats}
            dailyStats={dailyStats}
            hourlyDistribution={hourlyDistribution}
            calculateTrend={calculateTrend}
            formatNumber={formatNumber}
            formatCurrency={formatCurrency}
            maxHourlyCount={maxHourlyCount}
          />
        ) : activeTab === 'agents' ? (
          <AgentsTab stats={agentStats} formatNumber={formatNumber} formatCurrency={formatCurrency} />
        ) : (
          <UsersTab stats={userStats} formatNumber={formatNumber} />
        )}
      </div>
    </div>
  );
}

// 概览标签页
function OverviewTab({
  stats,
  dailyStats,
  hourlyDistribution,
  calculateTrend,
  formatNumber,
  formatCurrency,
  maxHourlyCount,
}: {
  stats: UsageStats | null;
  dailyStats: DailyStats[];
  hourlyDistribution: HourlyDistribution[];
  calculateTrend: (data: DailyStats[], key: keyof DailyStats) => number;
  formatNumber: (num: number) => string;
  formatCurrency: (num: number) => string;
  maxHourlyCount: number;
}) {
  if (!stats) return null;

  const conversationTrend = calculateTrend(dailyStats, 'conversations');
  const tokenTrend = calculateTrend(dailyStats, 'tokens');
  const costTrend = calculateTrend(dailyStats, 'cost');

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={MessageOutlined}
          label="总对话数"
          value={formatNumber(stats.totalConversations)}
          trend={conversationTrend}
          color="blue"
        />
        <StatCard
          icon={ApiOutlined}
          label="总 Tokens"
          value={formatNumber(stats.totalTokens)}
          subValue={`输入 ${formatNumber(stats.inputTokens)} / 输出 ${formatNumber(stats.outputTokens)}`}
          trend={tokenTrend}
          color="green"
        />
        <StatCard
          icon={ClockCircleOutlined}
          label="平均响应时间"
          value={`${stats.avgResponseTime}ms`}
          subValue={`成功率 ${stats.successRate}%`}
          color="orange"
        />
        <StatCard
          icon={DollarOutlined}
          label="预估费用"
          value={formatCurrency(stats.totalCost)}
          trend={costTrend}
          color="purple"
        />
      </div>

      {/* 趋势图表 */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">使用趋势</h3>
        <div className="h-48 flex items-end gap-1">
          {dailyStats.slice(-14).map((day, index) => {
            const maxTokens = Math.max(...dailyStats.map((d) => d.tokens));
            const height = (day.tokens / maxTokens) * 100;
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center justify-end"
                title={`${day.date}: ${formatNumber(day.tokens)} tokens`}
              >
                <div
                  className="w-full bg-[var(--color-primary)] rounded-t"
                  style={{ height: `${height}%`, minHeight: '4px' }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-[var(--color-text-tertiary)]">
          <span>{dailyStats[dailyStats.length - 14]?.date || ''}</span>
          <span>{dailyStats[dailyStats.length - 1]?.date || ''}</span>
        </div>
      </div>

      {/* 小时分布热力图 */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">24小时使用分布</h3>
        <div className="grid grid-cols-24 gap-1">
          {hourlyDistribution.map((hour) => {
            const intensity = (hour.count / maxHourlyCount) * 100;
            return (
              <div
                key={hour.hour}
                className="h-8 rounded"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${intensity / 100})`,
                }}
                title={`${hour.hour}:00 - ${hour.count} 次调用`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-[var(--color-text-tertiary)]">
          <span>0:00</span>
          <span>6:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>
    </div>
  );
}

// Agent 统计标签页
function AgentsTab({
  stats,
  formatNumber,
  formatCurrency,
}: {
  stats: AgentStats[];
  formatNumber: (num: number) => string;
  formatCurrency: (num: number) => string;
}) {
  const maxConversations = Math.max(...stats.map((s) => s.conversations));

  return (
    <div className="space-y-4">
      {/* Agent 排行榜 */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="p-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Agent 使用排行</h3>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {stats.map((agent, index) => (
            <div key={agent.agentId} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded text-xs font-medium ${
                      index === 0
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : index === 1
                          ? 'bg-gray-400/10 text-gray-400'
                          : index === 2
                            ? 'bg-orange-500/10 text-orange-500'
                            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-medium text-[var(--color-text-primary)]">{agent.agentName}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {formatNumber(agent.conversations)} 次对话
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)] ml-2">
                    {formatCurrency(agent.cost)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-primary)] rounded-full"
                  style={{ width: `${(agent.conversations / maxConversations) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-tertiary)]">
                <span>Tokens: {formatNumber(agent.tokens)}</span>
                <span>•</span>
                <span>响应: {agent.avgResponseTime}ms</span>
                <span>•</span>
                <span>成功率: {agent.successRate.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 用户统计标签页
function UsersTab({
  stats,
  formatNumber,
}: {
  stats: UserStats[];
  formatNumber: (num: number) => string;
}) {
  const maxConversations = Math.max(...stats.map((s) => s.conversations));

  // 按部门分组
  const departmentStats = stats.reduce(
    (acc, user) => {
      if (!acc[user.department]) {
        acc[user.department] = { conversations: 0, tokens: 0, users: 0 };
      }
      acc[user.department].conversations += user.conversations;
      acc[user.department].tokens += user.tokens;
      acc[user.department].users += 1;
      return acc;
    },
    {} as Record<string, { conversations: number; tokens: number; users: number }>
  );

  return (
    <div className="space-y-6">
      {/* 部门统计 */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">部门使用统计</h3>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(departmentStats).map(([dept, data]) => (
            <div key={dept} className="p-3 bg-[var(--color-bg-tertiary)] rounded-lg">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{dept}</p>
              <p className="text-lg font-semibold text-[var(--color-primary)] mt-1">
                {formatNumber(data.conversations)}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                {data.users} 用户 • {formatNumber(data.tokens)} tokens
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 用户排行 */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
        <div className="p-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">用户使用排行</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">排名</th>
              <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">用户</th>
              <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">部门</th>
              <th className="text-right py-2 px-4 text-[var(--color-text-tertiary)]">对话数</th>
              <th className="text-right py-2 px-4 text-[var(--color-text-tertiary)]">Tokens</th>
              <th className="text-right py-2 px-4 text-[var(--color-text-tertiary)]">平均响应</th>
            </tr>
          </thead>
          <tbody>
            {stats.slice(0, 10).map((user, index) => (
              <tr key={user.userId} className="border-b border-[var(--color-border)]/50">
                <td className="py-2 px-4">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded text-xs font-medium ${
                      index === 0
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : index === 1
                          ? 'bg-gray-400/10 text-gray-400'
                          : index === 2
                            ? 'bg-orange-500/10 text-orange-500'
                            : 'text-[var(--color-text-tertiary)]'
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="py-2 px-4 font-medium text-[var(--color-text-primary)]">{user.userName}</td>
                <td className="py-2 px-4 text-[var(--color-text-secondary)]">{user.department}</td>
                <td className="py-2 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[var(--color-text-primary)]">{formatNumber(user.conversations)}</span>
                    <div className="w-16 h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-primary)] rounded-full"
                        style={{ width: `${(user.conversations / maxConversations) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-2 px-4 text-right text-[var(--color-text-secondary)]">
                  {formatNumber(user.tokens)}
                </td>
                <td className="py-2 px-4 text-right text-[var(--color-text-secondary)]">
                  {user.avgResponseTime}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 统计卡片组件
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  color,
}: {
  icon: React.ComponentType;
  label: string;
  value: string;
  subValue?: string;
  trend?: number;
  color: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    orange: 'bg-orange-500/10 text-orange-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon />
        </span>
        {trend !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs ${
              trend >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            <RiseOutlined className={trend < 0 ? 'rotate-180' : ''} />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-sm text-[var(--color-text-tertiary)]">{label}</p>
      {subValue && <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{subValue}</p>}
    </div>
  );
}
