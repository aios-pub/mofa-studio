/**
 * Agent Mock 数据
 */

import type { Agent, AgentPermission } from '../../types';

// Mock Agent 列表
export const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: '通用助手',
    description: '一个通用的 AI 助手，可以回答各种问题',
    avatar: '🤖',
    status: 'idle',
    modelId: 'gpt-4',
    providerId: 'openai',
    inputParameters: [],
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-03-14'),
  },
  {
    id: 'agent-2',
    name: '代码专家',
    description: '专注于编程和代码相关问题',
    avatar: '💻',
    status: 'idle',
    modelId: 'claude-3-opus',
    providerId: 'anthropic',
    inputParameters: [
      {
        id: 'language',
        name: 'language',
        label: '编程语言',
        type: 'select',
        required: true,
        defaultValue: 'python',
        placeholder: '选择编程语言',
        description: '指定代码生成的编程语言',
        options: [
          { label: 'Python', value: 'python' },
          { label: 'JavaScript', value: 'javascript' },
          { label: 'TypeScript', value: 'typescript' },
          { label: 'Rust', value: 'rust' },
          { label: 'Go', value: 'go' },
        ],
      },
      {
        id: 'style',
        name: 'style',
        label: '代码风格',
        type: 'select',
        required: false,
        defaultValue: 'clean',
        options: [
          { label: '简洁', value: 'clean' },
          { label: '详细注释', value: 'documented' },
          { label: '性能优先', value: 'performance' },
        ],
      },
    ],
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-03-10'),
  },
  {
    id: 'agent-3',
    name: '翻译助手',
    description: '多语言翻译专家',
    avatar: '🌐',
    status: 'thinking',
    modelId: 'gpt-4-turbo',
    providerId: 'openai',
    inputParameters: [
      {
        id: 'source_lang',
        name: 'source_lang',
        label: '源语言',
        type: 'select',
        required: true,
        defaultValue: 'auto',
        options: [
          { label: '自动检测', value: 'auto' },
          { label: '中文', value: 'zh' },
          { label: '英文', value: 'en' },
          { label: '日文', value: 'ja' },
        ],
      },
      {
        id: 'target_lang',
        name: 'target_lang',
        label: '目标语言',
        type: 'select',
        required: true,
        defaultValue: 'en',
        options: [
          { label: '中文', value: 'zh' },
          { label: '英文', value: 'en' },
          { label: '日文', value: 'ja' },
          { label: '韩文', value: 'ko' },
        ],
      },
      {
        id: 'formal',
        name: 'formal',
        label: '正式语气',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
    ],
    createdAt: new Date('2026-02-15'),
    updatedAt: new Date('2026-03-12'),
  },
  {
    id: 'agent-4',
    name: '数据分析',
    description: '数据分析和可视化专家',
    avatar: '📊',
    status: 'tool',
    modelId: 'gpt-4',
    providerId: 'openai',
    inputParameters: [
      {
        id: 'data_file',
        name: 'data_file',
        label: '数据文件',
        type: 'file',
        required: true,
        description: '上传要分析的数据文件 (CSV, Excel, JSON)',
      },
      {
        id: 'analysis_type',
        name: 'analysis_type',
        label: '分析类型',
        type: 'select',
        required: true,
        defaultValue: 'summary',
        options: [
          { label: '数据摘要', value: 'summary' },
          { label: '趋势分析', value: 'trend' },
          { label: '对比分析', value: 'comparison' },
          { label: '异常检测', value: 'anomaly' },
        ],
      },
      {
        id: 'max_rows',
        name: 'max_rows',
        label: '最大行数',
        type: 'number',
        required: false,
        defaultValue: 1000,
        validation: { min: 10, max: 100000 },
      },
    ],
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-03-13'),
  },
  {
    id: 'agent-5',
    name: '写作助手',
    description: '帮助创作各类文案和文章',
    avatar: '✍️',
    status: 'offline',
    modelId: 'claude-3-sonnet',
    providerId: 'anthropic',
    inputParameters: [
      {
        id: 'topic',
        name: 'topic',
        label: '主题',
        type: 'text',
        required: true,
        placeholder: '输入写作主题...',
        description: '指定文章或文案的主题',
      },
      {
        id: 'word_count',
        name: 'word_count',
        label: '目标字数',
        type: 'number',
        required: false,
        defaultValue: 500,
        validation: { min: 100, max: 5000 },
      },
      {
        id: 'tone',
        name: 'tone',
        label: '语调风格',
        type: 'select',
        required: false,
        defaultValue: 'professional',
        options: [
          { label: '专业', value: 'professional' },
          { label: '轻松', value: 'casual' },
          { label: '幽默', value: 'humorous' },
          { label: '严肃', value: 'serious' },
        ],
      },
    ],
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-14'),
  },
];

// Mock Agent 权限
export const mockAgentPermissions: AgentPermission[] = [
  {
    agentId: 'agent-1',
    features: {
      webSearch: true,
      webFetch: true,
      codeExec: false,
      fileRead: true,
      fileWrite: false,
      systemCommand: false,
      databaseAccess: false,
    },
    accessibleSkills: ['web_search', 'memory_search', 'file_reader'],
    accessiblePrompts: ['default-assistant', 'translation'],
    dataScope: 'self',
    allowSensitiveData: false,
    historyRetentionDays: 30,
  },
  {
    agentId: 'agent-2',
    features: {
      webSearch: true,
      webFetch: true,
      codeExec: true,
      fileRead: true,
      fileWrite: true,
      systemCommand: false,
      databaseAccess: false,
    },
    accessibleSkills: ['web_search', 'web_fetch', 'file_reader', 'file_writer', 'code_exec'],
    accessiblePrompts: ['code-review', 'code-generation'],
    dataScope: 'department',
    allowSensitiveData: false,
    historyRetentionDays: 60,
  },
  {
    agentId: 'agent-3',
    features: {
      webSearch: false,
      webFetch: false,
      codeExec: false,
      fileRead: false,
      fileWrite: false,
      systemCommand: false,
      databaseAccess: false,
    },
    accessibleSkills: ['memory_search'],
    accessiblePrompts: ['translation'],
    dataScope: 'self',
    allowSensitiveData: false,
    historyRetentionDays: 30,
  },
  {
    agentId: 'agent-4',
    features: {
      webSearch: true,
      webFetch: true,
      codeExec: true,
      fileRead: true,
      fileWrite: true,
      systemCommand: false,
      databaseAccess: true,
    },
    accessibleSkills: ['web_search', 'web_fetch', 'file_reader', 'file_writer', 'data_query'],
    accessiblePrompts: ['data-analysis'],
    dataScope: 'organization',
    allowSensitiveData: true,
    historyRetentionDays: 90,
  },
  {
    agentId: 'agent-5',
    features: {
      webSearch: true,
      webFetch: false,
      codeExec: false,
      fileRead: false,
      fileWrite: false,
      systemCommand: false,
      databaseAccess: false,
    },
    accessibleSkills: ['web_search', 'memory_search'],
    accessiblePrompts: ['writing-assistant', 'translation'],
    dataScope: 'self',
    allowSensitiveData: false,
    historyRetentionDays: 30,
  },
];

// 模拟 API 延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Agent API Mock
export const agentApi = {
  // 获取所有 Agent
  async getAll(): Promise<Agent[]> {
    await delay(300);
    return mockAgents;
  },

  // 获取单个 Agent
  async getById(id: string): Promise<Agent | undefined> {
    await delay(200);
    return mockAgents.find((a) => a.id === id);
  },

  // 创建 Agent
  async create(data: Partial<Agent>): Promise<Agent> {
    await delay(500);
    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: data.name || '新 Agent',
      description: data.description || '',
      avatar: data.avatar || '🤖',
      status: 'idle',
      modelId: data.modelId || 'gpt-4',
      providerId: data.providerId || 'openai',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockAgents.push(newAgent);
    return newAgent;
  },

  // 更新 Agent
  async update(id: string, data: Partial<Agent>): Promise<Agent | undefined> {
    await delay(300);
    const index = mockAgents.findIndex((a) => a.id === id);
    if (index === -1) return undefined;
    mockAgents[index] = { ...mockAgents[index], ...data, updatedAt: new Date() };
    return mockAgents[index];
  },

  // 删除 Agent
  async delete(id: string): Promise<boolean> {
    await delay(300);
    const index = mockAgents.findIndex((a) => a.id === id);
    if (index === -1) return false;
    mockAgents.splice(index, 1);
    return true;
  },

  // 获取 Agent 权限
  async getPermissions(agentId: string): Promise<AgentPermission | undefined> {
    await delay(200);
    return mockAgentPermissions.find((p) => p.agentId === agentId);
  },

  // 更新 Agent 权限
  async updatePermissions(
    agentId: string,
    data: Partial<AgentPermission>
  ): Promise<AgentPermission | undefined> {
    await delay(300);
    const index = mockAgentPermissions.findIndex((p) => p.agentId === agentId);
    if (index === -1) return undefined;
    mockAgentPermissions[index] = { ...mockAgentPermissions[index], ...data };
    return mockAgentPermissions[index];
  },
};
