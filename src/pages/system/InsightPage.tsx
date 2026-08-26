/**
 * Insights page
 * Show performance and usage analytics of the AI agent system
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Select, Button, Space, Table, Tag, Progress, Tooltip } from 'antd';
import {
  DownloadOutlined,
  SyncOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  AimOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { UsageStats as ApiUsageStats, DailyStats as ApiDailyStats } from '@/services';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/common';
import { analyticsApi, agentApi } from '@/services';

// Time range options
const timeOptions = [
  { label: '今天', value: 'day' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
];

// Statistics card component
interface StatCardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, change, changeLabel, icon, color }: StatCardProps) {
  const isPositive = change >= 0;

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-[var(--color-text-secondary)]">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <div className="flex items-center gap-1 text-sm">
            {isPositive ? (
              <RiseOutlined className="text-green-500" />
            ) : (
              <FallOutlined className="text-red-500" />
            )}
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {isPositive ? '+' : ''}{change}%
            </span>
            <span className="text-[var(--color-text-tertiary)]">{changeLabel}</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// Bar chart component
function SimpleBarChart({ data }: { data: { label: string; value: number }[] }) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="truncate max-w-[200px]">{item.label}</span>
            <span className="font-medium">{item.value.toLocaleString()}</span>
          </div>
          <Progress
            percent={(item.value / maxValue) * 100}
            showInfo={false}
            strokeColor="var(--color-primary)"
          />
        </div>
      ))}
    </div>
  );
}

// Ring chart component
function SimpleDonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {  const { t } = useTranslation();

  const total = data.reduce((acc, item) => acc + item.value, 0);
  let cumulativePercent = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          {data.map((item, index) => {
            const percent = (item.value / total) * 100;
            const dashArray = `${percent} ${100 - percent}`;
            const dashOffset = -cumulativePercent;
            cumulativePercent += percent;

            return (
              <circle
                key={index}
                cx="18"
                cy="18"
                r="15.9"
                fill="transparent"
                stroke={item.color}
                strokeWidth="3"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-bold">{total.toLocaleString()}</div>
            <div className="text-xs text-[var(--color-text-tertiary)]">{t("总计")}</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 flex-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm">{item.label}</span>
            </div>
            <div className="text-sm font-medium">
              {item.value.toLocaleString()}
              <span className="text-[var(--color-text-tertiary)] ml-1">
                ({((item.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Bar chart component
function SimpleColumnChart({ data }: { data: { date: string; value: number }[] }) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className="h-48 flex items-end gap-2">
      {data.map((item, index) => {
        const height = ((item.value - minValue) / range) * 100 + 10;
        return (
          <Tooltip key={index} title={`${item.date}: ${item.value.toLocaleString()}`}>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-[var(--color-primary)] rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                style={{ height: `${height}%` }}
              />
              <span className="text-xs text-[var(--color-text-tertiary)]">{item.date}</span>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}

// Default data (used before the API returns)
const defaultStats = {
  totalConversations: 0,
  conversationsChange: 0,
  avgResponseTime: 0,
  responseTimeChange: 0,
  successRate: 0,
  successRateChange: 0,
  totalTokens: 0,
  tokensChange: 0,
};

export default function InsightPage() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(defaultStats);
  const [agentPerformance, setAgentPerformance] = useState<{ label: string; value: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; value: number }[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [overview, daily, agents] = await Promise.all([
        analyticsApi.getOverviewStats().catch(() => null),
        analyticsApi.getDailyStats().catch(() => []),
        agentApi.getAll().catch(() => []),
      ]);
      if (overview) {
        const s = overview as ApiUsageStats;
        setStats({
          totalConversations: s.total_conversations ?? 0,
          conversationsChange: 0,
          avgResponseTime: s.avg_response_time ?? 0,
          responseTimeChange: 0,
          successRate: s.success_rate ?? 0,
          successRateChange: 0,
          totalTokens: s.total_tokens ?? 0,
          tokensChange: 0,
        });
      }
      if (Array.isArray(daily) && daily.length > 0) {
        setDailyData((daily as ApiDailyStats[]).map((d) => ({
          date: d.date?.slice(5) || '',
          value: d.conversations ?? 0,
        })));
      }
      if (Array.isArray(agents) && agents.length > 0) {
        setAgentPerformance(agents.slice(0, 5).map((a: any) => ({
          label: a.name,
          value: 0,
        })));
      }
    } catch (error) {
      console.error('Failed to load insight data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => loadData();

  const intentDistribution = [
    { label: '产品咨询', value: 4500, color: '#3b82f6' },
    { label: '技术支持', value: 3200, color: '#22c55e' },
    { label: '投诉处理', value: 1800, color: '#f59e0b' },
    { label: '订单查询', value: 1500, color: '#8b5cf6' },
    { label: '其他', value: 1200, color: '#6b7280' },
  ];

  const topUsers: { id: number; name: string; conversations: number; tokens: number; lastActive: string }[] = [];

  const userColumns: ColumnsType<typeof topUsers[0]> = [
    {
      title: t('insight.userName', '用户'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-medium">
            {name[0]}
          </div>
          <span>{name}</span>
        </div>
      ),
    },
    {
      title: t('insight.conversations', '对话数'),
      dataIndex: 'conversations',
      key: 'conversations',
      render: (val: number) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: t('insight.tokens', 'Token 消耗'),
      dataIndex: 'tokens',
      key: 'tokens',
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: t('insight.lastActive', '最后活跃'),
      dataIndex: 'lastActive',
      key: 'lastActive',
      render: (val: string) => <span className="text-[var(--color-text-secondary)]">{val}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('insight.title', '洞察分析')}
        description={t('insight.subtitle', 'AI Agent 系统性能和使用数据分析')}
        icon={<BarChartOutlined className="text-xl" />}
        actions={
          <Space>
            <Select
              value={timeRange}
              onChange={setTimeRange}
              options={timeOptions}
              style={{ width: 120 }}
            />
            <Button icon={<DownloadOutlined />}>
              {t('common.export', '导出')}
            </Button>
            <Button type="primary" icon={<SyncOutlined spin={loading} />} onClick={handleRefresh} loading={loading}>
              {t('common.refresh', '刷新')}
            </Button>
          </Space>
        }
      />

      {/* Core metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('insight.totalConversations', '总对话数')}
            value={stats.totalConversations.toLocaleString()}
            change={stats.conversationsChange}
            changeLabel={t('insight.vsLastWeek', '较上周')}
            icon={<MessageOutlined className="text-xl text-white" />}
            color="bg-blue-500"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('insight.avgResponseTime', '平均响应时间')}
            value={`${stats.avgResponseTime}s`}
            change={stats.responseTimeChange}
            changeLabel={t('insight.vsLastWeek', '较上周')}
            icon={<ClockCircleOutlined className="text-xl text-white" />}
            color="bg-green-500"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('insight.successRate', '成功率')}
            value={`${stats.successRate}%`}
            change={stats.successRateChange}
            changeLabel={t('insight.vsLastWeek', '较上周')}
            icon={<AimOutlined className="text-xl text-white" />}
            color="bg-purple-500"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('insight.totalTokens', 'Token 消耗')}
            value={(stats.totalTokens / 1000000).toFixed(2) + 'M'}
            change={stats.tokensChange}
            changeLabel={t('insight.vsLastWeek', '较上周')}
            icon={<ThunderboltOutlined className="text-xl text-white" />}
            color="bg-orange-500"
          />
        </Col>
      </Row>

      {/* Chart area */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={t('insight.dailyTrend', '每日对话趋势')} className="h-full">
            <SimpleColumnChart data={dailyData} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={t('insight.intentDistribution', '意图分布')} className="h-full">
            <SimpleDonutChart data={intentDistribution} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={t('insight.agentPerformance', 'Agent 性能排行')}>
            <SimpleBarChart data={agentPerformance} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('insight.topUsers', '活跃用户排行')}>
            <Table
              columns={userColumns}
              dataSource={topUsers}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
