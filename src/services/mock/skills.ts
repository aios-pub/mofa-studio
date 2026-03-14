/**
 * Skills Mock 数据
 */

// Skill 类型
export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'builtin' | 'custom' | 'api';
  category: string;
  parameters: SkillParameter[];
  timeout: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

// Mock Skills 列表
export const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'web_search',
    description: '网络搜索功能，可以搜索互联网获取最新信息',
    type: 'builtin',
    category: '搜索',
    parameters: [
      { name: 'query', type: 'string', description: '搜索关键词', required: true },
      { name: 'limit', type: 'number', description: '返回结果数量', required: false, defaultValue: 10 },
    ],
    timeout: 30000,
    enabled: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'skill-2',
    name: 'web_fetch',
    description: '网页抓取功能，可以获取指定网页的内容',
    type: 'builtin',
    category: '网络',
    parameters: [
      { name: 'url', type: 'string', description: '网页 URL', required: true },
      { name: 'selector', type: 'string', description: 'CSS 选择器', required: false },
    ],
    timeout: 20000,
    enabled: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'skill-3',
    name: 'memory_search',
    description: '记忆搜索功能，从历史对话中检索相关信息',
    type: 'builtin',
    category: '搜索',
    parameters: [
      { name: 'query', type: 'string', description: '搜索关键词', required: true },
      { name: 'top_k', type: 'number', description: '返回结果数量', required: false, defaultValue: 5 },
    ],
    timeout: 10000,
    enabled: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'skill-4',
    name: 'file_reader',
    description: '文件读取功能，可以读取本地文件内容',
    type: 'builtin',
    category: '文件',
    parameters: [
      { name: 'path', type: 'string', description: '文件路径', required: true },
      { name: 'encoding', type: 'string', description: '文件编码', required: false, defaultValue: 'utf-8' },
    ],
    timeout: 15000,
    enabled: true,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  },
  {
    id: 'skill-5',
    name: 'file_writer',
    description: '文件写入功能，可以向文件写入内容',
    type: 'builtin',
    category: '文件',
    parameters: [
      { name: 'path', type: 'string', description: '文件路径', required: true },
      { name: 'content', type: 'string', description: '写入内容', required: true },
      { name: 'mode', type: 'string', description: '写入模式', required: false, defaultValue: 'overwrite' },
    ],
    timeout: 15000,
    enabled: true,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  },
  {
    id: 'skill-6',
    name: 'code_exec',
    description: '代码执行功能，在沙箱环境中执行代码',
    type: 'builtin',
    category: '代码',
    parameters: [
      { name: 'code', type: 'string', description: '要执行的代码', required: true },
      { name: 'language', type: 'string', description: '编程语言', required: true, defaultValue: 'python' },
      { name: 'timeout', type: 'number', description: '执行超时时间(秒)', required: false, defaultValue: 30 },
    ],
    timeout: 60000,
    enabled: false,
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-01'),
  },
  {
    id: 'skill-7',
    name: 'data_query',
    description: '数据库查询功能，执行 SQL 查询',
    type: 'builtin',
    category: '数据',
    parameters: [
      { name: 'sql', type: 'string', description: 'SQL 查询语句', required: true },
      { name: 'database', type: 'string', description: '数据库名称', required: true },
    ],
    timeout: 30000,
    enabled: true,
    createdAt: new Date('2026-02-15'),
    updatedAt: new Date('2026-02-15'),
  },
  {
    id: 'skill-8',
    name: 'api_call',
    description: 'API 调用功能，发送 HTTP 请求',
    type: 'builtin',
    category: '网络',
    parameters: [
      { name: 'url', type: 'string', description: 'API URL', required: true },
      { name: 'method', type: 'string', description: 'HTTP 方法', required: true, defaultValue: 'GET' },
      { name: 'headers', type: 'object', description: '请求头', required: false },
      { name: 'body', type: 'object', description: '请求体', required: false },
    ],
    timeout: 30000,
    enabled: true,
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-02-20'),
  },
];

// 模拟 API 延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Skill API Mock
export const skillApi = {
  // 获取所有 Skills
  async getAll(): Promise<Skill[]> {
    await delay(300);
    return mockSkills;
  },

  // 按分类获取
  async getByCategory(category: string): Promise<Skill[]> {
    await delay(200);
    return mockSkills.filter((s) => s.category === category);
  },

  // 获取单个 Skill
  async getById(id: string): Promise<Skill | undefined> {
    await delay(200);
    return mockSkills.find((s) => s.id === id);
  },

  // 按 ID 列表获取
  async getByIds(ids: string[]): Promise<Skill[]> {
    await delay(200);
    return mockSkills.filter((s) => ids.includes(s.id));
  },

  // 创建 Skill
  async create(data: Partial<Skill>): Promise<Skill> {
    await delay(500);
    const newSkill: Skill = {
      id: `skill-${Date.now()}`,
      name: data.name || '新 Skill',
      description: data.description || '',
      type: data.type || 'custom',
      category: data.category || '自定义',
      parameters: data.parameters || [],
      timeout: data.timeout || 30000,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockSkills.push(newSkill);
    return newSkill;
  },

  // 更新 Skill
  async update(id: string, data: Partial<Skill>): Promise<Skill | undefined> {
    await delay(300);
    const index = mockSkills.findIndex((s) => s.id === id);
    if (index === -1) return undefined;
    mockSkills[index] = { ...mockSkills[index], ...data, updatedAt: new Date() };
    return mockSkills[index];
  },

  // 删除 Skill
  async delete(id: string): Promise<boolean> {
    await delay(300);
    const index = mockSkills.findIndex((s) => s.id === id);
    if (index === -1) return false;
    mockSkills.splice(index, 1);
    return true;
  },

  // 获取所有分类
  async getCategories(): Promise<string[]> {
    await delay(100);
    return [...new Set(mockSkills.map((s) => s.category))];
  },

  // 执行 Skill（模拟）
  async execute(id: string, params: Record<string, unknown>): Promise<{ success: boolean; result: unknown }> {
    await delay(1000);
    const skill = mockSkills.find((s) => s.id === id);
    if (!skill) {
      return { success: false, result: 'Skill not found' };
    }
    return {
      success: true,
      result: `执行 ${skill.name} 成功，参数: ${JSON.stringify(params)}`,
    };
  },
};
