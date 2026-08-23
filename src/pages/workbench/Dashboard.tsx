/**
 * Dashboard page
 */

import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  analyticsApi,
  monitoringApi,
  type UsageStats,
  type DailyStats,
  type AgentStatus,
} from "@/services";

// Welcome banner component
function WelcomeBanner() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-xl">
      <div className="relative z-10 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">
              {greeting}，欢迎使用 mofa-studio
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
      {/* Decorative background */}
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
  const [trendMetric, setTrendMetric] = useState<
    "tokens" | "conversations" | "avg_response_time"
  >("tokens");
  const chartRef = useRef<HTMLDivElement>(null);

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

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Compute trend
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

  // Trend of the currently selected metric
  const trendChange = calculateTrend(dailyStats, trendMetric);

  // Statistics card configuration
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
          value: formatNumber(stats.total_tokens),
          change: calculateTrend(dailyStats, "tokens"),
          icon: ThunderboltOutlined,
          color: "#8b5cf6",
          chartData: dailyStats.map((d) => d.tokens),
        },
        {
          title: "平均响应",
          value: `${((stats.avg_response_time || 0) / 1000).toFixed(1)}s`,
          change: -calculateTrend(dailyStats, "avg_response_time"), // lower response time is better
          icon: ClockCircleOutlined,
          color: "#f59e0b",
          chartData: dailyStats.map((d) => d.avg_response_time),
        },
        {
          title: "成功率",
          value: `${(stats.success_rate || 100).toFixed(1)}%`,
          change: calculateTrend(dailyStats, "success_rate"),
          icon: LineChartOutlined,
          color: "#10b981",
          chartData: dailyStats.map((d) => d.success_rate),
        },
      ]
    : [];

  // Quick actions
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

  // Agent status statistics
  const agentStats = {
    online: agentStatuses.filter(
      (a) => a.status === "online" || a.status === "busy",
    ).length,
    offline: agentStatuses.filter((a) => a.status === "offline").length,
    error: agentStatuses.filter((a) => a.status === "error").length,
    total: agentStatuses.length,
  };

  // Get trend icon and color
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
      {/* Welcome banner */}
      <WelcomeBanner />

      {/* Top toolbar */}
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
          {/* Statistics cards */}
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
                  {/* Mini chart */}
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

          {/* Main content area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Usage trend chart */}
            <Card
              className="lg:col-span-2"
              styles={{ body: { padding: "20px" } }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                  近7天使用趋势
                </h3>
                <div className="flex items-center gap-4">
                  {/* Metric switching */}
                  <div className="flex items-center gap-1 bg-[var(--color-bg-secondary)] rounded-lg p-1">
                    {[
                      { key: "tokens", label: "Token", color: "#8b5cf6" },
                      { key: "conversations", label: "对话", color: "#3b82f6" },
                      {
                        key: "avg_response_time",
                        label: "响应",
                        color: "#f59e0b",
                      },
                    ].map((metric) => (
                      <button
                        key={metric.key}
                        onClick={() =>
                          setTrendMetric(metric.key as typeof trendMetric)
                        }
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                          trendMetric === metric.key
                            ? "bg-white shadow-sm text-[var(--color-text-primary)]"
                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        }`}
                        style={{
                          borderLeft:
                            trendMetric === metric.key
                              ? `3px solid ${metric.color}`
                              : "none",
                        }}
                      >
                        {metric.label}
                      </button>
                    ))}
                  </div>
                  <span
                    className={`flex items-center gap-1 text-sm font-semibold ${
                      trendChange >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    <ArrowRightOutlined
                      className={
                        trendChange >= 0 ? "rotate-[-45deg]" : "rotate-[135deg]"
                      }
                    />
                    {trendChange >= 0 ? "+" : ""}
                    {trendChange.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Line chart area */}
              <div className="h-48 relative" ref={chartRef}>
                {(() => {
                  if (dailyStats.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        暂无数据
                      </div>
                    );
                  }
                  const values = dailyStats.map((d) => d[trendMetric]);
                  const maxValue = Math.max(...values);
                  const minValue = Math.min(...values);
                  const range = maxValue - minValue || 1;

                  const metricConfig = {
                    tokens: {
                      color: "#8b5cf6",
                      format: (v: number) => formatNumber(v),
                    },
                    conversations: {
                      color: "#3b82f6",
                      format: (v: number) => v.toString(),
                    },
                    avg_response_time: {
                      color: "#f59e0b",
                      format: (v: number) => `${(v / 1000).toFixed(1)}s`,
                    },
                  };
                  const config = metricConfig[trendMetric];

                  // SVG size
                  const width = 600;
                  const height = 160;
                  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
                  const chartWidth = width - padding.left - padding.right;
                  const chartHeight = height - padding.top - padding.bottom;

                  // Compute point coordinates
                  const points = values.map((value, index) => ({
                    x:
                      padding.left + (index / (values.length - 1)) * chartWidth,
                    y:
                      padding.top +
                      chartHeight -
                      ((value - minValue) / range) * chartHeight,
                    value,
                    date: dailyStats[index].date,
                    day: dailyStats[index],
                  }));

                  // Generate line path
                  const linePath = points
                    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                    .join(" ");

                  // Generate fill area path
                  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

                  // Y-axis ticks
                  const yTicks = 4;
                  const yTickValues = Array.from(
                    { length: yTicks + 1 },
                    (_, i) => minValue + (range * i) / yTicks,
                  );

                  // Compute the SVG's actual position in the container (preserveAspectRatio centering)
                  const containerWidth = chartRef.current?.offsetWidth || 600;
                  const containerHeight = chartRef.current?.offsetHeight || 192;
                  const viewBoxRatio = width / height;
                  const containerRatio = containerWidth / containerHeight;

                  let svgActualWidth: number,
                    svgActualHeight: number,
                    offsetX: number,
                    offsetY: number;

                  if (containerRatio > viewBoxRatio) {
                    // Container wider than SVG: blank space above and below
                    svgActualHeight = containerHeight;
                    svgActualWidth = containerHeight * viewBoxRatio;
                    offsetX = (containerWidth - svgActualWidth) / 2;
                    offsetY = 0;
                  } else {
                    // Container taller than SVG: blank space left and right
                    svgActualWidth = containerWidth;
                    svgActualHeight = containerWidth / viewBoxRatio;
                    offsetX = 0;
                    offsetY = (containerHeight - svgActualHeight) / 2;
                  }

                  const scaleX = svgActualWidth / width;
                  const scaleY = svgActualHeight / height;

                  return (
                    <>
                      <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="w-full h-full"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {/* Gradient definition */}
                        <defs>
                          <linearGradient
                            id={`gradient-${trendMetric}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={config.color}
                              stopOpacity="0.3"
                            />
                            <stop
                              offset="100%"
                              stopColor={config.color}
                              stopOpacity="0.02"
                            />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        {yTickValues.map((tick, i) => (
                          <g key={i}>
                            <line
                              x1={padding.left}
                              y1={
                                padding.top +
                                chartHeight -
                                ((tick - minValue) / range) * chartHeight
                              }
                              x2={width - padding.right}
                              y2={
                                padding.top +
                                chartHeight -
                                ((tick - minValue) / range) * chartHeight
                              }
                              stroke="var(--color-border)"
                              strokeOpacity="0.5"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={padding.left - 8}
                              y={
                                padding.top +
                                chartHeight -
                                ((tick - minValue) / range) * chartHeight
                              }
                              textAnchor="end"
                              alignmentBaseline="middle"
                              className="fill-[var(--color-text-tertiary)]"
                              style={{ fontSize: "10px" }}
                            >
                              {config.format(tick)}
                            </text>
                          </g>
                        ))}

                        {/* Fill area */}
                        <path
                          d={areaPath}
                          fill={`url(#gradient-${trendMetric})`}
                        />

                        {/* Line */}
                        <path
                          d={linePath}
                          fill="none"
                          stroke={config.color}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Data points */}
                        {points.map((point, index) => {
                          const isToday = index === points.length - 1;
                          return (
                            <g key={index}>
                              {/* Outer ring */}
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={isToday ? "8" : "6"}
                                fill={config.color}
                                fillOpacity="0.15"
                              />
                              {/* Data points */}
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={isToday ? "5" : "4"}
                                fill={isToday ? config.color : "white"}
                                stroke={config.color}
                                strokeWidth={isToday ? "0" : "2"}
                              />
                              {/* Today's stats */}
                              {isToday && (
                                <text
                                  x={point.x}
                                  y={point.y - 14}
                                  textAnchor="middle"
                                  className="fill-[var(--color-primary)]"
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: "500",
                                  }}
                                >
                                  今日
                                </text>
                              )}
                              {/* X-axis labels */}
                              <text
                                x={point.x}
                                y={height - 8}
                                textAnchor="middle"
                                className={
                                  isToday
                                    ? "fill-[var(--color-primary)]"
                                    : "fill-[var(--color-text-tertiary)]"
                                }
                                style={{
                                  fontSize: "11px",
                                  fontWeight: isToday ? "500" : "normal",
                                }}
                              >
                                {new Date(point.date).toLocaleDateString(
                                  "zh-CN",
                                  { weekday: "short" },
                                )}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Tooltip interaction layer */}
                      <div className="absolute inset-0 pointer-events-none">
                        {points.map((point, index) => {
                          // Compute a data point's actual pixel position in the container
                          const actualX = offsetX + point.x * scaleX;
                          const actualY = offsetY + point.y * scaleY;

                          return (
                            <Tooltip
                              key={index}
                              title={
                                <div className="space-y-1">
                                  <div className="font-medium">
                                    {point.date}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: "#3b82f6" }}
                                    />
                                    <span>对话: {point.day.conversations}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: "#8b5cf6" }}
                                    />
                                    <span>
                                      Tokens: {formatNumber(point.day.tokens)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: "#f59e0b" }}
                                    />
                                    <span>
                                      响应:{" "}
                                      {(
                                        (point.day.avg_response_time || 0) /
                                        1000
                                      ).toFixed(1)}
                                      s
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: "#10b981" }}
                                    />
                                    <span>
                                      成功率:{" "}
                                      {(point.day.success_rate || 100).toFixed(
                                        1,
                                      )}
                                      %
                                    </span>
                                  </div>
                                </div>
                              }
                            >
                              <div
                                className="absolute pointer-events-auto cursor-pointer"
                                style={{
                                  left: actualX,
                                  top: actualY,
                                  transform: "translate(-50%, -50%)",
                                  width: "28px",
                                  height: "28px",
                                }}
                              />
                            </Tooltip>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Bottom statistics summary */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-(--color-border)">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: "#3b82f6" }}
                    />
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      总对话:{" "}
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {formatNumber(
                          dailyStats.reduce(
                            (sum, d) => sum + d.conversations,
                            0,
                          ),
                        )}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: "#8b5cf6" }}
                    />
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      总Token:{" "}
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {formatNumber(
                          dailyStats.reduce((sum, d) => sum + d.tokens, 0),
                        )}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: "#10b981" }}
                    />
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      平均成功率:{" "}
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {(
                          dailyStats.reduce(
                            (sum, d) => sum + (d.success_rate || 0),
                            0,
                          ) / (dailyStats.length || 1)
                        ).toFixed(1)}
                        %
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Agent status overview */}
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

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.path} to={action.path} className="group">
                  <Card
                    hoverable
                    className="h-full transition-all group-hover:border-(--color-primary)"
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

          {/* Active agents list */}
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
                  key={agent.agent_id}
                  className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg hover:bg-(--color-bg-tertiary) transition-colors"
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
                      {agent.agent_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-[var(--color-text-tertiary)]">
                    <span>{agent.metrics?.conversations_today ?? 0} 对话</span>
                    <span>{agent.metrics?.avg_response_time ?? 0}ms</span>
                    <span
                      className={`font-medium ${
                        (agent.metrics?.success_rate || 100) >= 95
                          ? "text-green-500"
                          : "text-yellow-500"
                      }`}
                    >
                      {agent.metrics?.success_rate || 100}%
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
