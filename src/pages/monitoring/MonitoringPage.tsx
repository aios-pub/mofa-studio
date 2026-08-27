/**
 * Real-time monitoring page
 * Monitors Agent status and system metrics
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertOutlined,
  ExclamationCircleOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  WifiOutlined,
  UnorderedListOutlined,
  BellOutlined,
  BellFilled,
  SyncOutlined,
  ThunderboltOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  ExperimentOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Tabs,
  Card,
  Tag,
  Typography,
  Space,
  Button,
  Badge,
  Spin,
  Empty,
} from 'antd';
import type { TFunction } from 'i18next';
import type {
  AgentStatus,
  ActivityEvent,
  SystemMetrics,
  Alert,
} from '@/services';
import { monitoringApi } from '@/services';
import { PageContainer } from '@/components/layout';
import { StatCard } from '@/components/common';
import type { StatColor } from '@/components/common';

const { Text } = Typography;

export default function MonitoringPage() {
  const { t } = useTranslation();

  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'agents' | 'activity' | 'alerts'>('agents');

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statuses, events, metrics, alertsData] = await Promise.all([
        monitoringApi.getAgentStatuses(),
        monitoringApi.getActivityEvents(20),
        monitoringApi.getSystemMetrics(),
        monitoringApi.getAlerts(),
      ]);
      setAgentStatuses(statuses);
      setActivityEvents(events);
      setSystemMetrics(metrics);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const unsubscribeEvents = monitoringApi.subscribeToUpdates((event: ActivityEvent) => {
      setActivityEvents((prev) => [event, ...prev].slice(0, 50));
    });

    const unsubscribeMetrics = monitoringApi.subscribeToMetrics((metrics: SystemMetrics) => {
      setSystemMetrics(metrics);
    });

    return () => {
      unsubscribeEvents();
      unsubscribeMetrics();
    };
  }, [loadData]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    const success = await monitoringApi.acknowledgeAlert(alertId);
    if (success) {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)));
    }
  };

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);

  const tabItems = [
    {
      key: 'agents',
      label: (
        <span className="flex items-center gap-1.5">
          <ThunderboltOutlined />
          {t('Agent 状态')}
          <Badge count={agentStatuses.filter((a) => a.status === 'online').length} color="green" />
        </span>
      ),
      children: <AgentsTab agents={agentStatuses} loading={loading} />,
    },
    {
      key: 'activity',
      label: (
        <span className="flex items-center gap-1.5">
          <AlertOutlined />
          {t('活动流')}
        </span>
      ),
      children: <ActivityTab events={activityEvents} loading={loading} />,
    },
    {
      key: 'alerts',
      label: (
        <span className="flex items-center gap-1.5">
          <BellOutlined />
          {t('告警')}
          <Badge count={unacknowledgedAlerts.length} color="red" />
        </span>
      ),
      children: <AlertsTab alerts={alerts} onAcknowledge={handleAcknowledgeAlert} loading={loading} />,
    },
  ];

  return (
    <PageContainer
      title={t('实时监控')}
      description={t('监控 Agent 状态和系统运行情况')}
      headerActions={
        <Space>
          {unacknowledgedAlerts.length > 0 && (
            <Tag color="error" icon={<ExclamationCircleOutlined />}>
              {unacknowledgedAlerts.length} {t('个未处理告警')}
            </Tag>
          )}
          <Button icon={<SyncOutlined spin={loading} />} onClick={loadData} loading={loading}>
            {t('刷新')}
          </Button>
        </Space>
      }
    >
      {/* System metrics bar */}
      {systemMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard icon={<DashboardOutlined />} label="CPU" value={`${systemMetrics.cpu.toFixed(1)}%`} color={getThresholdColor(systemMetrics.cpu, 70, 50)} />
          <StatCard icon={<DatabaseOutlined />} label={t('内存')} value={`${systemMetrics.memory.toFixed(1)}%`} color={getThresholdColor(systemMetrics.memory, 80, 60)} />
          <StatCard icon={<WifiOutlined />} label={t('网络')} value={`${systemMetrics.network.toFixed(1)}%`} color="blue" />
          <StatCard icon={<AlertOutlined />} label={t('活跃连接')} value={systemMetrics.active_connections.toString()} color="blue" />
          <StatCard icon={<UnorderedListOutlined />} label={t('队列长度')} value={systemMetrics.queue_length.toString()} color={systemMetrics.queue_length > 10 ? 'orange' : 'green'} />
        </div>
      )}

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as typeof activeTab)} items={tabItems} />
    </PageContainer>
  );
}

// Get threshold color
function getThresholdColor(value: number, high: number, medium: number): StatColor {
  if (value > high) return 'red';
  if (value > medium) return 'orange';
  return 'green';
}

// Agents tab component
function AgentsTab({
  agents,
  loading,
}: {
  agents: AgentStatus[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : agents.length === 0 ? (
        <Empty description={t('暂无 Agent 数据')} className="py-8" />
      ) : (
        agents.map((agent) => (
          <Card key={agent.agent_id} className="rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  agent.status === 'online' ? 'bg-green-500' :
                  agent.status === 'busy' ? 'bg-yellow-500' :
                  agent.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                <div>
                  <Text strong className="text-[var(--color-text-primary)]">{agent.agent_name}</Text>
                  <Text type="secondary" className="text-xs ml-2">{agent.agent_id}</Text>
                </div>
              </div>
              <Tag color={
                agent.status === 'online' ? 'green' :
                agent.status === 'busy' ? 'orange' :
                agent.status === 'error' ? 'red' : 'default'
              }>
                {agent.status}
              </Tag>
            </div>
            {agent.metrics && (
              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <Text type="secondary">{t('对话数')}:</Text>
                  <Text className="ml-2">{agent.metrics.conversations_today ?? 0}</Text>
                </div>
                <div>
                  <Text type="secondary">{t('响应时间')}:</Text>
                  <Text className="ml-2">{agent.metrics.avg_response_time ?? 0}ms</Text>
                </div>
                <div>
                  <Text type="secondary">{t('成功率')}:</Text>
                  <Text className={`ml-2 ${(agent.metrics.success_rate || 100) >= 95 ? 'text-green-500' : 'text-yellow-500'}`}>
                    {agent.metrics.success_rate || 100}%
                  </Text>
                </div>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

// Activity tab component
function ActivityTab({
  events,
  loading,
}: {
  events: ActivityEvent[];
  loading: boolean;
}) {
  const { t } = useTranslation();
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'conversation': return <MessageOutlined className="text-blue-500" />;
      case 'agent_start': return <PlayCircleOutlined className="text-green-500" />;
      case 'agent_end': return <ExperimentOutlined className="text-purple-500" />;
      case 'tool_call': return <ThunderboltOutlined className="text-orange-500" />;
      default: return <AlertOutlined className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : events.length === 0 ? (
        <Empty description={t('暂无活动记录')} className="py-8" />
      ) : (
        events.map((event, index) => (
          <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)]">
            <div className="mt-0.5">{getEventIcon(event.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Text strong className="text-[var(--color-text-primary)]">{event.title ?? event.agent_name ?? event.type}</Text>
                <Text type="secondary" className="text-xs">{formatTime(event.timestamp, t)}</Text>
              </div>
              {event.details && (
                <Text className="text-sm text-[var(--color-text-secondary)] block mt-1">{event.details}</Text>
              )}
              {event.user_name && (
                <Text type="secondary" className="text-xs block mt-1">{t('用户')}: {event.user_name}</Text>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Alerts tab component
function AlertsTab({
  alerts,
  onAcknowledge,
  loading,
}: {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <ExclamationCircleOutlined className="text-red-500" />;
      case 'warning': return <WarningOutlined className="text-yellow-500" />;
      case 'info': return <BellOutlined className="text-blue-500" />;
      default: return <AlertOutlined className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : alerts.length === 0 ? (
        <Empty description={t('暂无告警')} className="py-8" />
      ) : (
        alerts.map((alert) => (
          <Card
            key={alert.id}
            className={`rounded-lg ${
              alert.acknowledged
                ? 'opacity-60'
                : alert.type === 'error'
                  ? 'border-red-500/30 bg-red-500/5'
                  : alert.type === 'warning'
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Text strong className="text-[var(--color-text-primary)]">{alert.title}</Text>
                  {alert.acknowledged && (
                    <Tag color="success">{t('已处理')}</Tag>
                  )}
                </div>
                <Text className="text-sm text-[var(--color-text-secondary)] block mt-1">{alert.message}</Text>
                {alert.agent_name && (
                  <Text type="secondary" className="text-xs block mt-2">{t('相关 Agent')}: {alert.agent_name}</Text>
                )}
                <Text type="secondary" className="text-xs block mt-1">{formatTime(alert.timestamp, t)}</Text>
              </div>
              {!alert.acknowledged && (
                <Button size="small" icon={<BellFilled />} onClick={() => onAcknowledge(alert.id)}>
                  {t('确认')}
                </Button>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// Format time as a human-friendly relative label
function formatTime(date: Date | string, t: TFunction) {
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diff = now.getTime() - dateObj.getTime();

  if (diff < 60000) return t('刚刚');
  if (diff < 3600000) return t('{{n}} 分钟前', { n: Math.floor(diff / 60000) });
  if (diff < 86400000) return t('{{n}} 小时前', { n: Math.floor(diff / 3600000) });
  return dateObj.toLocaleDateString();
}
