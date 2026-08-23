/**
 * Monitoring mock data and API
 */

// Agent status types - snake_case to match the backend
export interface AgentStatus {
  agent_id: string;
  agent_name: string;
  status: "online" | "offline" | "busy" | "error";
  current_conversation?: string;
  last_active: Date;
  metrics: {
    conversations_today: number;
    avg_response_time: number;
    success_rate: number;
    tokens_used: number;
  };
}

// Activity event types
export interface ActivityEvent {
  id: string;
  timestamp: Date;
  type:
    | "conversation_start"
    | "conversation_end"
    | "message"
    | "error"
    | "skill_call"
    | "test_run";
  agent_id: string;
  agent_name: string;
  user_id?: string;
  user_name?: string;
  details: string;
  metadata?: Record<string, unknown>;
}

// System metric types
export interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  active_connections: number;
  queue_length: number;
  timestamp: Date;
}

// Alert types
export interface Alert {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  agent_id?: string;
  agent_name?: string;
  timestamp: Date;
  acknowledged: boolean;
}

// Mock data
const mockAgentStatuses: AgentStatus[] = [
  {
    agent_id: "agent-1",
    agent_name: "通用助手",
    status: "online",
    last_active: new Date(),
    metrics: {
      conversations_today: 45,
      avg_response_time: 850,
      success_rate: 98.5,
      tokens_used: 125000,
    },
  },
  {
    agent_id: "agent-2",
    agent_name: "代码专家",
    status: "busy",
    current_conversation: "conv-123",
    last_active: new Date(),
    metrics: {
      conversations_today: 32,
      avg_response_time: 1200,
      success_rate: 96.2,
      tokens_used: 89000,
    },
  },
  {
    agent_id: "agent-3",
    agent_name: "翻译助手",
    status: "online",
    last_active: new Date(),
    metrics: {
      conversations_today: 28,
      avg_response_time: 650,
      success_rate: 99.1,
      tokens_used: 45000,
    },
  },
  {
    agent_id: "agent-4",
    agent_name: "数据分析师",
    status: "offline",
    last_active: new Date(Date.now() - 3600000),
    metrics: {
      conversations_today: 12,
      avg_response_time: 1500,
      success_rate: 94.5,
      tokens_used: 67000,
    },
  },
  {
    agent_id: "agent-5",
    agent_name: "写作助手",
    status: "error",
    last_active: new Date(Date.now() - 7200000),
    metrics: {
      conversations_today: 8,
      avg_response_time: 2000,
      success_rate: 75.0,
      tokens_used: 23000,
    },
  },
];

const mockActivityEvents: ActivityEvent[] = [
  {
    id: "event-1",
    timestamp: new Date(Date.now() - 60000),
    type: "conversation_start",
    agent_id: "agent-1",
    agent_name: "通用助手",
    user_id: "user-1",
    user_name: "张三",
    details: "开始新对话",
  },
  {
    id: "event-2",
    timestamp: new Date(Date.now() - 120000),
    type: "message",
    agent_id: "agent-2",
    agent_name: "代码专家",
    user_id: "user-2",
    user_name: "李四",
    details: "处理代码审查请求",
    metadata: { tokens: 1500 },
  },
  {
    id: "event-3",
    timestamp: new Date(Date.now() - 180000),
    type: "skill_call",
    agent_id: "agent-3",
    agent_name: "翻译助手",
    user_id: "user-3",
    user_name: "王五",
    details: "调用 web_search 技能",
    metadata: { skill: "web_search", duration: 1200 },
  },
  {
    id: "event-4",
    timestamp: new Date(Date.now() - 240000),
    type: "error",
    agent_id: "agent-5",
    agent_name: "写作助手",
    details: "API 调用超时",
    metadata: { error: "timeout", retryCount: 3 },
  },
  {
    id: "event-5",
    timestamp: new Date(Date.now() - 300000),
    type: "conversation_end",
    agent_id: "agent-1",
    agent_name: "通用助手",
    user_id: "user-1",
    user_name: "张三",
    details: "对话结束，用户满意度: 5星",
    metadata: { duration: 180000, rating: 5 },
  },
  {
    id: "event-6",
    timestamp: new Date(Date.now() - 360000),
    type: "test_run",
    agent_id: "agent-2",
    agent_name: "代码专家",
    details: "执行测试集: 代码能力测试集",
    metadata: { testSetId: "testset-2", passRate: 92 },
  },
];

const mockAlerts: Alert[] = [
  {
    id: "alert-1",
    type: "error",
    title: "Agent 连接失败",
    message: "写作助手 Agent 无法连接到 Provider，请检查 API 配置",
    agent_id: "agent-5",
    agent_name: "写作助手",
    timestamp: new Date(Date.now() - 3600000),
    acknowledged: false,
  },
  {
    id: "alert-2",
    type: "warning",
    title: "响应时间过长",
    message: "数据分析师 Agent 平均响应时间超过 1.5 秒",
    agent_id: "agent-4",
    agent_name: "数据分析师",
    timestamp: new Date(Date.now() - 7200000),
    acknowledged: false,
  },
  {
    id: "alert-3",
    type: "warning",
    title: "Token 使用量警告",
    message: "今日 Token 使用量已达配额的 80%",
    timestamp: new Date(Date.now() - 10800000),
    acknowledged: true,
  },
  {
    id: "alert-4",
    type: "info",
    title: "新版本可用",
    message: "mofa-studio v1.2.0 已发布，包含多项性能优化",
    timestamp: new Date(Date.now() - 86400000),
    acknowledged: true,
  },
];

// Generate random system metrics
const generateSystemMetrics = (): SystemMetrics => ({
  cpu: 30 + Math.random() * 40,
  memory: 40 + Math.random() * 30,
  network: 10 + Math.random() * 50,
  active_connections: 50 + Math.floor(Math.random() * 100),
  queue_length: Math.floor(Math.random() * 20),
  timestamp: new Date(),
});

// Simulated latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Monitoring API Mock
export const monitoringApi = {
  // Get all agent statuses
  async getAgentStatuses(): Promise<AgentStatus[]> {
    await delay(300);
    return mockAgentStatuses;
  },

  // Get a single agent's status
  async getAgentStatus(agentId: string): Promise<AgentStatus | undefined> {
    await delay(200);
    return mockAgentStatuses.find((a) => a.agent_id === agentId);
  },

  // Get activity event stream
  async getActivityEvents(limit = 50): Promise<ActivityEvent[]> {
    await delay(200);
    return mockActivityEvents.slice(0, limit);
  },

  // Get system metrics
  async getSystemMetrics(): Promise<SystemMetrics> {
    await delay(100);
    return generateSystemMetrics();
  },

  // Get alert list
  async getAlerts(acknowledged?: boolean): Promise<Alert[]> {
    await delay(200);
    let alerts = mockAlerts;
    if (acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === acknowledged);
    }
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  },

  // Acknowledge alert
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    await delay(200);
    const alert = mockAlerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  },

  // Subscribe to real-time updates (simulated)
  subscribeToUpdates(callback: (event: ActivityEvent) => void): () => void {
    const eventTypes: ActivityEvent["type"][] = [
      "conversation_start",
      "conversation_end",
      "message",
      "skill_call",
    ];
    const agents = ["agent-1", "agent-2", "agent-3"];
    const users = ["张三", "李四", "王五", "赵六"];

    const interval = setInterval(
      () => {
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomType =
          eventTypes[Math.floor(Math.random() * eventTypes.length)];

        const event: ActivityEvent = {
          id: `event-${Date.now()}`,
          timestamp: new Date(),
          type: randomType,
          agent_id: randomAgent,
          agent_name:
            mockAgentStatuses.find((a) => a.agent_id === randomAgent)
              ?.agent_name || randomAgent,
          user_id: `user-${Math.floor(Math.random() * 4) + 1}`,
          user_name: randomUser,
          details: getEventDetails(randomType),
        };

        callback(event);
      },
      3000 + Math.random() * 5000,
    );

    return () => clearInterval(interval);
  },

  // Subscribe to system metric updates (simulated)
  subscribeToMetrics(callback: (metrics: SystemMetrics) => void): () => void {
    const interval = setInterval(() => {
      callback(generateSystemMetrics());
    }, 2000);

    return () => clearInterval(interval);
  },
};

// Get event details
function getEventDetails(type: ActivityEvent["type"]): string {
  switch (type) {
    case "conversation_start":
      return "开始新对话";
    case "conversation_end":
      return "对话结束";
    case "message":
      return "处理用户消息";
    case "skill_call":
      return "调用技能";
    case "error":
      return "发生错误";
    case "test_run":
      return "执行测试";
    default:
      return "未知事件";
  }
}
