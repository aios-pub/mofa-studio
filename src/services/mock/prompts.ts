/**
 * Prompt mock data
 */

// Prompt types
export interface Prompt {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  variables: PromptVariable[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'enum' | 'date';
  defaultValue?: string;
  required: boolean;
  options?: string[];
}

// Prompt version types
export interface PromptVersion {
  id: string;
  promptId: string;
  version: string;
  content: string;
  variables: PromptVariable[];
  changeNote: string;
  createdAt: Date;
  createdBy: string;
}

// Version diff types
export interface VersionDiff {
  additions: { line: number; content: string }[];
  deletions: { line: number; content: string }[];
  modifications: { line: number; oldContent: string; newContent: string }[];
}

// Mock prompt list
export const mockPrompts: Prompt[] = [
  {
    id: 'prompt-1',
    name: '默认助手提示词',
    description: '通用 AI 助手的系统提示词',
    category: '通用',
    content: `你是一个友好、专业的 AI 助手。请根据用户的需求提供准确、有帮助的回答。

遵循以下原则：
1. 保持回答简洁明了
2. 必要时提供详细解释
3. 如果不确定，请诚实告知
4. 保护用户隐私`,
    variables: [],
    version: '1.0',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-03-01'),
  },
  {
    id: 'prompt-2',
    name: '代码审查助手',
    description: '用于代码审查的专业提示词',
    category: '开发',
    content: `你是一个专业的代码审查助手。请根据以下规范审查代码：

项目: {{project_name}}
语言: {{language}}
审查重点: {{review_focus}}

请从以下维度进行评估：
1. 代码质量
2. 性能优化
3. 安全性
4. 可维护性

请提供具体的改进建议。`,
    variables: [
      { name: 'project_name', type: 'string', defaultValue: '我的项目', required: true },
      { name: 'language', type: 'enum', defaultValue: 'JavaScript', required: true, options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust'] },
      { name: 'review_focus', type: 'string', defaultValue: '全部', required: false },
    ],
    version: '1.2',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-03-10'),
  },
  {
    id: 'prompt-3',
    name: '翻译助手',
    description: '多语言翻译提示词',
    category: '翻译',
    content: `你是一个专业的翻译助手。请将用户输入的内容从 {{source_language}} 翻译成 {{target_language}}。

翻译要求：
1. 保持原文的语气和风格
2. 使用地道的表达方式
3. 专业术语保持准确
4. 必要时提供注释说明`,
    variables: [
      { name: 'source_language', type: 'enum', defaultValue: '英语', required: true, options: ['中文', '英语', '日语', '韩语', '法语', '德语'] },
      { name: 'target_language', type: 'enum', defaultValue: '中文', required: true, options: ['中文', '英语', '日语', '韩语', '法语', '德语'] },
    ],
    version: '1.1',
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-03-05'),
  },
  {
    id: 'prompt-4',
    name: '数据分析助手',
    description: '数据分析和可视化提示词',
    category: '分析',
    content: `你是一个数据分析专家。请帮助用户进行数据分析：

可用的工具：
- SQL 查询
- Python 数据处理
- 图表生成

请根据用户的需求：
1. 理解数据结构
2. 提供分析思路
3. 编写分析代码
4. 解释结果`,
    variables: [],
    version: '1.0',
    createdAt: new Date('2026-02-15'),
    updatedAt: new Date('2026-02-15'),
  },
  {
    id: 'prompt-5',
    name: '写作助手',
    description: '文案和文章创作提示词',
    category: '写作',
    content: `你是一个专业的写作助手。请根据用户的需求创作内容：

写作类型: {{writing_type}}
目标受众: {{target_audience}}
风格要求: {{style}}

请确保：
1. 内容结构清晰
2. 语言流畅自然
3. 符合目标受众特点
4. 必要时引用数据支撑`,
    variables: [
      { name: 'writing_type', type: 'enum', defaultValue: '文章', required: true, options: ['文章', '报告', '邮件', '营销文案', '社交媒体'] },
      { name: 'target_audience', type: 'string', defaultValue: '普通读者', required: false },
      { name: 'style', type: 'enum', defaultValue: '专业', required: false, options: ['专业', '轻松', '幽默', '正式', '学术'] },
    ],
    version: '1.0',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
  },
];

// Mock prompt version history
export const mockPromptVersions: PromptVersion[] = [
  {
    id: 'version-1-1',
    promptId: 'prompt-1',
    version: '1.0',
    content: `你是一个友好、专业的 AI 助手。请根据用户的需求提供准确、有帮助的回答。`,
    variables: [],
    changeNote: '初始版本',
    createdAt: new Date('2026-01-01'),
    createdBy: '系统管理员',
  },
  {
    id: 'version-1-2',
    promptId: 'prompt-1',
    version: '1.1',
    content: `你是一个友好、专业的 AI 助手。请根据用户的需求提供准确、有帮助的回答。

遵循以下原则：
1. 保持回答简洁明了
2. 必要时提供详细解释`,
    variables: [],
    changeNote: '添加回答原则',
    createdAt: new Date('2026-02-01'),
    createdBy: '系统管理员',
  },
  {
    id: 'version-1-3',
    promptId: 'prompt-1',
    version: '1.2',
    content: `你是一个友好、专业的 AI 助手。请根据用户的需求提供准确、有帮助的回答。

遵循以下原则：
1. 保持回答简洁明了
2. 必要时提供详细解释
3. 如果不确定，请诚实告知
4. 保护用户隐私`,
    variables: [],
    changeNote: '完善回答原则，添加隐私保护',
    createdAt: new Date('2026-03-01'),
    createdBy: '系统管理员',
  },
  {
    id: 'version-2-1',
    promptId: 'prompt-2',
    version: '1.0',
    content: `你是一个专业的代码审查助手。请根据代码规范审查代码。`,
    variables: [
      { name: 'project_name', type: 'string', defaultValue: '我的项目', required: true },
    ],
    changeNote: '初始版本',
    createdAt: new Date('2026-01-15'),
    createdBy: '开发团队',
  },
  {
    id: 'version-2-2',
    promptId: 'prompt-2',
    version: '1.1',
    content: `你是一个专业的代码审查助手。请根据以下规范审查代码：

项目: {{project_name}}
语言: {{language}}

请从以下维度进行评估：
1. 代码质量
2. 性能优化
3. 安全性`,
    variables: [
      { name: 'project_name', type: 'string', defaultValue: '我的项目', required: true },
      { name: 'language', type: 'enum', defaultValue: 'JavaScript', required: true, options: ['JavaScript', 'TypeScript', 'Python', 'Java'] },
    ],
    changeNote: '添加语言变量，增加评估维度',
    createdAt: new Date('2026-02-15'),
    createdBy: '开发团队',
  },
  {
    id: 'version-2-3',
    promptId: 'prompt-2',
    version: '1.2',
    content: `你是一个专业的代码审查助手。请根据以下规范审查代码：

项目: {{project_name}}
语言: {{language}}
审查重点: {{review_focus}}

请从以下维度进行评估：
1. 代码质量
2. 性能优化
3. 安全性
4. 可维护性

请提供具体的改进建议。`,
    variables: [
      { name: 'project_name', type: 'string', defaultValue: '我的项目', required: true },
      { name: 'language', type: 'enum', defaultValue: 'JavaScript', required: true, options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust'] },
      { name: 'review_focus', type: 'string', defaultValue: '全部', required: false },
    ],
    changeNote: '添加审查重点变量，增加可维护性维度，添加更多语言支持',
    createdAt: new Date('2026-03-10'),
    createdBy: '开发团队',
  },
];

// Mock API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Prompt API Mock
export const promptApi = {
  // Get all prompts
  async getAll(): Promise<Prompt[]> {
    await delay(300);
    return mockPrompts;
  },

  // Get by category
  async getByCategory(category: string): Promise<Prompt[]> {
    await delay(200);
    return mockPrompts.filter((p) => p.category === category);
  },

  // Get a single prompt
  async getById(id: string): Promise<Prompt | undefined> {
    await delay(200);
    return mockPrompts.find((p) => p.id === id);
  },

  // Create prompt
  async create(data: Partial<Prompt>): Promise<Prompt> {
    await delay(500);
    const newPrompt: Prompt = {
      id: `prompt-${Date.now()}`,
      name: data.name || '新提示词',
      description: data.description || '',
      category: data.category || '通用',
      content: data.content || '',
      variables: data.variables || [],
      version: '1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrompts.push(newPrompt);
    return newPrompt;
  },

  // Update prompt
  async update(id: string, data: Partial<Prompt>): Promise<Prompt | undefined> {
    await delay(300);
    const index = mockPrompts.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    mockPrompts[index] = {
      ...mockPrompts[index],
      ...data,
      version: `${parseFloat(mockPrompts[index].version) + 0.1}`,
      updatedAt: new Date(),
    };
    return mockPrompts[index];
  },

  // Delete prompt
  async delete(id: string): Promise<boolean> {
    await delay(300);
    const index = mockPrompts.findIndex((p) => p.id === id);
    if (index === -1) return false;
    mockPrompts.splice(index, 1);
    return true;
  },

  // Get all categories
  async getCategories(): Promise<string[]> {
    await delay(100);
    return [...new Set(mockPrompts.map((p) => p.category))];
  },

  // ===== Version control =====

  // Get all versions of a prompt
  async getVersions(promptId: string): Promise<PromptVersion[]> {
    await delay(200);
    return mockPromptVersions
      .filter((v) => v.promptId === promptId)
      .sort((a, b) => parseFloat(b.version) - parseFloat(a.version));
  },

  // Get a specific version
  async getVersion(versionId: string): Promise<PromptVersion | undefined> {
    await delay(150);
    return mockPromptVersions.find((v) => v.id === versionId);
  },

  // Save a new version (called automatically on update)
  async saveVersion(
    promptId: string,
    content: string,
    variables: PromptVariable[],
    changeNote: string
  ): Promise<PromptVersion> {
    await delay(300);
    const prompt = mockPrompts.find((p) => p.id === promptId);
    if (!prompt) throw new Error('Prompt not found');

    const existingVersions = mockPromptVersions.filter((v) => v.promptId === promptId);
    const latestVersion = existingVersions.length > 0
      ? Math.max(...existingVersions.map((v) => parseFloat(v.version)))
      : 0;

    const newVersion: PromptVersion = {
      id: `version-${Date.now()}`,
      promptId,
      version: (latestVersion + 0.1).toFixed(1),
      content,
      variables,
      changeNote,
      createdAt: new Date(),
      createdBy: '当前用户',
    };

    mockPromptVersions.push(newVersion);
    return newVersion;
  },

  // Roll back to a specific version
  async rollbackToVersion(promptId: string, versionId: string): Promise<Prompt | undefined> {
    await delay(400);
    const version = mockPromptVersions.find((v) => v.id === versionId);
    if (!version) return undefined;

    const index = mockPrompts.findIndex((p) => p.id === promptId);
    if (index === -1) return undefined;

    // Save the current state as a new version
    const currentPrompt = mockPrompts[index];
    await this.saveVersion(promptId, currentPrompt.content, currentPrompt.variables, `回滚前自动保存`);

    // Update to historical version content
    mockPrompts[index] = {
      ...currentPrompt,
      content: version.content,
      variables: version.variables,
      version: `${parseFloat(currentPrompt.version) + 0.1}`,
      updatedAt: new Date(),
    };

    return mockPrompts[index];
  },

  // Compare two versions
  async compareVersions(versionId1: string, versionId2: string): Promise<VersionDiff> {
    await delay(200);
    const v1 = mockPromptVersions.find((v) => v.id === versionId1);
    const v2 = mockPromptVersions.find((v) => v.id === versionId2);

    if (!v1 || !v2) {
      return { additions: [], deletions: [], modifications: [] };
    }

    const lines1 = v1.content.split('\n');
    const lines2 = v2.content.split('\n');
    const diff: VersionDiff = { additions: [], deletions: [], modifications: [] };

    const maxLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';

      if (!line1 && line2) {
        diff.additions.push({ line: i + 1, content: line2 });
      } else if (line1 && !line2) {
        diff.deletions.push({ line: i + 1, content: line1 });
      } else if (line1 !== line2) {
        diff.modifications.push({ line: i + 1, oldContent: line1, newContent: line2 });
      }
    }

    return diff;
  },

  // ===== Testing =====

  // Replace variables to generate the final content
  replaceVariables(content: string, variables: PromptVariable[], values: Record<string, string> = {}): string {
    let result = content;

    // Replace custom variables
    variables.forEach((variable) => {
      const value = values[variable.name] ?? variable.defaultValue ?? '';
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });

    // Replace system variables
    const now = new Date();
    const systemVariables: Record<string, string> = {
      current_date: now.toLocaleDateString('zh-CN'),
      current_time: now.toLocaleTimeString('zh-CN'),
      current_datetime: now.toLocaleString('zh-CN'),
      user_name: '当前用户',
      timestamp: now.getTime().toString(),
    };

    Object.entries(systemVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  },

  // Estimate token count (rough: ~1.5 chars/token for Chinese, ~4 chars/token for English)
  estimateTokens(content: string): { input: number; estimated: number } {
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = content.length - chineseChars;

    const estimated = Math.ceil(chineseChars / 1.5 + otherChars / 4);

    return {
      input: content.length,
      estimated,
    };
  },

  // Simulated conversation test
  async simulateChat(promptId: string, userInput: string, _variableValues: Record<string, string> = {}): Promise<string> {
    await delay(1000 + Math.random() * 1000);

    const prompt = mockPrompts.find((p) => p.id === promptId);
    if (!prompt) throw new Error('Prompt not found');

    // Simulate responses for different prompt types
    const responses: Record<string, string[]> = {
      '通用': [
        `好的，我理解您的问题是："${userInput}"。让我为您详细解答...\n\n根据您的需求，我建议您可以从以下几个方面入手：\n1. 首先，明确问题的核心\n2. 其次，收集相关信息\n3. 最后，制定解决方案\n\n希望这个回答对您有帮助！`,
        `感谢您的提问。关于"${userInput}"，这是一个很好的问题。\n\n我的建议是：保持学习的热情，持续实践和总结。如果您有更具体的问题，欢迎继续提问！`,
      ],
      '开发': [
        `我已审查了您提供的代码。针对"${userInput}"相关的内容，我发现以下几点：\n\n**代码质量**：整体结构清晰\n**性能**：建议优化循环逻辑\n**安全性**：注意输入验证\n**可维护性**：添加适当的注释\n\n具体建议：考虑使用更高效的数据结构来处理大数据集。`,
      ],
      '翻译': [
        `原文：${userInput}\n\n译文：\n[这里是翻译结果]\n\n注：翻译保持了原文的语气和风格，专业术语已准确对应。`,
      ],
      '分析': [
        `针对您的数据"${userInput}"，我进行了以下分析：\n\n**数据概览**：识别到数据的基本特征\n**分析建议**：\n1. 数据清洗：处理缺失值和异常值\n2. 探索性分析：查看数据分布\n3. 建模：选择合适的分析模型\n\n需要我提供具体的分析代码吗？`,
      ],
      '写作': [
        `根据您的要求"${userInput}"，我为您创作了以下内容：\n\n---\n[创作内容]\n\n---\n\n这篇内容符合您指定的风格和目标受众。如需修改，请告诉我具体方向。`,
      ],
    };

    const categoryResponses = responses[prompt.category] || responses['通用'];
    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
  },
};
