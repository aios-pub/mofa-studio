/**
 * Dashboard page
 * Provides overview statistics and quick actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Row,
  Col,
  Button,
  Progress,
  Tag,
  Typography,
  Tooltip,
  Spin,
} from 'antd';
import {
  MessageOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  LineChartOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import FirstRunGuide from '@/components/onboarding/FirstRunGuide';
import { PageContainer } from '@/components/layout';
import {
  analyticsApi,
  monitoringApi,
  type UsageStats,
  type DailyStats,
  type AgentStatus,
} from '@/services';

const { Text } = Typography;

export default function Dashboard() {
  const { t } = useTranslation();

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

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0';
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
      typeof current !== 'number' ||
      typeof previous !== 'number' ||
      previous === 0
    )
      return 0;
    return ((current - previous) / previous) * 100;
  };

  // Statistics card configuration
  const statCards = stats
    ? [
        {
          title: t('今日对话'),
          value: formatNumber(
            dailyStats[dailyStats.length - 1]?.conversations || 0,
          ),
          change: calculateTrend(dailyStats, 'conversations'),
          icon: MessageOutlined,
          color: '#3b82f6',
          chartData: dailyStats.map((d) => d.conversations),
        },
        {
          title: t('Token 消耗'),
          value: formatNumber(stats.total_tokens),
          change: calculateTrend(dailyStats, 'tokens'),
          icon: ThunderboltOutlined,
          color: '#8b5cf6',
          chartData: dailyStats.map((d) => d.tokens),
        },
        {
          title: t('平均响应'),
          value: `${((stats.avg_response_time || 0) / 1000).toFixed(1)}s`,
          change: -calculateTrend(dailyStats, 'avg_response_time'), // lower response time is better
          icon: ClockCircleOutlined,
          color: '#f59e0b',
          chartData: dailyStats.map((d) => d.avg_response_time),
        },
        {
          title: t('成功率'),
          value: `${(stats.success_rate || 100).toFixed(1)}%`,
          change: calculateTrend(dailyStats, 'success_rate'),
          icon: CheckCircleOutlined,
          color: '#22c55e',
          chartData: dailyStats.map((d) => d.success_rate || 0),
        },
      ]
    : [];

  // Quick actions
  const quickActions = [
    {
      label: t('新建对话'),
      description: t('开始新的 AI 对话'),
      icon: MessageOutlined,
      path: '/conversation',
    },
    {
      label: t('创建 Agent'),
      description: t('构建新的智能助手'),
      icon: RobotOutlined,
      path: '/management/agents',
    },
    {
      label: t('查看分析'),
      description: t('查看使用统计数据'),
      icon: LineChartOutlined,
      path: '/analytics',
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <FirstRunGuide />
      
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] p-6">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">
              {t(new Date().getHours() < 12 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好')}，{t('欢迎使用 mofa-studio')}
            </h2>
            <p className="text-white/80 text-sm mb-4">
              {t('强大的 AI Agent 管理平台，助您构建智能对话系统。探索无限可能。')}
            </p>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
              <RobotOutlined className="text-5xl text-white/80" />
            </div>
          </div>
        </div>
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
      </div>

      {/* Main content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Statistics cards */}
          <Row gutter={[16, 16]}>
            {statCards.map((card, index) => {
              const Icon = card.icon;
              const trend = card.change;
              return (
                <Col key={index} xs={24} sm={12} xl={6}>
                  <Card
                    className="transition-all hover:shadow-md"
                    styles={{ body: { padding: '16px' } }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${card.color}15` }}>
                        <Icon className="text-xl" style={{ color: card.color }} />
                      </div>
                      {trend !== 0 && (
                        <Tooltip
                          title={t(
                            trend > 0
                              ? '较昨日增长 {{percent}}%'
                              : '较昨日下降 {{percent}}%',
                            { percent: Math.abs(trend).toFixed(1) },
                          )}
                        >
                          <span className={`flex items-center gap-0.5 text-xs ${
                            trend > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {trend > 0 ? <RiseOutlined /> : trend < 0 ? <FallOutlined /> : <MinusOutlined />}
                            {Math.abs(trend).toFixed(1)}%
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    <div className="text-2xl font-semibold text-[var(--color-text-primary)]">
                      {card.value}
                    </div>
                    <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                      {card.title}
                    </div>
                    {/* Mini chart */}
                    <div className="mt-3 h-8">
                      <Progress
                        type="line"
                        percent={100}
                        showInfo={false}
                        strokeColor={card.color}
                        trailColor="transparent"
                      />
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <Row gutter={[16, 16]}>
            {/* Agent status */}
            <Col xs={24} lg={12}>
              <PageContainer
                title={t('Agent 状态')}
                headerActions={
                  <Link to="/monitoring">
                    <Button type="link" icon={<ArrowRightOutlined />}>
                      {t('查看详情')}
                    </Button>
                  </Link>
                }
              >
                <div className="space-y-3">
                  {agentStatuses.slice(0, 5).map((agent) => (
                    <div
                      key={agent.agent_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg-secondary)]"
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
                        <Text strong className="text-[var(--color-text-primary)]">
                          {agent.agent_name}
                        </Text>
                        <Tag color={
                          agent.status === 'online' ? 'green' :
                          agent.status === 'busy' ? 'orange' :
                          agent.status === 'error' ? 'red' : 'default'
                        }>
                          {agent.status}
                        </Tag>
                      </div>
                      <Text type="secondary" className="text-sm">
                        {agent.metrics?.conversations_today ?? 0} {t('对话')}
                      </Text>
                    </div>
                  ))}
                </div>
              </PageContainer>
            </Col>

            {/* Quick actions */}
            <Col xs={24} lg={12}>
              <PageContainer title={t('快捷操作')}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link key={action.path} to={action.path}>
                        <Card
                          hoverable
                          className="h-full transition-all hover:border-[var(--color-primary)]"
                          styles={{ body: { padding: '16px' } }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-[var(--color-primary)]/10">
                              <Icon className="text-lg text-[var(--color-primary)]" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-[var(--color-text-primary)]">
                                {action.label}
                              </div>
                              <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
                                {action.description}
                              </div>
                            </div>
                            <ArrowRightOutlined className="text-[var(--color-text-tertiary)]" />
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </PageContainer>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
