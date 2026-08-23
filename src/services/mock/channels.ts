/**
 * Channel mock data
 */

import type {
  Channel,
  ChannelType,
  AgentChannel,
  ChannelTestResult,
} from "../../types/channel";

// Channel type configuration info
export const channelTypeConfig: Record<
  ChannelType,
  { name: string; icon: string; description: string }
> = {
  wechat: {
    name: "微信",
    icon: "💬",
    description: "连接微信公众号，接收和发送微信消息",
  },
  wechat_work: {
    name: "企业微信",
    icon: "🏢",
    description: "连接企业微信应用，实现企业内部沟通",
  },
  dingtalk: {
    name: "钉钉",
    icon: "📌",
    description: "连接钉钉机器人，实现钉钉群聊和单聊",
  },
  feishu: {
    name: "飞书/Lark",
    icon: "🚀",
    description: "连接飞书机器人，实现飞书群聊和单聊",
  },
  slack: {
    name: "Slack",
    icon: "💼",
    description: "连接 Slack 工作区，实现团队协作",
  },
  telegram: {
    name: "Telegram",
    icon: "✈️",
    description: "连接 Telegram Bot，实现消息收发",
  },
  discord: {
    name: "Discord",
    icon: "🎮",
    description: "连接 Discord 服务器，实现社区互动",
  },
  whatsapp: {
    name: "WhatsApp",
    icon: "📱",
    description: "连接 WhatsApp Business API，实现客户沟通",
  },
  line: {
    name: "Line",
    icon: "💬",
    description: "连接 Line Messaging API，实现消息收发",
  },
  messenger: {
    name: "Messenger",
    icon: "📘",
    description: "连接 Facebook Messenger，实现社交互动",
  },
  instagram: {
    name: "Instagram",
    icon: "📷",
    description: "连接 Instagram Messaging，实现社交互动",
  },
  teams: {
    name: "Microsoft Teams",
    icon: "👥",
    description: "连接 Microsoft Teams，实现企业协作",
  },
  webhook: {
    name: "Webhook",
    icon: "🔗",
    description: "通用 Webhook 接口，支持自定义集成",
  },
  email: {
    name: "邮件",
    icon: "📧",
    description: "SMTP 邮件发送，支持邮件通知",
  },
  sms: {
    name: "短信",
    icon: "📱",
    description: "短信发送服务，支持多种短信平台",
  },
  custom: {
    name: "自定义",
    icon: "⚙️",
    description: "自定义渠道配置，灵活对接各种系统",
  },
};

// Mock channel data
export const mockChannels: Channel[] = [
  {
    id: "channel-1",
    name: "微信公众号",
    type: "wechat",
    description: "公司官方微信公众号渠道",
    status: "active",
    config: {
      app_id: "wx1234567890",
      app_secret: "secr****cret",
      token: "mytoken",
    },
    stats: {
      totalMessages: 15420,
      successMessages: 15200,
      failedMessages: 220,
      successRate: 98.57,
      avgResponseTime: 156,
      lastMessageAt: new Date("2026-03-14T10:30:00"),
    },
    enabled: true,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-03-14"),
    lastSyncAt: new Date("2026-03-14T10:30:00"),
  },
  {
    id: "channel-2",
    name: "企业微信机器人",
    type: "wechat_work",
    description: "内部企业微信群机器人",
    status: "active",
    config: {
      corp_id: "ww1234567890",
      agent_id: "100001",
      secret: "secr****cret",
      token: "worktoken",
    },
    stats: {
      totalMessages: 8560,
      successMessages: 8500,
      failedMessages: 60,
      successRate: 99.3,
      avgResponseTime: 89,
      lastMessageAt: new Date("2026-03-14T09:45:00"),
    },
    enabled: true,
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-03-14"),
    lastSyncAt: new Date("2026-03-14T09:45:00"),
  },
  {
    id: "channel-3",
    name: "钉钉通知",
    type: "dingtalk",
    description: "钉钉群消息通知",
    status: "active",
    config: {
      client_id: "ding123456",
      client_secret: "secr****cret",
    },
    stats: {
      totalMessages: 3250,
      successMessages: 3200,
      failedMessages: 50,
      successRate: 98.46,
      avgResponseTime: 120,
      lastMessageAt: new Date("2026-03-13T16:20:00"),
    },
    enabled: true,
    createdAt: new Date("2026-02-15"),
    updatedAt: new Date("2026-03-13"),
    lastSyncAt: new Date("2026-03-13T16:20:00"),
  },
  {
    id: "channel-4",
    name: "Slack 工作区",
    type: "slack",
    description: "团队 Slack 频道集成",
    status: "inactive",
    config: {
      bot_token: "xoxb****1234",
      signing_secret: "secr****cret",
    },
    stats: {
      totalMessages: 0,
      successMessages: 0,
      failedMessages: 0,
      successRate: 0,
      avgResponseTime: 0,
    },
    enabled: false,
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-10"),
  },
  {
    id: "channel-5",
    name: "Webhook 接口",
    type: "webhook",
    description: "通用 Webhook 接口",
    status: "active",
    config: {
      url: "https://api.example.com/webhook",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
    stats: {
      totalMessages: 12500,
      successMessages: 12300,
      failedMessages: 200,
      successRate: 98.4,
      avgResponseTime: 234,
      lastMessageAt: new Date("2026-03-14T11:00:00"),
    },
    enabled: true,
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-03-14"),
    lastSyncAt: new Date("2026-03-14T11:00:00"),
  },
  {
    id: "channel-6",
    name: "Telegram Bot",
    type: "telegram",
    description: "Telegram 机器人渠道",
    status: "error",
    config: {
      bot_token: "1234****BCDE",
    },
    stats: {
      totalMessages: 890,
      successMessages: 850,
      failedMessages: 40,
      successRate: 95.51,
      avgResponseTime: 180,
      lastMessageAt: new Date("2026-03-12T14:30:00"),
    },
    enabled: true,
    createdAt: new Date("2026-02-28"),
    updatedAt: new Date("2026-03-12"),
    errorMessage: "Bot token 验证失败，请检查配置",
  },
  {
    id: "channel-7",
    name: "邮件服务",
    type: "email",
    description: "SMTP 邮件发送服务",
    status: "active",
    config: {
      smtp_host: "smtp.example.com",
      smtp_port: 587,
      smtp_user: "noreply@example.com",
      smtp_password: "****",
      from_address: "noreply@example.com",
      from_name: "mofa-studio",
      use_tls: true,
    },
    stats: {
      totalMessages: 5680,
      successMessages: 5620,
      failedMessages: 60,
      successRate: 98.94,
      avgResponseTime: 450,
      lastMessageAt: new Date("2026-03-14T08:00:00"),
    },
    enabled: true,
    createdAt: new Date("2026-01-05"),
    updatedAt: new Date("2026-03-14"),
    lastSyncAt: new Date("2026-03-14T08:00:00"),
  },
];

// Mock agent-channel association
export const mockAgentChannels: AgentChannel[] = [
  {
    id: "ac-1",
    agentId: "agent-1",
    channelId: "channel-1",
    enabled: true,
    priority: 10,
    config: {
      welcomeMessage: "您好！我是智能助手，有什么可以帮助您的？",
      fallbackMessage: "抱歉，我暂时无法处理您的请求，请稍后再试。",
      timeout: 30000,
      maxRetries: 3,
    },
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-03-10"),
  },
  {
    id: "ac-2",
    agentId: "agent-1",
    channelId: "channel-5",
    enabled: true,
    priority: 5,
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-03-10"),
  },
  {
    id: "ac-3",
    agentId: "agent-2",
    channelId: "channel-2",
    enabled: true,
    priority: 10,
    createdAt: new Date("2026-02-05"),
    updatedAt: new Date("2026-03-12"),
  },
  {
    id: "ac-4",
    agentId: "agent-3",
    channelId: "channel-1",
    enabled: true,
    priority: 8,
    createdAt: new Date("2026-02-20"),
    updatedAt: new Date("2026-03-11"),
  },
  {
    id: "ac-5",
    agentId: "agent-4",
    channelId: "channel-7",
    enabled: true,
    priority: 10,
    createdAt: new Date("2026-02-25"),
    updatedAt: new Date("2026-03-13"),
  },
];

// Mock API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Channel API Mock
export const channelApi = {
  // Get all channels
  async getAll(): Promise<Channel[]> {
    await delay(300);
    return mockChannels;
  },

  // Get a single channel
  async getById(id: string): Promise<Channel | undefined> {
    await delay(200);
    return mockChannels.find((c) => c.id === id);
  },

  // Create channel
  async create(data: Partial<Channel>): Promise<Channel> {
    await delay(500);
    const newChannel: Channel = {
      id: `channel-${Date.now()}`,
      name: data.name || "新渠道",
      type: data.type || "webhook",
      description: data.description || "",
      status: "inactive",
      config: data.config || {
        type: "webhook",
        config: { url: "", method: "POST" },
      },
      stats: {
        totalMessages: 0,
        successMessages: 0,
        failedMessages: 0,
        successRate: 0,
        avgResponseTime: 0,
      },
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockChannels.push(newChannel);
    return newChannel;
  },

  // Update channel
  async update(
    id: string,
    data: Partial<Channel>,
  ): Promise<Channel | undefined> {
    await delay(300);
    const index = mockChannels.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    mockChannels[index] = {
      ...mockChannels[index],
      ...data,
      updatedAt: new Date(),
    };
    return mockChannels[index];
  },

  // Delete channel
  async delete(id: string): Promise<boolean> {
    await delay(300);
    const index = mockChannels.findIndex((c) => c.id === id);
    if (index === -1) return false;
    mockChannels.splice(index, 1);
    // Also delete associations
    const acIndex = mockAgentChannels.findIndex((ac) => ac.channelId === id);
    if (acIndex !== -1) {
      mockAgentChannels.splice(acIndex, 1);
    }
    return true;
  },

  // Test connection
  async testConnection(id: string): Promise<ChannelTestResult> {
    await delay(1000 + Math.random() * 1000);
    const channel = mockChannels.find((c) => c.id === id);
    if (!channel) {
      return {
        success: false,
        message: "渠道不存在",
        error: "CHANNEL_NOT_FOUND",
      };
    }

    // Simulated test results
    const success = Math.random() > 0.2;
    if (success) {
      return {
        success: true,
        message: "连接测试成功",
        latency: Math.floor(50 + Math.random() * 200),
        details: {
          server: `${channel.type}.api.example.com`,
          responseTime: `${Math.floor(50 + Math.random() * 100)}ms`,
        },
      };
    } else {
      return {
        success: false,
        message: "连接测试失败",
        error: "CONNECTION_TIMEOUT",
        latency: 5000,
      };
    }
  },

  // Get agents associated with a channel
  async getChannelAgents(channelId: string): Promise<AgentChannel[]> {
    await delay(200);
    return mockAgentChannels.filter((ac) => ac.channelId === channelId);
  },

  // Add an agent to a channel
  async addAgentToChannel(data: {
    agentId: string;
    channelId: string;
    priority?: number;
    config?: AgentChannel["config"];
  }): Promise<AgentChannel> {
    await delay(300);
    const newAgentChannel: AgentChannel = {
      id: `ac-${Date.now()}`,
      agentId: data.agentId,
      channelId: data.channelId,
      enabled: true,
      priority: data.priority || 10,
      config: data.config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockAgentChannels.push(newAgentChannel);
    return newAgentChannel;
  },

  // Remove an agent from a channel
  async removeAgentFromChannel(
    agentId: string,
    channelId: string,
  ): Promise<boolean> {
    await delay(300);
    const index = mockAgentChannels.findIndex(
      (ac) => ac.agentId === agentId && ac.channelId === channelId,
    );
    if (index === -1) return false;
    mockAgentChannels.splice(index, 1);
    return true;
  },

  // Update agent-channel association configuration
  async updateAgentChannel(
    agentId: string,
    channelId: string,
    data: Partial<AgentChannel>,
  ): Promise<AgentChannel | undefined> {
    await delay(300);
    const index = mockAgentChannels.findIndex(
      (ac) => ac.agentId === agentId && ac.channelId === channelId,
    );
    if (index === -1) return undefined;
    mockAgentChannels[index] = {
      ...mockAgentChannels[index],
      ...data,
      updatedAt: new Date(),
    };
    return mockAgentChannels[index];
  },

  // Toggle channel status
  async toggleStatus(id: string): Promise<Channel | undefined> {
    await delay(300);
    const channel = mockChannels.find((c) => c.id === id);
    if (!channel) return undefined;
    channel.enabled = !channel.enabled;
    channel.status = channel.enabled ? "active" : "disabled";
    channel.updatedAt = new Date();
    return channel;
  },

  // Get channel type configuration
  getChannelTypeConfig(type: ChannelType) {
    return channelTypeConfig[type];
  },

  // Get all channel types
  getAllChannelTypes() {
    return Object.entries(channelTypeConfig).map(([type, config]) => ({
      type: type as ChannelType,
      ...config,
    }));
  },
};
