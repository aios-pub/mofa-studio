/**
 * Analytics mock data and API
 * Use snake_case consistently to match the backend
 */

// Statistics data types
export interface UsageStats {
  total_conversations: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  avg_response_time: number;
  success_rate: number;
  total_cost: number;
}

export interface DailyStats {
  date: string;
  conversations: number;
  tokens: number;
  input_tokens: number;
  output_tokens: number;
  avg_response_time: number;
  success_rate: number;
  cost: number;
}

export interface AgentStats {
  agent_id: string;
  agent_name: string;
  conversations: number;
  tokens: number;
  avg_response_time: number;
  success_rate: number;
  cost: number;
}

export interface UserStats {
  user_id: string;
  user_name: string;
  department: string;
  conversations: number;
  tokens: number;
  avg_response_time: number;
}

export interface HourlyDistribution {
  hour: number;
  count: number;
}

// Filter parameters
export interface AnalyticsFilter {
  agent_ids?: string[];
  user_ids?: string[];
  start_date?: string;
  end_date?: string;
  provider_ids?: string[];
}

// Generate simulated data
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
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      avg_response_time: 500 + Math.floor(Math.random() * 1500),
      success_rate: 95 + Math.random() * 5,
      cost: Number((inputTokens * 0.00003 + outputTokens * 0.00006).toFixed(4)),
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
      agent_id: agent.id,
      agent_name: agent.name,
      conversations,
      tokens: inputTokens + outputTokens,
      avg_response_time: 500 + Math.floor(Math.random() * 2000),
      success_rate: 90 + Math.random() * 10,
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
      user_id: user.id,
      user_name: user.name,
      department: user.department,
      conversations,
      tokens,
      avg_response_time: 500 + Math.floor(Math.random() * 1500),
    };
  });
};

const generateHourlyDistribution = (): HourlyDistribution[] => {
  const distribution: HourlyDistribution[] = [];

  for (let hour = 0; hour < 24; hour++) {
    // More usage during work hours
    const baseCount = hour >= 9 && hour <= 18 ? 100 : 30;
    distribution.push({
      hour,
      count: baseCount + Math.floor(Math.random() * 50),
    });
  }

  return distribution;
};

// Mock data store
let dailyStatsCache: DailyStats[] = [];
let agentStatsCache: AgentStats[] = [];
let userStatsCache: UserStats[] = [];
let hourlyDistributionCache: HourlyDistribution[] = [];

// Initialize cache
const initCache = () => {
  if (dailyStatsCache.length === 0) {
    dailyStatsCache = generateDailyStats(30);
    agentStatsCache = generateAgentStats();
    userStatsCache = generateUserStats();
    hourlyDistributionCache = generateHourlyDistribution();
  }
};

// Simulated latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Analytics API Mock
export const analyticsApi = {
  // Get usage statistics overview
  async getOverviewStats(filter?: AnalyticsFilter): Promise<UsageStats> {
    await delay(300);
    initCache();

    // Filter by conditions (simulated)
    let stats = dailyStatsCache;
    if (filter?.start_date) {
      stats = stats.filter((s) => s.date >= filter.start_date!);
    }
    if (filter?.end_date) {
      stats = stats.filter((s) => s.date <= filter.end_date!);
    }

    const totals = stats.reduce(
      (acc, s) => ({
        total_conversations: acc.total_conversations + s.conversations,
        total_tokens: acc.total_tokens + s.tokens,
        input_tokens: acc.input_tokens + s.input_tokens,
        output_tokens: acc.output_tokens + s.output_tokens,
        total_cost: acc.total_cost + Number(s.cost),
        response_times: [...(acc.response_times || []), s.avg_response_time],
        success_rates: [...(acc.success_rates || []), s.success_rate],
      }),
      {
        total_conversations: 0,
        total_tokens: 0,
        input_tokens: 0,
        output_tokens: 0,
        total_cost: 0,
        response_times: [] as number[],
        success_rates: [] as number[],
      }
    );

    return {
      total_conversations: totals.total_conversations,
      total_tokens: totals.total_tokens,
      input_tokens: totals.input_tokens,
      output_tokens: totals.output_tokens,
      avg_response_time: Math.round(
        totals.response_times.reduce((a, b) => a + b, 0) / totals.response_times.length
      ),
      success_rate: Number(
        (totals.success_rates.reduce((a, b) => a + b, 0) / totals.success_rates.length).toFixed(1)
      ),
      total_cost: Number(totals.total_cost.toFixed(2)),
    };
  },

  // Get daily statistics
  async getDailyStats(filter?: AnalyticsFilter): Promise<DailyStats[]> {
    await delay(300);
    initCache();

    let stats = dailyStatsCache;
    if (filter?.start_date) {
      stats = stats.filter((s) => s.date >= filter.start_date!);
    }
    if (filter?.end_date) {
      stats = stats.filter((s) => s.date <= filter.end_date!);
    }

    return stats;
  },

  // Get agent statistics
  async getAgentStats(filter?: AnalyticsFilter): Promise<AgentStats[]> {
    await delay(300);
    initCache();

    let stats = agentStatsCache;
    if (filter?.agent_ids && filter.agent_ids.length > 0) {
      stats = stats.filter((s) => filter.agent_ids!.includes(s.agent_id));
    }

    // Sort by conversation count
    return stats.sort((a, b) => b.conversations - a.conversations);
  },

  // Get user statistics
  async getUserStats(filter?: AnalyticsFilter): Promise<UserStats[]> {
    await delay(300);
    initCache();

    let stats = userStatsCache;
    if (filter?.user_ids && filter.user_ids.length > 0) {
      stats = stats.filter((s) => filter.user_ids!.includes(s.user_id));
    }

    // Sort by conversation count
    return stats.sort((a, b) => b.conversations - a.conversations);
  },

  // Get hourly distribution
  async getHourlyDistribution(_filter?: AnalyticsFilter): Promise<HourlyDistribution[]> {
    await delay(200);
    initCache();
    return hourlyDistributionCache;
  },

  // Get trend data (for charts)
  async getTrendData(
    metric: 'conversations' | 'tokens' | 'cost' | 'response_time',
    filter?: AnalyticsFilter
  ): Promise<{ date: string; value: number }[]> {
    await delay(300);
    initCache();

    let stats = dailyStatsCache;
    if (filter?.start_date) {
      stats = stats.filter((s) => s.date >= filter.start_date!);
    }
    if (filter?.end_date) {
      stats = stats.filter((s) => s.date <= filter.end_date!);
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
              : s.avg_response_time,
    }));
  },

  // Get department statistics
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
      dept.users.add(user.user_id);
      departmentMap.set(user.department, dept);
    });

    return Array.from(departmentMap.entries()).map(([department, data]) => ({
      department,
      conversations: data.conversations,
      tokens: data.tokens,
      users: data.users.size,
    }));
  },

  // Export data
  async exportData(format: 'csv' | 'json', filter?: AnalyticsFilter): Promise<string> {
    await delay(500);
    initCache();

    const stats = await this.getDailyStats(filter);

    if (format === 'json') {
      return JSON.stringify(stats, null, 2);
    }

    // CSV format
    const headers = ['日期', '对话数', '总Tokens', '输入Tokens', '输出Tokens', '平均响应时间(ms)', '成功率(%)', '费用($)'];
    const rows = stats.map((s) => [
      s.date,
      s.conversations,
      s.tokens,
      s.input_tokens,
      s.output_tokens,
      s.avg_response_time,
      s.success_rate.toFixed(1),
      s.cost,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },
};
