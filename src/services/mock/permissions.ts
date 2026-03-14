/**
 * 权限 Mock 数据和 API
 */

import type {
  PermissionConfig,
  PermissionTemplate,
  PermissionAuditLog,
  FeaturePermissions,
} from '../../types/permission';

// 默认功能权限配置
export const defaultFeaturePermissions: FeaturePermissions = {
  webSearch: true,
  webFetch: true,
  codeExec: false,
  fileRead: true,
  fileWrite: false,
  systemCommand: false,
  databaseAccess: false,
};

// 功能权限定义
export const featurePermissionDefinitions = [
  {
    key: 'webSearch',
    label: '联网搜索',
    description: '允许 Agent 使用搜索引擎搜索互联网信息',
    icon: '🔍',
  },
  {
    key: 'webFetch',
    label: '网页抓取',
    description: '允许 Agent 抓取指定网页的内容',
    icon: '📄',
  },
  {
    key: 'codeExec',
    label: '执行代码',
    description: '允许 Agent 在沙箱环境中执行代码',
    icon: '⚡',
  },
  {
    key: 'fileRead',
    label: '文件读取',
    description: '允许 Agent 读取本地文件',
    icon: '📖',
  },
  {
    key: 'fileWrite',
    label: '文件写入',
    description: '允许 Agent 写入或修改本地文件',
    icon: '✏️',
  },
  {
    key: 'systemCommand',
    label: '系统命令',
    description: '允许 Agent 执行系统命令',
    icon: '💻',
  },
  {
    key: 'databaseAccess',
    label: '数据库访问',
    description: '允许 Agent 访问和查询数据库',
    icon: '🗄️',
  },
];

// 权限模板列表
export const mockPermissionTemplates: PermissionTemplate[] = [
  {
    id: 'template-basic',
    name: '基础助手',
    description: '适用于一般对话场景，仅具备基础功能',
    isDefault: true,
    config: {
      features: {
        ...defaultFeaturePermissions,
        webSearch: true,
        fileRead: true,
      },
      accessibleSkills: ['web_search', 'memory_search'],
      accessiblePrompts: ['default-assistant'],
      dataScope: 'self',
      allowSensitiveData: false,
      historyRetentionDays: 30,
    },
  },
  {
    id: 'template-developer',
    name: '开发助手',
    description: '适用于代码开发场景，具备代码执行能力',
    config: {
      features: {
        ...defaultFeaturePermissions,
        webSearch: true,
        webFetch: true,
        codeExec: true,
        fileRead: true,
        fileWrite: true,
      },
      accessibleSkills: ['web_search', 'web_fetch', 'file_reader', 'file_writer', 'code_exec'],
      accessiblePrompts: ['code-review', 'code-generation', 'default-assistant'],
      dataScope: 'department',
      allowSensitiveData: false,
      historyRetentionDays: 60,
    },
  },
  {
    id: 'template-analyst',
    name: '数据分析师',
    description: '适用于数据分析场景，具备数据库访问能力',
    config: {
      features: {
        ...defaultFeaturePermissions,
        webSearch: true,
        webFetch: true,
        fileRead: true,
        databaseAccess: true,
      },
      accessibleSkills: ['web_search', 'web_fetch', 'file_reader', 'data_query'],
      accessiblePrompts: ['data-analysis', 'default-assistant'],
      dataScope: 'organization',
      allowSensitiveData: true,
      historyRetentionDays: 90,
    },
  },
  {
    id: 'template-admin',
    name: '管理员',
    description: '具备所有权限，适用于高级管理场景',
    config: {
      features: {
        webSearch: true,
        webFetch: true,
        codeExec: true,
        fileRead: true,
        fileWrite: true,
        systemCommand: true,
        databaseAccess: true,
      },
      accessibleSkills: [
        'web_search',
        'web_fetch',
        'memory_search',
        'file_reader',
        'file_writer',
        'code_exec',
        'data_query',
        'api_call',
      ],
      accessiblePrompts: ['default-assistant', 'code-review', 'data-analysis', 'admin'],
      dataScope: 'organization',
      allowSensitiveData: true,
      historyRetentionDays: 365,
    },
  },
];

// Agent 权限配置存储
const agentPermissions: Map<string, PermissionConfig> = new Map();

// 初始化一些默认权限
agentPermissions.set('agent-1', mockPermissionTemplates[0].config);
agentPermissions.set('agent-2', mockPermissionTemplates[1].config);
agentPermissions.set('agent-3', mockPermissionTemplates[0].config);
agentPermissions.set('agent-4', mockPermissionTemplates[2].config);
agentPermissions.set('agent-5', mockPermissionTemplates[0].config);

// 权限审计日志
const auditLogs: PermissionAuditLog[] = [
  {
    id: 'log-1',
    agentId: 'agent-1',
    agentName: '通用助手',
    action: 'update',
    changes: [
      { field: 'features.webSearch', oldValue: false, newValue: true },
    ],
    operator: 'admin',
    operatedAt: new Date('2026-03-14T10:00:00'),
  },
  {
    id: 'log-2',
    agentId: 'agent-2',
    agentName: '代码专家',
    action: 'update',
    changes: [
      { field: 'features.codeExec', oldValue: false, newValue: true },
      { field: 'accessibleSkills', oldValue: [], newValue: ['code_exec'] },
    ],
    operator: 'admin',
    operatedAt: new Date('2026-03-13T15:30:00'),
  },
];

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 权限 API
export const permissionApi = {
  // 获取 Agent 权限配置
  async getAgentPermission(agentId: string): Promise<PermissionConfig | undefined> {
    await delay(200);
    return agentPermissions.get(agentId);
  },

  // 更新 Agent 权限配置
  async updateAgentPermission(
    agentId: string,
    config: PermissionConfig
  ): Promise<PermissionConfig> {
    await delay(300);
    agentPermissions.set(agentId, config);
    return config;
  },

  // 应用权限模板
  async applyTemplate(
    agentId: string,
    templateId: string
  ): Promise<PermissionConfig> {
    await delay(200);
    const template = mockPermissionTemplates.find((t) => t.id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }
    agentPermissions.set(agentId, { ...template.config });
    return template.config;
  },

  // 获取所有权限模板
  async getTemplates(): Promise<PermissionTemplate[]> {
    await delay(100);
    return mockPermissionTemplates;
  },

  // 获取权限审计日志
  async getAuditLogs(agentId?: string): Promise<PermissionAuditLog[]> {
    await delay(200);
    if (agentId) {
      return auditLogs.filter((log) => log.agentId === agentId);
    }
    return auditLogs;
  },

  // 添加审计日志
  async addAuditLog(log: Omit<PermissionAuditLog, 'id' | 'operatedAt'>): Promise<PermissionAuditLog> {
    await delay(100);
    const newLog: PermissionAuditLog = {
      ...log,
      id: `log-${Date.now()}`,
      operatedAt: new Date(),
    };
    auditLogs.unshift(newLog);
    return newLog;
  },
};
