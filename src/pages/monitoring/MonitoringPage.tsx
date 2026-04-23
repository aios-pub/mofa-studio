/**
 * 实时监控页面
 */

import { useState, useEffect, useCallback } from "react";
import {
  AlertOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
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
} from "@ant-design/icons";
import type {
  AgentStatus,
  ActivityEvent,
  SystemMetrics,
  Alert,
} from "@/services";
import { monitoringApi } from "@/services";

export default function MonitoringPage() {
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(
    null,
  );
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"agents" | "activity" | "alerts">(
    "agents",
  );

  // 加载初始数据
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
      console.error("Failed to load monitoring data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // 订阅实时更新
    const unsubscribeEvents = monitoringApi.subscribeToUpdates(
      (event: ActivityEvent) => {
        setActivityEvents((prev) => [event, ...prev].slice(0, 50));
      },
    );

    const unsubscribeMetrics = monitoringApi.subscribeToMetrics(
      (metrics: SystemMetrics) => {
        setSystemMetrics(metrics);
      },
    );

    return () => {
      unsubscribeEvents();
      unsubscribeMetrics();
    };
  }, [loadData]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    const success = await monitoringApi.acknowledgeAlert(alertId);
    if (success) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
      );
    }
  };

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-6 border-b border-(--color-border)">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            实时监控
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            监控 Agent 状态和系统运行情况
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unacknowledgedAlerts.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 text-sm bg-red-500/10 text-red-500 rounded-lg">
              <ExclamationCircleOutlined />
              {unacknowledgedAlerts.length} 个未处理告警
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-(--color-border) rounded-lg hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
          >
            <SyncOutlined spin={loading} />
            刷新
          </button>
        </div>
      </div>

      {/* 系统指标栏 */}
      {systemMetrics && (
        <div className="grid grid-cols-5 gap-4 p-4 bg-[var(--color-bg-secondary)] border-b border-(--color-border)">
          <MetricCard
            icon={DashboardOutlined}
            label="CPU"
            value={`${systemMetrics.cpu.toFixed(1)}%`}
            color={
              systemMetrics.cpu > 70
                ? "red"
                : systemMetrics.cpu > 50
                  ? "yellow"
                  : "green"
            }
          />
          <MetricCard
            icon={DatabaseOutlined}
            label="内存"
            value={`${systemMetrics.memory.toFixed(1)}%`}
            color={
              systemMetrics.memory > 80
                ? "red"
                : systemMetrics.memory > 60
                  ? "yellow"
                  : "green"
            }
          />
          <MetricCard
            icon={WifiOutlined}
            label="网络"
            value={`${systemMetrics.network.toFixed(1)}%`}
            color="blue"
          />
          <MetricCard
            icon={AlertOutlined}
            label="活跃连接"
            value={systemMetrics.active_connections.toString()}
            color="blue"
          />
          <MetricCard
            icon={UnorderedListOutlined}
            label="队列长度"
            value={systemMetrics.queue_length.toString()}
            color={systemMetrics.queue_length > 10 ? "yellow" : "green"}
          />
        </div>
      )}

      {/* 标签栏 */}
      <div className="flex gap-1 px-6 border-b border-(--color-border)">
        {[
          {
            key: "agents",
            label: "Agent 状态",
            icon: ThunderboltOutlined,
            badge: agentStatuses.filter((a) => a.status === "online").length,
          },
          {
            key: "activity",
            label: "活动流",
            icon: AlertOutlined,
          },
          {
            key: "alerts",
            label: "告警",
            icon: BellOutlined,
            badge: unacknowledgedAlerts.length,
            badgeColor: "red",
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "text-[var(--color-primary)] border-(--color-primary)"
                  : "text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon />
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-xs rounded ${
                    tab.badgeColor === "red"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <SyncOutlined
              spin
              className="text-3xl text-[var(--color-primary)]"
            />
          </div>
        ) : activeTab === "agents" ? (
          <AgentsTab statuses={agentStatuses} />
        ) : activeTab === "activity" ? (
          <ActivityTab events={activityEvents} />
        ) : (
          <AlertsTab alerts={alerts} onAcknowledge={handleAcknowledgeAlert} />
        )}
      </div>
    </div>
  );
}

// Agent 状态标签页
function AgentsTab({ statuses }: { statuses: AgentStatus[] }) {
  const getStatusColor = (status: AgentStatus["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "busy":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-400";
      case "error":
        return "bg-red-500";
    }
  };

  const getStatusLabel = (status: AgentStatus["status"]) => {
    switch (status) {
      case "online":
        return "在线";
      case "busy":
        return "忙碌";
      case "offline":
        return "离线";
      case "error":
        return "错误";
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {statuses.map((agent) => (
        <div
          key={agent.agent_id}
          className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}
              />
              <span className="font-medium text-[var(--color-text-primary)]">
                {agent.agent_name}
              </span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                agent.status === "online"
                  ? "bg-green-500/10 text-green-500"
                  : agent.status === "busy"
                    ? "bg-yellow-500/10 text-yellow-500"
                    : agent.status === "error"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-gray-500/10 text-gray-500"
              }`}
            >
              {getStatusLabel(agent.status)}
            </span>
          </div>

          {agent.current_conversation && (
            <div className="mb-3 p-2 bg-[var(--color-bg-tertiary)] rounded text-xs">
              <span className="text-[var(--color-text-tertiary)]">
                当前对话:{" "}
              </span>
              <span className="text-[var(--color-text-secondary)]">
                {agent.current_conversation}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[var(--color-text-tertiary)]">
                今日对话
              </span>
              <p className="font-medium text-[var(--color-text-primary)]">
                {agent.metrics.conversations_today}
              </p>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">
                平均响应
              </span>
              <p className="font-medium text-[var(--color-text-primary)]">
                {agent.metrics.avg_response_time}ms
              </p>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">成功率</span>
              <p className="font-medium text-green-500">
                {agent.metrics.success_rate}%
              </p>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">
                Token 用量
              </span>
              <p className="font-medium text-[var(--color-text-primary)]">
                {(agent.metrics.tokens_used / 1000).toFixed(0)}K
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-(--color-border) text-xs text-[var(--color-text-tertiary)]">
            最后活跃: {formatTime(agent.last_active)}
          </div>
        </div>
      ))}
    </div>
  );
}

// 活动流标签页
function ActivityTab({ events }: { events: ActivityEvent[] }) {
  const getEventIcon = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "conversation_start":
        return <PlayCircleOutlined className="text-blue-500" />;
      case "conversation_end":
        return <CheckCircleOutlined className="text-green-500" />;
      case "message":
        return <MessageOutlined className="text-purple-500" />;
      case "skill_call":
        return <ThunderboltOutlined className="text-yellow-500" />;
      case "error":
        return <ExclamationCircleOutlined className="text-red-500" />;
      case "test_run":
        return <ExperimentOutlined className="text-cyan-500" />;
    }
  };

  const getEventLabel = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "conversation_start":
        return "开始对话";
      case "conversation_end":
        return "结束对话";
      case "message":
        return "消息处理";
      case "skill_call":
        return "技能调用";
      case "error":
        return "错误";
      case "test_run":
        return "测试运行";
    }
  };

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-start gap-3 p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)"
        >
          <div className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg">
            {getEventIcon(event.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--color-text-primary)]">
                {event.agent_name}
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {getEventLabel(event.type)}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              {event.details}
            </p>
            {event.user_name && (
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                用户: {event.user_name}
              </p>
            )}
            {event.metadata && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(event.metadata).map(([key, value]) => (
                  <span
                    key={key}
                    className="text-xs px-2 py-0.5 bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-tertiary)]"
                  >
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">
            {formatTime(event.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}

// 告警标签页
function AlertsTab({
  alerts,
  onAcknowledge,
}: {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
}) {
  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return <ExclamationCircleOutlined className="text-red-500" />;
      case "warning":
        return <WarningOutlined className="text-yellow-500" />;
      case "info":
        return <BellOutlined className="text-blue-500" />;
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-lg border ${
            alert.acknowledged
              ? "bg-[var(--color-bg-secondary)] border-(--color-border) opacity-60"
              : alert.type === "error"
                ? "bg-red-500/5 border-red-500/30"
                : alert.type === "warning"
                  ? "bg-yellow-500/5 border-yellow-500/30"
                  : "bg-[var(--color-bg-secondary)] border-(--color-border)"
          }`}
        >
          <div className="flex items-start gap-3">
            {getAlertIcon(alert.type)}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--color-text-primary)]">
                  {alert.title}
                </span>
                {alert.acknowledged && (
                  <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded">
                    已处理
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {alert.message}
              </p>
              {alert.agent_name && (
                <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
                  相关 Agent: {alert.agent_name}
                </p>
              )}
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                {formatTime(alert.timestamp)}
              </p>
            </div>
            {!alert.acknowledged && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-(--color-border) rounded-lg hover:bg-[var(--color-bg-base)]"
              >
                <BellFilled />
                确认
              </button>
            )}
          </div>
        </div>
      ))}

      {alerts.length === 0 && (
        <div className="text-center py-12 text-[var(--color-text-tertiary)]">
          <BellOutlined className="text-4xl mx-auto mb-2 opacity-50" />
          <p>暂无告警</p>
        </div>
      )}
    </div>
  );
}

// 系统指标卡片
function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType;
  label: string;
  value: string;
  color: "green" | "yellow" | "red" | "blue";
}) {
  const colorClasses = {
    green: "text-green-500",
    yellow: "text-yellow-500",
    red: "text-red-500",
    blue: "text-blue-500",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`p-2 bg-[var(--color-bg-tertiary)] rounded-lg ${colorClasses[color]}`}
      >
        <Icon />
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-tertiary)]">{label}</p>
        <p className={`font-medium ${colorClasses[color]}`}>{value}</p>
      </div>
    </div>
  );
}

// 格式化时间
function formatTime(date: Date) {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();

  if (diff < 60000) {
    return "刚刚";
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  }
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  }
  return new Date(date).toLocaleDateString("zh-CN");
}
