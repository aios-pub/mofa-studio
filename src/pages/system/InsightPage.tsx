/**
 * 洞察分析页面
 * 显示 AI Agent 系统的性能和使用数据分析
 */

import { useState } from 'react';
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
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/common';

// 时间范围选项
const timeOptions = [
  { label: '今天', value: 'day' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
];

// 统计卡片组件
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

// 条形图组件
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

// 环形图组件
function SimpleDonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
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
            <div className="text-xs text-[var(--color-text-tertiary)]">总计</div>
          </div>
        </div>
      </div>

      {/* 图例 */}
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

// 柱状图组件
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

// Mock 数据
const mockStats = {
  totalConversations: 12584,
  conversationsChange: 12.5,
  avgResponseTime: 1.8,
  responseTimeChange: -8.3,
  successRate: 98.5,
  successRateChange: 2.1,
  totalTokens: 2456789,
  tokensChange: 15.8,
};

const mockAgentPerformance = [
  { label: 'CustomerService-v2', value: 4521 },
  { label: 'SalesAssistant', value: 3842 },
  { label: 'TechnicalSupport', value: 2156 },
  { label: 'DataAnalyst', value: 1842 },
  { label: 'CodeHelper', value: 1235 },
];

const mockIntentDistribution = [
  { label: '产品咨询', value: 4500, color: '#3b82f6' },
  { label: '技术支持', value: 3200, color: '#22c55e' },
  { label: '投诉处理', value: 1800, color: '#f59e0b' },
  { label: '订单查询', value: 1500, color: '#8b5cf6' },
  { label: '其他', value: 1200, color: '#6b7280' },
];

const mockDailyData = [
  { date: '01/09', value: 1200 },
  { date: '01/10', value: 1450 },
  { date: '01/11', value: 1380 },
  { date: '01/12', value: 1680 },
  { date: '01/13', value: 1920 },
  { date: '01/14', value: 2100 },
  { date: '01/15', value: 2450 },
];

const mockTopUsers = [
  { id: 1, name: '张三', conversations: 256, tokens: 125000, lastActive: '10分钟前' },
  { id: 2, name: '李四', conversations: 198, tokens: 98000, lastActive: '30分钟前' },
  { id: 3, name: '王五', conversations: 156, tokens: 76000, lastActive: '1小时前' },
  { id: 4, name: '赵六', conversations: 134, tokens: 65000, lastActive: '2小时前' },
  { id: 5, name: '钱七', conversations: 112, tokens: 54000, lastActive: '3小时前' },
];

export default function InsightPage() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const userColumns: ColumnsType<typeof mockTopUsers[0]> = [
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

      {/* 核心指标 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('insight.totalConversations', '总对话数')}
            value={mockStats.totalConversations.toLocaleString()}
            change={mockStats.conversationsChange}
            changeLabel={t('insight.vsLastWeek', '较上周')}
            icon={<MessageOutlined className="text-xl text-white" />}
            color="bg-blue-500"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('insight.avgResponseTime', '平均响应时间')}
            value={`${mockStats.avgResponseTime}s`}
            change={mockStats.responseTimeChange}
            changeLabel={t('insight.vsLastWeek', '较上周')}
            icon={<ClockCircleOutlined className="text-xl text-white" />}
            color="bg-green-500"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('insight.successRate', '成功率')}
            value={`${mockStats.successRate}%`}
            change={mockStats.successRateChange}
            changeLabel={t('insight.vsLastWeek', '较上周')}
            icon={<AimOutlined className="text-xl text-white" />}
            color="bg-purple-500"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={t('insight.totalTokens', 'Token 消耗')}
            value={(mockStats.totalTokens / 1000000).toFixed(2) + 'M'}
            change={mockStats.tokensChange}
            changeLabel={t('insight.vsLastWeek', '较上周')}
            icon={<ThunderboltOutlined className="text-xl text-white" />}
            color="bg-orange-500"
          />
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={t('insight.dailyTrend', '每日对话趋势')} className="h-full">
            <SimpleColumnChart data={mockDailyData} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={t('insight.intentDistribution', '意图分布')} className="h-full">
            <SimpleDonutChart data={mockIntentDistribution} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={t('insight.agentPerformance', 'Agent 性能排行')}>
            <SimpleBarChart data={mockAgentPerformance} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('insight.topUsers', '活跃用户排行')}>
            <Table
              columns={userColumns}
              dataSource={mockTopUsers}
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
