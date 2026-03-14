/**
 * Monitoring Mock 数据和 API
 */

// Agent 状态类型
export interface AgentStatus {
  agentId: string;
  agentName: string;
  status: "online" | "offline" | "busy" | "error";
  currentConversation?: string;
  lastActive: Date;
  metrics: {
    conversationsToday: number;
    avgResponseTime: number;
    successRate: number;
    tokensUsed: number;
  };
}

// 活动事件类型
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
  agentId: string;
  agentName: string;
  userId?: string;
  userName?: string;
  details: string;
  metadata?: Record<string, unknown>;
}

// 系统指标类型
export interface SystemMetrics {
  cpu: number;
  memory: number;
  network: number;
  activeConnections: number;
  queueLength: number;
  timestamp: Date;
}

// 告警类型
export interface Alert {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  agentId?: string;
  agentName?: string;
  timestamp: Date;
  acknowledged: boolean;
}

// Mock 数据
const mockAgentStatuses: AgentStatus[] = [
  {
    agentId: "agent-1",
    agentName: "通用助手",
    status: "online",
    lastActive: new Date(),
    metrics: {
      conversationsToday: 45,
      avgResponseTime: 850,
      successRate: 98.5,
      tokensUsed: 125000,
    },
  },
  {
    agentId: "agent-2",
    agentName: "代码专家",
    status: "busy",
    currentConversation: "conv-123",
    lastActive: new Date(),
    metrics: {
      conversationsToday: 32,
      avgResponseTime: 1200,
      successRate: 96.2,
      tokensUsed: 89000,
    },
  },
  {
    agentId: "agent-3",
    agentName: "翻译助手",
    status: "online",
    lastActive: new Date(),
    metrics: {
      conversationsToday: 28,
      avgResponseTime: 650,
      successRate: 99.1,
      tokensUsed: 45000,
    },
  },
  {
    agentId: "agent-4",
    agentName: "数据分析师",
    status: "offline",
    lastActive: new Date(Date.now() - 3600000),
    metrics: {
      conversationsToday: 12,
      avgResponseTime: 1500,
      successRate: 94.5,
      tokensUsed: 67000,
    },
  },
  {
    agentId: "agent-5",
    agentName: "写作助手",
    status: "error",
    lastActive: new Date(Date.now() - 7200000),
    metrics: {
      conversationsToday: 8,
      avgResponseTime: 2000,
      successRate: 75.0,
      tokensUsed: 23000,
    },
  },
];

const mockActivityEvents: ActivityEvent[] = [
  {
    id: "event-1",
    timestamp: new Date(Date.now() - 60000),
    type: "conversation_start",
    agentId: "agent-1",
    agentName: "通用助手",
    userId: "user-1",
    userName: "张三",
    details: "开始新对话",
  },
  {
    id: "event-2",
    timestamp: new Date(Date.now() - 120000),
    type: "message",
    agentId: "agent-2",
    agentName: "代码专家",
    userId: "user-2",
    userName: "李四",
    details: "处理代码审查请求",
    metadata: { tokens: 1500 },
  },
  {
    id: "event-3",
    timestamp: new Date(Date.now() - 180000),
    type: "skill_call",
    agentId: "agent-3",
    agentName: "翻译助手",
    userId: "user-3",
    userName: "王五",
    details: "调用 web_search 技能",
    metadata: { skill: "web_search", duration: 1200 },
  },
  {
    id: "event-4",
    timestamp: new Date(Date.now() - 240000),
    type: "error",
    agentId: "agent-5",
    agentName: "写作助手",
    details: "API 调用超时",
    metadata: { error: "timeout", retryCount: 3 },
  },
  {
    id: "event-5",
    timestamp: new Date(Date.now() - 300000),
    type: "conversation_end",
    agentId: "agent-1",
    agentName: "通用助手",
    userId: "user-1",
    userName: "张三",
    details: "对话结束，用户满意度: 5星",
    metadata: { duration: 180000, rating: 5 },
  },
  {
    id: "event-6",
    timestamp: new Date(Date.now() - 360000),
    type: "test_run",
    agentId: "agent-2",
    agentName: "代码专家",
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
    agentId: "agent-5",
    agentName: "写作助手",
    timestamp: new Date(Date.now() - 3600000),
    acknowledged: false,
  },
  {
    id: "alert-2",
    type: "warning",
    title: "响应时间过长",
    message: "数据分析师 Agent 平均响应时间超过 1.5 秒",
    agentId: "agent-4",
    agentName: "数据分析师",
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
    message: "AmosClaw v1.2.0 已发布，包含多项性能优化",
    timestamp: new Date(Date.now() - 86400000),
    acknowledged: true,
  },
];

// 生成随机系统指标
const generateSystemMetrics = (): SystemMetrics => ({
  cpu: 30 + Math.random() * 40,
  memory: 40 + Math.random() * 30,
  network: 10 + Math.random() * 50,
  activeConnections: 50 + Math.floor(Math.random() * 100),
  queueLength: Math.floor(Math.random() * 20),
  timestamp: new Date(),
});

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Monitoring API Mock
export const monitoringApi = {
  // 获取所有 Agent 状态
  async getAgentStatuses(): Promise<AgentStatus[]> {
    await delay(300);
    return mockAgentStatuses;
  },

  // 获取单个 Agent 状态
  async getAgentStatus(agentId: string): Promise<AgentStatus | undefined> {
    await delay(200);
    return mockAgentStatuses.find((a) => a.agentId === agentId);
  },

  // 获取活动事件流
  async getActivityEvents(limit = 50): Promise<ActivityEvent[]> {
    await delay(200);
    return mockActivityEvents.slice(0, limit);
  },

  // 获取系统指标
  async getSystemMetrics(): Promise<SystemMetrics> {
    await delay(100);
    return generateSystemMetrics();
  },

  // 获取告警列表
  async getAlerts(acknowledged?: boolean): Promise<Alert[]> {
    await delay(200);
    let alerts = mockAlerts;
    if (acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === acknowledged);
    }
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  },

  // 确认告警
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    await delay(200);
    const alert = mockAlerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  },

  // 订阅实时更新（模拟）
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
          agentId: randomAgent,
          agentName:
            mockAgentStatuses.find((a) => a.agentId === randomAgent)
              ?.agentName || randomAgent,
          userId: `user-${Math.floor(Math.random() * 4) + 1}`,
          userName: randomUser,
          details: getEventDetails(randomType),
        };

        callback(event);
      },
      3000 + Math.random() * 5000,
    );

    return () => clearInterval(interval);
  },

  // 订阅系统指标更新（模拟）
  subscribeToMetrics(callback: (metrics: SystemMetrics) => void): () => void {
    const interval = setInterval(() => {
      callback(generateSystemMetrics());
    }, 2000);

    return () => clearInterval(interval);
  },
};

// 获取事件详情
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
