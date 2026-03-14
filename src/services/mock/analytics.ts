/**
 * Analytics Mock 数据和 API
 */

// 统计数据类型
export interface UsageStats {
  totalConversations: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  avgResponseTime: number;
  successRate: number;
  totalCost: number;
}

export interface DailyStats {
  date: string;
  conversations: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  avgResponseTime: number;
  successRate: number;
  cost: number;
}

export interface AgentStats {
  agentId: string;
  agentName: string;
  conversations: number;
  tokens: number;
  avgResponseTime: number;
  successRate: number;
  cost: number;
}

export interface UserStats {
  userId: string;
  userName: string;
  department: string;
  conversations: number;
  tokens: number;
  avgResponseTime: number;
}

export interface HourlyDistribution {
  hour: number;
  count: number;
}

// 筛选参数
export interface AnalyticsFilter {
  agentIds?: string[];
  userIds?: string[];
  startDate?: string;
  endDate?: string;
  providerIds?: string[];
}

// 生成模拟数据
const generateDailyStats = (days: number): DailyStats[] => {
  const stats: DailyStats[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const baseConversations = 50 + Math.floor(Math.random() * 100);
    const inputTokens = Math.floor(10000 + Math.random() * 50000);
    const outputTokens = Math.floor(5000 + Math.random() * 25000);

    stats.push({
      date: date.toISOString().split('T')[0],
      conversations: baseConversations,
      tokens: inputTokens + outputTokens,
      inputTokens,
      outputTokens,
      avgResponseTime: 500 + Math.floor(Math.random() * 1500),
      successRate: 95 + Math.random() * 5,
      cost: (inputTokens * 0.00003 + outputTokens * 0.00006).toFixed(4) as unknown as number,
    });
  }

  return stats;
};

const generateAgentStats = (): AgentStats[] => {
  const agents = [
    { id: 'agent-1', name: '通用助手' },
    { id: 'agent-2', name: '代码专家' },
    { id: 'agent-3', name: '翻译助手' },
    { id: 'agent-4', name: '数据分析师' },
    { id: 'agent-5', name: '写作助手' },
  ];

  return agents.map((agent) => {
    const conversations = 100 + Math.floor(Math.random() * 500);
    const inputTokens = Math.floor(50000 + Math.random() * 200000);
    const outputTokens = Math.floor(25000 + Math.random() * 100000);

    return {
      agentId: agent.id,
      agentName: agent.name,
      conversations,
      tokens: inputTokens + outputTokens,
      avgResponseTime: 500 + Math.floor(Math.random() * 2000),
      successRate: 90 + Math.random() * 10,
      cost: Number((inputTokens * 0.00003 + outputTokens * 0.00006).toFixed(2)),
    };
  });
};

const generateUserStats = (): UserStats[] => {
  const users = [
    { id: 'user-1', name: '张三', department: '技术部' },
    { id: 'user-2', name: '李四', department: '技术部' },
    { id: 'user-3', name: '王五', department: '产品部' },
    { id: 'user-4', name: '赵六', department: '运营部' },
    { id: 'user-5', name: '钱七', department: '市场部' },
    { id: 'user-6', name: '孙八', department: '技术部' },
    { id: 'user-7', name: '周九', department: '产品部' },
    { id: 'user-8', name: '吴十', department: '运营部' },
  ];

  return users.map((user) => {
    const conversations = 20 + Math.floor(Math.random() * 200);
    const tokens = Math.floor(10000 + Math.random() * 100000);

    return {
      userId: user.id,
      userName: user.name,
      department: user.department,
      conversations,
      tokens,
      avgResponseTime: 500 + Math.floor(Math.random() * 1500),
    };
  });
};

const generateHourlyDistribution = (): HourlyDistribution[] => {
  const distribution: HourlyDistribution[] = [];

  for (let hour = 0; hour < 24; hour++) {
    // 工作时间使用更多
    const baseCount = hour >= 9 && hour <= 18 ? 100 : 30;
    distribution.push({
      hour,
      count: baseCount + Math.floor(Math.random() * 50),
    });
  }

  return distribution;
};

// Mock 数据存储
let dailyStatsCache: DailyStats[] = [];
let agentStatsCache: AgentStats[] = [];
let userStatsCache: UserStats[] = [];
let hourlyDistributionCache: HourlyDistribution[] = [];

// 初始化缓存
const initCache = () => {
  if (dailyStatsCache.length === 0) {
    dailyStatsCache = generateDailyStats(30);
    agentStatsCache = generateAgentStats();
    userStatsCache = generateUserStats();
    hourlyDistributionCache = generateHourlyDistribution();
  }
};

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Analytics API Mock
export const analyticsApi = {
  // 获取使用统计概览
  async getOverviewStats(filter?: AnalyticsFilter): Promise<UsageStats> {
    await delay(300);
    initCache();

    // 根据筛选条件过滤（模拟）
    let stats = dailyStatsCache;
    if (filter?.startDate) {
      stats = stats.filter((s) => s.date >= filter.startDate!);
    }
    if (filter?.endDate) {
      stats = stats.filter((s) => s.date <= filter.endDate!);
    }

    const totals = stats.reduce(
      (acc, s) => ({
        totalConversations: acc.totalConversations + s.conversations,
        totalTokens: acc.totalTokens + s.tokens,
        inputTokens: acc.inputTokens + s.inputTokens,
        outputTokens: acc.outputTokens + s.outputTokens,
        totalCost: acc.totalCost + Number(s.cost),
        responseTimes: [...(acc.responseTimes || []), s.avgResponseTime],
        successRates: [...(acc.successRates || []), s.successRate],
      }),
      {
        totalConversations: 0,
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        responseTimes: [] as number[],
        successRates: [] as number[],
      }
    );

    return {
      totalConversations: totals.totalConversations,
      totalTokens: totals.totalTokens,
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      avgResponseTime: Math.round(
        totals.responseTimes.reduce((a, b) => a + b, 0) / totals.responseTimes.length
      ),
      successRate: Number(
        (totals.successRates.reduce((a, b) => a + b, 0) / totals.successRates.length).toFixed(1)
      ),
      totalCost: Number(totals.totalCost.toFixed(2)),
    };
  },

  // 获取每日统计
  async getDailyStats(filter?: AnalyticsFilter): Promise<DailyStats[]> {
    await delay(300);
    initCache();

    let stats = dailyStatsCache;
    if (filter?.startDate) {
      stats = stats.filter((s) => s.date >= filter.startDate!);
    }
    if (filter?.endDate) {
      stats = stats.filter((s) => s.date <= filter.endDate!);
    }

    return stats;
  },

  // 获取 Agent 统计
  async getAgentStats(filter?: AnalyticsFilter): Promise<AgentStats[]> {
    await delay(300);
    initCache();

    let stats = agentStatsCache;
    if (filter?.agentIds && filter.agentIds.length > 0) {
      stats = stats.filter((s) => filter.agentIds!.includes(s.agentId));
    }

    // 按对话数排序
    return stats.sort((a, b) => b.conversations - a.conversations);
  },

  // 获取用户统计
  async getUserStats(filter?: AnalyticsFilter): Promise<UserStats[]> {
    await delay(300);
    initCache();

    let stats = userStatsCache;
    if (filter?.userIds && filter.userIds.length > 0) {
      stats = stats.filter((s) => filter.userIds!.includes(s.userId));
    }

    // 按对话数排序
    return stats.sort((a, b) => b.conversations - a.conversations);
  },

  // 获取小时分布
  async getHourlyDistribution(_filter?: AnalyticsFilter): Promise<HourlyDistribution[]> {
    await delay(200);
    initCache();
    return hourlyDistributionCache;
  },

  // 获取趋势数据（用于图表）
  async getTrendData(
    metric: 'conversations' | 'tokens' | 'cost' | 'responseTime',
    filter?: AnalyticsFilter
  ): Promise<{ date: string; value: number }[]> {
    await delay(300);
    initCache();

    let stats = dailyStatsCache;
    if (filter?.startDate) {
      stats = stats.filter((s) => s.date >= filter.startDate!);
    }
    if (filter?.endDate) {
      stats = stats.filter((s) => s.date <= filter.endDate!);
    }

    return stats.map((s) => ({
      date: s.date,
      value:
        metric === 'conversations'
          ? s.conversations
          : metric === 'tokens'
            ? s.tokens
            : metric === 'cost'
              ? Number(s.cost)
              : s.avgResponseTime,
    }));
  },

  // 获取部门统计
  async getDepartmentStats(_filter?: AnalyticsFilter): Promise<{ department: string; conversations: number; tokens: number; users: number }[]> {
    await delay(300);
    initCache();

    const departmentMap = new Map<string, { conversations: number; tokens: number; users: Set<string> }>();

    userStatsCache.forEach((user) => {
      const dept = departmentMap.get(user.department) || {
        conversations: 0,
        tokens: 0,
        users: new Set<string>(),
      };
      dept.conversations += user.conversations;
      dept.tokens += user.tokens;
      dept.users.add(user.userId);
      departmentMap.set(user.department, dept);
    });

    return Array.from(departmentMap.entries()).map(([department, data]) => ({
      department,
      conversations: data.conversations,
      tokens: data.tokens,
      users: data.users.size,
    }));
  },

  // 导出数据
  async exportData(format: 'csv' | 'json', filter?: AnalyticsFilter): Promise<string> {
    await delay(500);
    initCache();

    const stats = await this.getDailyStats(filter);

    if (format === 'json') {
      return JSON.stringify(stats, null, 2);
    }

    // CSV 格式
    const headers = ['日期', '对话数', '总Tokens', '输入Tokens', '输出Tokens', '平均响应时间(ms)', '成功率(%)', '费用($)'];
    const rows = stats.map((s) => [
      s.date,
      s.conversations,
      s.tokens,
      s.inputTokens,
      s.outputTokens,
      s.avgResponseTime,
      s.successRate.toFixed(1),
      s.cost,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },
};
