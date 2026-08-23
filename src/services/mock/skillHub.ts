/**
 * Skill hub mock service
 * Simulates the API of https://skillhub.tencent.com/
 */

import type { HubSkill, HubCategory, HubSearchResult, HubStats, PublishSkillRequest } from '../../types/skill';

// Mock hub skills list
export const mockHubSkills: HubSkill[] = [
  {
    hubId: 'hub-1',
    name: 'github_search',
    description: 'GitHub 代码搜索功能，搜索 GitHub 上的开源项目和代码',
    type: 'api',
    category: '开发工具',
    parameters: [
      { name: 'query', type: 'string', description: '搜索关键词', required: true },
      { name: 'language', type: 'string', description: '编程语言', required: false },
      { name: 'sort', type: 'string', description: '排序方式', required: false, defaultValue: 'best-match' },
    ],
    timeout: 30000,
    version: '1.2.0',
    author: 'tencent',
    downloads: 15680,
    rating: 4.8,
    tags: ['github', 'search', 'code'],
    readme: '# GitHub Search\n\n搜索 GitHub 上的代码和项目。\n\n## 使用方法\n\n```javascript\ngithub_search({ query: "react hooks" })\n```',
    publishedAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-03-01'),
  },
  {
    hubId: 'hub-2',
    name: 'slack_notify',
    description: 'Slack 消息通知，发送消息到 Slack 频道',
    type: 'api',
    category: '通知',
    parameters: [
      { name: 'channel', type: 'string', description: 'Slack 频道 ID', required: true },
      { name: 'message', type: 'string', description: '消息内容', required: true },
      { name: 'username', type: 'string', description: '发送者名称', required: false },
    ],
    timeout: 15000,
    version: '2.0.1',
    author: 'community',
    downloads: 8920,
    rating: 4.5,
    tags: ['slack', 'notification', 'messaging'],
    publishedAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-02-20'),
  },
  {
    hubId: 'hub-3',
    name: 'weather_query',
    description: '天气查询功能，获取指定城市的实时天气信息',
    type: 'builtin',
    category: '生活服务',
    parameters: [
      { name: 'city', type: 'string', description: '城市名称', required: true },
      { name: 'unit', type: 'string', description: '温度单位', required: false, defaultValue: 'celsius' },
    ],
    timeout: 10000,
    version: '1.0.5',
    author: 'tencent',
    downloads: 25600,
    rating: 4.9,
    tags: ['weather', 'api', 'location'],
    readme: '# Weather Query\n\n获取城市天气信息。',
    publishedAt: new Date('2025-12-01'),
    updatedAt: new Date('2026-03-10'),
  },
  {
    hubId: 'hub-4',
    name: 'pdf_generator',
    description: 'PDF 文档生成，将 HTML 或 Markdown 转换为 PDF',
    type: 'builtin',
    category: '文档处理',
    parameters: [
      { name: 'content', type: 'string', description: 'HTML 或 Markdown 内容', required: true },
      { name: 'format', type: 'string', description: '输入格式', required: false, defaultValue: 'markdown' },
      { name: 'options', type: 'object', description: 'PDF 选项', required: false },
    ],
    timeout: 60000,
    version: '3.1.0',
    author: 'community',
    downloads: 12400,
    rating: 4.6,
    tags: ['pdf', 'document', 'conversion'],
    publishedAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-03-05'),
  },
  {
    hubId: 'hub-5',
    name: 'image_recognition',
    description: '图像识别功能，使用 AI 识别图片中的内容',
    type: 'api',
    category: 'AI 能力',
    parameters: [
      { name: 'imageUrl', type: 'string', description: '图片 URL', required: true },
      { name: 'model', type: 'string', description: '识别模型', required: false, defaultValue: 'general' },
    ],
    timeout: 45000,
    version: '2.2.0',
    author: 'tencent',
    downloads: 32100,
    rating: 4.7,
    tags: ['ai', 'image', 'recognition', 'vision'],
    readme: '# Image Recognition\n\n使用腾讯 AI 服务识别图片内容。',
    publishedAt: new Date('2025-11-15'),
    updatedAt: new Date('2026-03-12'),
  },
  {
    hubId: 'hub-6',
    name: 'database_backup',
    description: '数据库备份功能，支持 MySQL、PostgreSQL 等数据库',
    type: 'custom',
    category: '数据库',
    parameters: [
      { name: 'host', type: 'string', description: '数据库主机', required: true },
      { name: 'database', type: 'string', description: '数据库名称', required: true },
      { name: 'type', type: 'string', description: '数据库类型', required: true, defaultValue: 'mysql' },
    ],
    timeout: 120000,
    version: '1.5.0',
    author: 'community',
    downloads: 6780,
    rating: 4.3,
    tags: ['database', 'backup', 'mysql', 'postgresql'],
    publishedAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-02-28'),
  },
  {
    hubId: 'hub-7',
    name: 'email_sender',
    description: '邮件发送功能，支持 HTML 邮件和附件',
    type: 'api',
    category: '通知',
    parameters: [
      { name: 'to', type: 'string', description: '收件人邮箱', required: true },
      { name: 'subject', type: 'string', description: '邮件主题', required: true },
      { name: 'body', type: 'string', description: '邮件内容', required: true },
      { name: 'html', type: 'boolean', description: '是否为 HTML 格式', required: false, defaultValue: false },
    ],
    timeout: 30000,
    version: '1.8.2',
    author: 'tencent',
    downloads: 18900,
    rating: 4.4,
    tags: ['email', 'smtp', 'notification'],
    publishedAt: new Date('2025-12-10'),
    updatedAt: new Date('2026-03-08'),
  },
  {
    hubId: 'hub-8',
    name: 'chart_generator',
    description: '图表生成功能，支持多种图表类型',
    type: 'builtin',
    category: '数据可视化',
    parameters: [
      { name: 'type', type: 'string', description: '图表类型', required: true, defaultValue: 'bar' },
      { name: 'data', type: 'array', description: '图表数据', required: true },
      { name: 'options', type: 'object', description: '图表选项', required: false },
    ],
    timeout: 20000,
    version: '2.0.0',
    author: 'community',
    downloads: 14300,
    rating: 4.6,
    tags: ['chart', 'visualization', 'graph'],
    readme: '# Chart Generator\n\n生成各种类型的图表。',
    publishedAt: new Date('2026-02-10'),
    updatedAt: new Date('2026-03-15'),
  },
];

// Mock category list
export const mockHubCategories: HubCategory[] = [
  { id: 'dev-tools', name: '开发工具', icon: 'code', count: 45 },
  { id: 'notification', name: '通知', icon: 'bell', count: 23 },
  { id: 'life-service', name: '生活服务', icon: 'home', count: 18 },
  { id: 'document', name: '文档处理', icon: 'file', count: 32 },
  { id: 'ai', name: 'AI 能力', icon: 'robot', count: 28 },
  { id: 'database', name: '数据库', icon: 'database', count: 15 },
  { id: 'visualization', name: '数据可视化', icon: 'chart', count: 21 },
  { id: 'network', name: '网络', icon: 'global', count: 19 },
  { id: 'file', name: '文件操作', icon: 'folder', count: 26 },
];

// Simulated latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Skill Hub API Mock
export const skillHubApi = {
  // Get popular skills
  async getPopular(limit: number = 10): Promise<HubSkill[]> {
    await delay(400);
    return [...mockHubSkills]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  },

  // Get latest skills
  async getLatest(limit: number = 10): Promise<HubSkill[]> {
    await delay(400);
    return [...mockHubSkills]
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .reverse()
      .slice(0, limit);
  },

  // Get all categories
  async getCategories(): Promise<HubCategory[]> {
    await delay(200);
    return mockHubCategories;
  },

  // Search skills
  async search(query: string, category?: string, page: number = 1, pageSize: number = 20): Promise<HubSearchResult> {
    await delay(500);

    let filtered = mockHubSkills;

    // Search filtering
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(lowerQuery) ||
          s.description.toLowerCase().includes(lowerQuery) ||
          s.tags.some((t) => t.toLowerCase().includes(lowerQuery))
      );
    }

    // Category filtering
    if (category && category !== 'all') {
      filtered = filtered.filter((s) => s.category === category);
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const skills = filtered.slice(start, start + pageSize);

    return {
      skills,
      total,
      page,
      pageSize,
    };
  },

  // Get a single skill's details
  async getById(hubId: string): Promise<HubSkill | undefined> {
    await delay(300);
    return mockHubSkills.find((s) => s.hubId === hubId);
  },

  // Get hub statistics
  async getStats(): Promise<HubStats> {
    await delay(200);
    return {
      totalSkills: mockHubSkills.length,
      totalDownloads: mockHubSkills.reduce((sum, s) => sum + s.downloads, 0),
      totalCategories: mockHubCategories.length,
    };
  },

  // Publish a skill to the hub
  async publish(request: PublishSkillRequest): Promise<HubSkill> {
    await delay(800);

    const newSkill: HubSkill = {
      hubId: `hub-${Date.now()}`,
      name: request.name,
      description: request.description,
      type: request.type,
      category: request.category,
      parameters: request.parameters,
      timeout: request.timeout,
      version: '1.0.0',
      author: 'local-user',
      downloads: 0,
      rating: 0,
      tags: request.tags,
      readme: request.readme,
      publishedAt: new Date(),
      updatedAt: new Date(),
    };

    mockHubSkills.push(newSkill);
    return newSkill;
  },

  // Check for updates
  async checkUpdates(installedSkills: Array<{ hubId: string; version: string }>): Promise<Array<{ hubId: string; latestVersion: string }>> {
    await delay(300);

    const updates: Array<{ hubId: string; latestVersion: string }> = [];

    for (const installed of installedSkills) {
      const hubSkill = mockHubSkills.find((s) => s.hubId === installed.hubId);
      if (hubSkill && hubSkill.version !== installed.version) {
        updates.push({
          hubId: installed.hubId,
          latestVersion: hubSkill.version,
        });
      }
    }

    return updates;
  },
};
