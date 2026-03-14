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
