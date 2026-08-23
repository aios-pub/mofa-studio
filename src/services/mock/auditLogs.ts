/**
 * Audit logs mock data and API
 */

// Audit log types
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  resourceName?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}

// Audit action types
export type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'import'
  | 'execute'
  | 'config_change';

// Action categories
export const actionCategories: Record<string, AuditAction[]> = {
  '认证': ['login', 'logout'],
  '数据操作': ['create', 'update', 'delete', 'view'],
  '导入导出': ['export', 'import'],
  '执行': ['execute'],
  '配置': ['config_change'],
};

// Mock audit logs
const generateMockLogs = (): AuditLog[] => {
  const users = [
    { id: 'user-1', name: '张三' },
    { id: 'user-2', name: '李四' },
    { id: 'user-3', name: '王五' },
    { id: 'user-4', name: '赵六' },
    { id: 'user-5', name: '钱七' },
  ];

  const resources = [
    { type: 'Agent', names: ['通用助手', '代码专家', '翻译助手'] },
    { type: 'Prompt', names: ['默认助手提示词', '代码审查助手', '翻译助手'] },
    { type: 'Skill', names: ['web_search', 'file_reader', 'code_exec'] },
    { type: 'TestSet', names: ['基础能力测试集', '代码能力测试集'] },
    { type: 'Provider', names: ['OpenAI', 'Claude', '智谱AI'] },
    { type: 'User', names: ['张三', '李四', '王五'] },
    { type: 'Department', names: ['技术部', '产品部', '运营部'] },
  ];

  const actions: AuditAction[] = ['login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'execute', 'config_change'];

  const logs: AuditLog[] = [];
  const now = Date.now();

  for (let i = 0; i < 100; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const resource = resources[Math.floor(Math.random() * resources.length)];
    const resourceName = resource.names[Math.floor(Math.random() * resource.names.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];

    const timestamp = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000);

    logs.push({
      id: `log-${i}`,
      timestamp,
      userId: user.id,
      userName: user.name,
      action,
      resource: resource.type,
      resourceId: `${resource.type.toLowerCase()}-${Math.floor(Math.random() * 10)}`,
      resourceName,
      details: getActionDetails(action, resource.type, resourceName),
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: ['Chrome/120.0', 'Firefox/122.0', 'Safari/17.2'][Math.floor(Math.random() * 3)],
      status: Math.random() > 0.1 ? 'success' : 'failure',
      metadata: {
        browser: ['Chrome', 'Firefox', 'Safari'][Math.floor(Math.random() * 3)],
        os: ['macOS', 'Windows', 'Linux'][Math.floor(Math.random() * 3)],
      },
    });
  }

  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Get action details
function getActionDetails(action: AuditAction, resource: string, name: string): string {
  switch (action) {
    case 'login':
      return '用户登录系统';
    case 'logout':
      return '用户退出系统';
    case 'create':
      return `创建${resource}: ${name}`;
    case 'update':
      return `更新${resource}: ${name}`;
    case 'delete':
      return `删除${resource}: ${name}`;
    case 'view':
      return `查看${resource}: ${name}`;
    case 'export':
      return `导出${resource}: ${name}`;
    case 'import':
      return `导入${resource}: ${name}`;
    case 'execute':
      return `执行${resource}: ${name}`;
    case 'config_change':
      return `修改配置: ${name}`;
    default:
      return `未知操作: ${name}`;
  }
}

let mockLogs: AuditLog[] = [];

// Initialization
const initLogs = () => {
  if (mockLogs.length === 0) {
    mockLogs = generateMockLogs();
  }
};

// Simulated latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Filter parameter types
export interface AuditLogFilter {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  status?: 'success' | 'failure';
  startDate?: string;
  endDate?: string;
  search?: string;
}

// Audit Log API Mock
export const auditLogApi = {
  // Get audit log list
  async getLogs(filter?: AuditLogFilter): Promise<AuditLog[]> {
    await delay(300);
    initLogs();

    let logs = [...mockLogs];

    if (filter?.userId) {
      logs = logs.filter((l) => l.userId === filter.userId);
    }
    if (filter?.action) {
      logs = logs.filter((l) => l.action === filter.action);
    }
    if (filter?.resource) {
      logs = logs.filter((l) => l.resource === filter.resource);
    }
    if (filter?.status) {
      logs = logs.filter((l) => l.status === filter.status);
    }
    if (filter?.startDate) {
      logs = logs.filter((l) => l.timestamp >= new Date(filter.startDate!));
    }
    if (filter?.endDate) {
      logs = logs.filter((l) => l.timestamp <= new Date(filter.endDate!));
    }
    if (filter?.search) {
      const query = filter.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.userName.toLowerCase().includes(query) ||
          l.resourceName?.toLowerCase().includes(query) ||
          l.details.toLowerCase().includes(query)
      );
    }

    return logs;
  },

  // Get a single log's details
  async getLog(id: string): Promise<AuditLog | undefined> {
    await delay(200);
    initLogs();
    return mockLogs.find((l) => l.id === id);
  },

  // Get log statistics
  async getStats(filter?: { startDate?: string; endDate?: string }): Promise<{
    total: number;
    success: number;
    failure: number;
    byAction: Record<AuditAction, number>;
    byResource: Record<string, number>;
    byUser: Array<{ userId: string; userName: string; count: number }>;
  }> {
    await delay(200);
    initLogs();

    let logs = [...mockLogs];

    if (filter?.startDate) {
      logs = logs.filter((l) => l.timestamp >= new Date(filter.startDate!));
    }
    if (filter?.endDate) {
      logs = logs.filter((l) => l.timestamp <= new Date(filter.endDate!));
    }

    const byAction: Record<AuditAction, number> = {
      login: 0,
      logout: 0,
      create: 0,
      update: 0,
      delete: 0,
      view: 0,
      export: 0,
      import: 0,
      execute: 0,
      config_change: 0,
    };

    const byResource: Record<string, number> = {};
    const userCount: Record<string, { userName: string; count: number }> = {};

    logs.forEach((log) => {
      byAction[log.action]++;
      byResource[log.resource] = (byResource[log.resource] || 0) + 1;
      if (!userCount[log.userId]) {
        userCount[log.userId] = { userName: log.userName, count: 0 };
      }
      userCount[log.userId].count++;
    });

    const byUser = Object.entries(userCount)
      .map(([userId, data]) => ({
        userId,
        userName: data.userName,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: logs.length,
      success: logs.filter((l) => l.status === 'success').length,
      failure: logs.filter((l) => l.status === 'failure').length,
      byAction,
      byResource,
      byUser,
    };
  },

  // Export logs
  async exportLogs(format: 'csv' | 'json', filter?: AuditLogFilter): Promise<string> {
    await delay(500);
    const logs = await this.getLogs(filter);

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    const headers = [
      '时间',
      '用户',
      '操作',
      '资源类型',
      '资源名称',
      '详情',
      'IP地址',
      '状态',
    ];
    const rows = logs.map((l) => [
      l.timestamp.toISOString(),
      l.userName,
      l.action,
      l.resource,
      l.resourceName || '',
      l.details,
      l.ipAddress,
      l.status,
    ]);

    return [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
  },

  // Get resource type list
  async getResourceTypes(): Promise<string[]> {
    await delay(100);
    return ['Agent', 'Prompt', 'Skill', 'TestSet', 'Provider', 'User', 'Department'];
  },

  // Get action type list
  async getActionTypes(): Promise<AuditAction[]> {
    await delay(100);
    return ['login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'import', 'execute', 'config_change'];
  },
};
