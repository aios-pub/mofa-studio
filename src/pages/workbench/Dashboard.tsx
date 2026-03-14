/**
 * 仪表盘页面
 */

import { useState, useEffect, useCallback } from "react";
import {
  MessageOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
  ArrowRightOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { Button, Card, Progress, Tooltip } from "antd";
import type { UsageStats, DailyStats } from "../../services/mock/analytics";
import { analyticsApi } from "../../services/mock/analytics";
import type { AgentStatus } from "../../services/mock/monitoring";
import { monitoringApi } from "../../services/mock/monitoring";

// 欢迎横幅组件
function WelcomeBanner() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-xl">
      <div className="relative z-10 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">
              {greeting}，欢迎使用 AmosClaw
            </h2>
            <p className="text-white/80 text-sm mb-4">
              强大的 AI Agent 管理平台，助您构建智能对话系统。探索无限可能。
            </p>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
              <RobotOutlined className="text-5xl text-white/80" />
            </div>
          </div>
        </div>
      </div>
      {/* 装饰背景 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
    </div>
  );
}

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
      console.error("Failed to load dashboard data:", error);
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
    if (
      typeof current !== "number" ||
      typeof previous !== "number" ||
      previous === 0
    )
      return 0;
    return ((current - previous) / previous) * 100;
  };

  // 统计卡片配置
  const statCards = stats
    ? [
        {
          title: "今日对话",
          value: formatNumber(
            dailyStats[dailyStats.length - 1]?.conversations || 0,
          ),
          change: calculateTrend(dailyStats, "conversations"),
          icon: MessageOutlined,
          color: "#3b82f6",
          chartData: dailyStats.map((d) => d.conversations),
        },
        {
          title: "Token 消耗",
          value: formatNumber(stats.totalTokens),
          change: calculateTrend(dailyStats, "tokens"),
          icon: ThunderboltOutlined,
          color: "#8b5cf6",
          chartData: dailyStats.map((d) => d.tokens),
        },
        {
          title: "平均响应",
          value: `${(stats.avgResponseTime / 1000).toFixed(1)}s`,
          change: -calculateTrend(dailyStats, "avgResponseTime"), // 响应时间越低越好
          icon: ClockCircleOutlined,
          color: "#f59e0b",
          chartData: dailyStats.map((d) => d.avgResponseTime),
        },
        {
          title: "成功率",
          value: `${stats.successRate.toFixed(1)}%`,
          change: calculateTrend(dailyStats, "successRate"),
          icon: LineChartOutlined,
          color: "#10b981",
          chartData: dailyStats.map((d) => d.successRate),
        },
      ]
    : [];

  // 快捷操作
  const quickActions = [
    {
      label: "新建对话",
      path: "/conversation",
      icon: MessageOutlined,
      description: "与 Agent 开始新对话",
    },
    {
      label: "Agent 管理",
      path: "/management/agents",
      icon: RobotOutlined,
      description: "管理和配置 AI Agent",
    },
    {
      label: "统计分析",
      path: "/analytics",
      icon: LineChartOutlined,
      description: "查看详细使用数据",
    },
  ];

  // Agent 状态统计
  const agentStats = {
    online: agentStatuses.filter(
      (a) => a.status === "online" || a.status === "busy",
    ).length,
    offline: agentStatuses.filter((a) => a.status === "offline").length,
    error: agentStatuses.filter((a) => a.status === "error").length,
    total: agentStatuses.length,
  };

  // 获取趋势图标和颜色
  const getTrendDisplay = (change: number) => {
    const isPositive = change >= 0;
    return {
      icon: isPositive ? "↑" : "↓",
      color: isPositive ? "text-green-500" : "text-red-500",
      text: `${isPositive ? "+" : ""}${change.toFixed(1)}%`,
    };
  };

  return (
    <div className="flex flex-col gap-6 w-full p-6">
      {/* 欢迎横幅 */}
      <WelcomeBanner />

      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            数据概览
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            实时监控您的系统运行状态
          </p>
        </div>
        <Button
          onClick={loadData}
          disabled={loading}
          icon={<SyncOutlined spin={loading} />}
        >
          刷新数据
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <SyncOutlined spin className="text-3xl text-[var(--color-primary)]" />
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              const trend = getTrendDisplay(stat.change);
              const maxValue = Math.max(...stat.chartData);

              return (
                <Card
                  key={stat.title}
                  className="overflow-hidden hover:shadow-md transition-shadow"
                  styles={{ body: { padding: "16px" } }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="rounded-lg p-2"
                      style={{ backgroundColor: `${stat.color}15` }}
                    >
                      <Icon style={{ color: stat.color }} className="text-lg" />
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                      {stat.title}
                    </span>
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {stat.value}
                    </span>
                    <span className={`text-xs font-semibold ${trend.color}`}>
                      {trend.icon} {trend.text}
                    </span>
                  </div>
                  {/* 迷你图表 */}
                  <div className="flex items-end gap-0.5 h-8">
                    {stat.chartData.map((value, idx) => {
                      const height =
                        maxValue > 0 ? (value / maxValue) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          className="flex-1 rounded-sm transition-all hover:opacity-80"
                          style={{
                            height: `${Math.max(height, 10)}%`,
                            backgroundColor: stat.color,
                            opacity:
                              idx === stat.chartData.length - 1 ? 1 : 0.3,
                          }}
                        />
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* 主内容区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 使用趋势图表 */}
            <Card
              className="lg:col-span-2"
              styles={{ body: { padding: "20px" } }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                  近7天使用趋势
                </h3>
                <span className="flex items-center gap-1 text-sm font-semibold text-green-500">
                  <ArrowRightOutlined className="rotate-[-45deg]" />
                  12.5%
                </span>
              </div>
              <div className="h-48 flex items-end gap-2">
                {dailyStats.map((day, index) => {
                  const maxTokens = Math.max(
                    ...dailyStats.map((d) => d.tokens),
                  );
                  const height =
                    maxTokens > 0 ? (day.tokens / maxTokens) * 100 : 0;
                  return (
                    <Tooltip
                      key={index}
                      title={`${day.date}: ${formatNumber(day.tokens)} tokens, ${day.conversations} 对话`}
                    >
                      <div className="flex-1 flex flex-col items-center cursor-pointer">
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full rounded-t transition-all hover:opacity-80"
                            style={{
                              height: `${Math.max(height, 5)}%`,
                              backgroundColor: "var(--color-primary)",
                            }}
                          />
                        </div>
                        <span className="text-xs text-[var(--color-text-tertiary)] mt-2 whitespace-nowrap">
                          {new Date(day.date).toLocaleDateString("zh-CN", {
                            weekday: "short",
                          })}
                        </span>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </Card>

            {/* Agent 状态概览 */}
            <Card styles={{ body: { padding: "20px" } }}>
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
                Agent 状态
              </h3>

              <div className="flex items-center justify-center mb-4">
                <Progress
                  type="circle"
                  percent={
                    agentStats.total > 0
                      ? (agentStats.online / agentStats.total) * 100
                      : 0
                  }
                  format={() => (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                        {agentStats.online}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        在线
                      </div>
                    </div>
                  )}
                  strokeColor="var(--color-primary)"
                  size={100}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/5">
                  <div className="flex items-center gap-2">
                    <CheckCircleOutlined className="text-green-500" />
                    <span className="text-sm text-[var(--color-text-primary)]">
                      在线
                    </span>
                  </div>
                  <span className="font-semibold text-green-500">
                    {agentStats.online}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-500/5">
                  <div className="flex items-center gap-2">
                    <CloseCircleOutlined className="text-gray-400" />
                    <span className="text-sm text-[var(--color-text-primary)]">
                      离线
                    </span>
                  </div>
                  <span className="font-semibold text-gray-400">
                    {agentStats.offline}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/5">
                  <div className="flex items-center gap-2">
                    <ExclamationCircleOutlined className="text-red-500" />
                    <span className="text-sm text-[var(--color-text-primary)]">
                      错误
                    </span>
                  </div>
                  <span className="font-semibold text-red-500">
                    {agentStats.error}
                  </span>
                </div>
              </div>

              <Link
                to="/monitoring"
                className="flex items-center justify-center gap-1 mt-4 text-sm text-[var(--color-primary)] hover:underline"
              >
                查看详情
                <ArrowRightOutlined />
              </Link>
            </Card>
          </div>

          {/* 快捷操作 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.path} to={action.path} className="group">
                  <Card
                    hoverable
                    className="h-full transition-all group-hover:border-[var(--color-primary)]"
                    styles={{ body: { padding: "16px" } }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 group-hover:bg-[var(--color-primary)]/20 transition-colors">
                        <Icon className="text-lg text-[var(--color-primary)]" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                          {action.label}
                        </div>
                        <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
                          {action.description}
                        </div>
                      </div>
                      <ArrowRightOutlined className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors mt-1" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* 活跃 Agent 列表 */}
          <Card styles={{ body: { padding: "20px" } }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                活跃 Agent 列表
              </h3>
              <Link
                to="/management/agents"
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                查看全部
              </Link>
            </div>
            <div className="space-y-2">
              {agentStatuses.slice(0, 5).map((agent) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        agent.status === "online"
                          ? "bg-green-500"
                          : agent.status === "busy"
                            ? "bg-yellow-500"
                            : agent.status === "error"
                              ? "bg-red-500"
                              : "bg-gray-400"
                      }`}
                    />
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {agent.agentName}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-[var(--color-text-tertiary)]">
                    <span>{agent.metrics.conversationsToday} 对话</span>
                    <span>{agent.metrics.avgResponseTime}ms</span>
                    <span
                      className={`font-medium ${
                        agent.metrics.successRate >= 95
                          ? "text-green-500"
                          : "text-yellow-500"
                      }`}
                    >
                      {agent.metrics.successRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
