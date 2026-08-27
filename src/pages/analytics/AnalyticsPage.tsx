import { useTranslation } from "react-i18next";
/**
 * Analytics page
 * Usage statistics with overview, agent and user breakdowns
 */

import { useState, useEffect, useCallback } from "react";
import {
  BarChartOutlined,
  UserOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
  SyncOutlined,
  DownOutlined,
  MessageOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import type {
  AnalyticsFilter,
  UsageStats,
  DailyStats,
  AgentStats,
  UserStats,
  HourlyDistribution,
} from "@/services";
import { analyticsApi } from "@/services";
import { PageContainer } from "@/components/layout";
import { StatCard } from "@/components/common";

const { Text } = Typography;

// Date range options
const dateRangeOptions = [
  { value: "today", label: "今天" },
  { value: "yesterday", label: "昨天" },
  { value: "7days", label: "近7天" },
  { value: "30days", label: "近30天" },
  { value: "custom", label: "自定义" },
];

// Get date range
const getDateRange = (
  option: string,
): { start_date: string; end_date: string } => {
  const today = new Date();
  const end_date = today.toISOString().split("T")[0];
  let start_date = end_date;

  switch (option) {
    case "today":
      start_date = end_date;
      break;
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      start_date = yesterday.toISOString().split("T")[0];
      break;
    }
    case "7days": {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      start_date = sevenDaysAgo.toISOString().split("T")[0];
      break;
    }
    case "30days": {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      start_date = thirtyDaysAgo.toISOString().split("T")[0];
      break;
    }
    default:
      break;
  }

  return { start_date, end_date };
};

export default function AnalyticsPage() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState<UsageStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<
    HourlyDistribution[]
  >([]);
  const [activeTab, setActiveTab] = useState<"overview" | "agents" | "users">(
    "overview",
  );

  // Filter state
  const [dateRangeOption, setDateRangeOption] = useState("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const range =
        dateRangeOption === "custom"
          ? { start_date: customStartDate, end_date: customEndDate }
          : getDateRange(dateRangeOption);

      const filter: AnalyticsFilter = {
        start_date: range.start_date,
        end_date: range.end_date,
      };

      const [overview, daily, agents, users, hourly] = await Promise.all([
        analyticsApi.getOverviewStats(filter),
        analyticsApi.getDailyStats(filter),
        analyticsApi.getAgentStats(filter),
        analyticsApi.getUserStats(filter),
        analyticsApi.getHourlyDistribution(filter),
      ]);

      setOverviewStats(overview ?? null);
      setDailyStats(Array.isArray(daily) ? daily : []);
      setAgentStats(Array.isArray(agents) ? agents : []);
      setUserStats(Array.isArray(users) ? users : []);
      setHourlyDistribution(Array.isArray(hourly) ? hourly : []);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRangeOption, customStartDate, customEndDate]);

  useEffect(() => {
    if (dateRangeOption !== "custom" || (customStartDate && customEndDate)) {
      loadStats();
    }
  }, [loadStats, dateRangeOption, customStartDate, customEndDate]);

  const handleExport = async (format: "csv" | "json") => {
    const range =
      dateRangeOption === "custom"
        ? { start_date: customStartDate, end_date: customEndDate }
        : getDateRange(dateRangeOption);

    const filter: AnalyticsFilter = {
      start_date: range.start_date,
      end_date: range.end_date,
    };

    const data = await analyticsApi.exportData(format, filter);
    const blob = new Blob([data], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.${format}`;
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

  // Compute trend (simple: last 7 days vs previous 7 days)
  const calculateTrend = (data: DailyStats[], key: keyof DailyStats) => {
    if (data.length < 14) return 0;
    const recent = data
      .slice(-7)
      .reduce(
        (sum, d) => sum + (typeof d[key] === "number" ? (d[key] as number) : 0),
        0,
      );
    const previous = data
      .slice(-14, -7)
      .reduce(
        (sum, d) => sum + (typeof d[key] === "number" ? (d[key] as number) : 0),
        0,
      );
    if (previous === 0) return 0;
    return ((recent - previous) / previous) * 100;
  };

  const maxHourlyCount = hourlyDistribution?.length
    ? Math.max(...hourlyDistribution.map((h) => h.count))
    : 0;

  const loadingView = (
    <div className="flex items-center justify-center h-64">
      <Spin size="large" />
    </div>
  );

  const tabItems = [
    {
      key: "overview",
      label: (
        <span className="flex items-center gap-1.5">
          <BarChartOutlined />
          {t("使用概览")}
        </span>
      ),
      children: loading ? (
        loadingView
      ) : (
        <OverviewTab
          stats={overviewStats}
          dailyStats={dailyStats}
          hourlyDistribution={hourlyDistribution}
          calculateTrend={calculateTrend}
          formatNumber={formatNumber}
          formatCurrency={formatCurrency}
          maxHourlyCount={maxHourlyCount}
        />
      ),
    },
    {
      key: "agents",
      label: (
        <span className="flex items-center gap-1.5">
          <ThunderboltOutlined />
          {t("Agent 统计")}
        </span>
      ),
      children: loading ? (
        loadingView
      ) : (
        <AgentsTab
          stats={agentStats}
          formatNumber={formatNumber}
          formatCurrency={formatCurrency}
        />
      ),
    },
    {
      key: "users",
      label: (
        <span className="flex items-center gap-1.5">
          <UserOutlined />
          {t("用户统计")}
        </span>
      ),
      children: loading ? (
        loadingView
      ) : (
        <UsersTab stats={userStats} formatNumber={formatNumber} />
      ),
    },
  ];

  return (
    <PageContainer
      title={t("统计分析")}
      description={t("查看使用数据和趋势分析")}
      headerActions={
        <Space wrap>
          <Select
            value={dateRangeOption}
            onChange={setDateRangeOption}
            options={dateRangeOptions.map((opt) => ({
              value: opt.value,
              label: t(opt.label),
            }))}
            style={{ minWidth: 120 }}
          />
          {dateRangeOption === "custom" && (
            <DatePicker.RangePicker
              value={[
                customStartDate ? dayjs(customStartDate) : null,
                customEndDate ? dayjs(customEndDate) : null,
              ]}
              onChange={(dates) => {
                setCustomStartDate(dates?.[0]?.format("YYYY-MM-DD") ?? "");
                setCustomEndDate(dates?.[1]?.format("YYYY-MM-DD") ?? "");
              }}
            />
          )}
          <Button
            icon={<SyncOutlined spin={loading} />}
            onClick={loadStats}
            loading={loading}
          >
            {t("刷新")}
          </Button>
          <Dropdown
            menu={{
              items: [
                { key: "csv", label: t("导出 CSV") },
                { key: "json", label: t("导出 JSON") },
              ],
              onClick: ({ key }) => handleExport(key as "csv" | "json"),
            }}
          >
            <Button type="primary" icon={<DownloadOutlined />}>
              {t("导出")}
              <DownOutlined className="text-xs" />
            </Button>
          </Dropdown>
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        items={tabItems}
      />
    </PageContainer>
  );
}

// Rank badge with medal colors for the top three
function renderRank(index: number) {
  const cls =
    index === 0
      ? "bg-yellow-500/10 text-yellow-500"
      : index === 1
        ? "bg-gray-400/10 text-gray-400"
        : index === 2
          ? "bg-orange-500/10 text-orange-500"
          : "text-[var(--color-text-tertiary)]";
  return (
    <span
      className={`w-6 h-6 flex items-center justify-center rounded text-xs font-medium ${cls}`}
    >
      {index + 1}
    </span>
  );
}

// Overview tab
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
  const { t } = useTranslation();

  if (!stats) return null;

  const conversationTrend = calculateTrend(dailyStats, "conversations");
  const tokenTrend = calculateTrend(dailyStats, "tokens");
  const costTrend = calculateTrend(dailyStats, "cost");
  const maxTokens = Math.max(...dailyStats.map((d) => d.tokens), 1);

  return (
    <div className="space-y-6">
      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageOutlined />}
          label={t("总对话数")}
          value={formatNumber(stats.total_conversations)}
          trend={conversationTrend}
          color="blue"
        />
        <StatCard
          icon={<ApiOutlined />}
          label={t("总 Tokens")}
          value={formatNumber(stats.total_tokens)}
          subValue={t("输入 {{in}} / 输出 {{out}}", {
            in: formatNumber(stats.input_tokens),
            out: formatNumber(stats.output_tokens),
          })}
          trend={tokenTrend}
          color="green"
        />
        <StatCard
          icon={<ClockCircleOutlined />}
          label={t("平均响应时间")}
          value={`${stats.avg_response_time}ms`}
          subValue={t("成功率 {{rate}}%", { rate: stats.success_rate })}
          color="orange"
        />
        <StatCard
          icon={<DollarOutlined />}
          label={t("预估费用")}
          value={formatCurrency(stats.total_cost)}
          trend={costTrend}
          color="purple"
        />
      </div>

      {/* Trend chart (custom bar chart, no chart library in the project) */}
      <Card title={t("使用趋势")} className="rounded-lg">
        <div className="h-48 flex items-end gap-1">
          {dailyStats.slice(-14).map((day, index) => {
            const height = (day.tokens / maxTokens) * 100;
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center justify-end"
                title={`${day.date}: ${formatNumber(day.tokens)} tokens`}
              >
                <div
                  className="w-full bg-[var(--color-primary)] rounded-t"
                  style={{ height: `${height}%`, minHeight: "4px" }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-[var(--color-text-tertiary)]">
          <span>{dailyStats[dailyStats.length - 14]?.date || ""}</span>
          <span>{dailyStats[dailyStats.length - 1]?.date || ""}</span>
        </div>
      </Card>

      {/* Hourly distribution heatmap */}
      <Card title={t("24小时使用分布")} className="rounded-lg">
        <div className="grid grid-cols-24 gap-1">
          {hourlyDistribution.map((hour) => {
            const intensity = (hour.count / (maxHourlyCount || 1)) * 100;
            return (
              <div
                key={hour.hour}
                className="h-8 rounded"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${intensity / 100})`,
                }}
                title={t("{{hour}}:00 - {{count}} 次调用", {
                  hour: hour.hour,
                  count: hour.count,
                })}
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
      </Card>
    </div>
  );
}

// Agent statistics tab
function AgentsTab({
  stats,
  formatNumber,
  formatCurrency,
}: {
  stats: AgentStats[];
  formatNumber: (num: number) => string;
  formatCurrency: (num: number) => string;
}) {
  const { t } = useTranslation();
  const maxConversations = Math.max(...stats.map((s) => s.conversations), 1);

  const columns: TableProps<AgentStats>["columns"] = [
    {
      title: t("排名"),
      width: 64,
      render: (_, __, index) => renderRank(index),
    },
    {
      title: t("Agent"),
      dataIndex: "agent_name",
      render: (name: string) => (
        <Text strong className="text-[var(--color-text-primary)]">
          {name}
        </Text>
      ),
    },
    {
      title: t("对话数"),
      dataIndex: "conversations",
      align: "right",
      render: (_, record) => (
        <div className="flex items-center justify-end gap-2">
          <span>{formatNumber(record.conversations)}</span>
          <div className="w-16">
            <Progress
              percent={Math.round((record.conversations / maxConversations) * 100)}
              showInfo={false}
              size="small"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Tokens",
      dataIndex: "tokens",
      align: "right",
      render: (tokens: number) => formatNumber(tokens),
    },
    {
      title: t("平均响应"),
      dataIndex: "avg_response_time",
      align: "right",
      render: (ms: number) => `${ms}ms`,
    },
    {
      title: t("成功率"),
      dataIndex: "success_rate",
      align: "right",
      render: (rate: number) => `${rate.toFixed(1)}%`,
    },
    {
      title: t("费用"),
      dataIndex: "cost",
      align: "right",
      render: (cost: number) => formatCurrency(cost),
    },
  ];

  return (
    <Card className="rounded-lg">
      <Table<AgentStats>
        rowKey="agent_id"
        columns={columns}
        dataSource={stats}
        pagination={false}
        size="middle"
      />
    </Card>
  );
}

// User statistics tab
function UsersTab({
  stats,
  formatNumber,
}: {
  stats: UserStats[];
  formatNumber: (num: number) => string;
}) {
  const { t } = useTranslation();
  const maxConversations = Math.max(...stats.map((s) => s.conversations), 1);

  // Group by department
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
    {} as Record<
      string,
      { conversations: number; tokens: number; users: number }
    >,
  );

  const columns: TableProps<UserStats>["columns"] = [
    {
      title: t("排名"),
      width: 64,
      render: (_, __, index) => renderRank(index),
    },
    {
      title: t("用户"),
      dataIndex: "user_name",
      render: (name: string) => (
        <Text strong className="text-[var(--color-text-primary)]">
          {name}
        </Text>
      ),
    },
    {
      title: t("部门"),
      dataIndex: "department",
    },
    {
      title: t("对话数"),
      dataIndex: "conversations",
      align: "right",
      render: (_, record) => (
        <div className="flex items-center justify-end gap-2">
          <span>{formatNumber(record.conversations)}</span>
          <div className="w-16">
            <Progress
              percent={Math.round((record.conversations / maxConversations) * 100)}
              showInfo={false}
              size="small"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Tokens",
      dataIndex: "tokens",
      align: "right",
      render: (tokens: number) => formatNumber(tokens),
    },
    {
      title: t("平均响应"),
      dataIndex: "avg_response_time",
      align: "right",
      render: (ms: number) => `${ms}ms`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Department summary */}
      <Card title={t("部门使用统计")} className="rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(departmentStats).map(([dept, data]) => (
            <Card key={dept} size="small" className="rounded-lg">
              <Text strong className="text-sm">
                {dept}
              </Text>
              <div className="text-lg font-semibold text-[var(--color-primary)] mt-1">
                {formatNumber(data.conversations)}
              </div>
              <Text type="secondary" className="text-xs">
                {data.users} {t("用户")} • {formatNumber(data.tokens)} tokens
              </Text>
            </Card>
          ))}
        </div>
      </Card>

      {/* User leaderboard */}
      <Card className="rounded-lg">
        <Table<UserStats>
          rowKey="user_id"
          columns={columns}
          dataSource={stats.slice(0, 10)}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
}
