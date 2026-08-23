/**
 * Conversation Mock 数据
 */

import type { Conversation, Message } from '../../types';

// Mock Messages
const createMockMessages = (conversationId: string): Message[] => [
  {
    id: `${conversationId}-msg-1`,
    conversationId,
    role: 'user',
    content: '你好，请帮我分析一下最近的市场趋势',
    status: 'completed',
    createdAt: new Date('2026-03-14T10:30:00'),
  },
  {
    id: `${conversationId}-msg-2`,
    conversationId,
    role: 'assistant',
    content: '好的，我来帮您分析最近的市场趋势。根据最新的数据分析，市场呈现以下几个特点：\n\n1. **科技板块持续走强**：AI 相关企业表现亮眼\n2. **消费领域逐步复苏**：线下消费回暖明显\n3. **新能源领域波动加剧**：政策影响显著\n\n您想深入了解哪个领域的详细情况？',
    status: 'completed',
    tokens: { input: 15, output: 120 },
    createdAt: new Date('2026-03-14T10:30:15'),
  },
  {
    id: `${conversationId}-msg-3`,
    conversationId,
    role: 'user',
    content: '请详细分析一下科技板块',
    status: 'completed',
    createdAt: new Date('2026-03-14T10:31:00'),
  },
  {
    id: `${conversationId}-msg-4`,
    conversationId,
    role: 'assistant',
    content: '科技板块详细分析如下：\n\n## 人工智能领域\n- 大模型竞争加剧，头部企业持续投入\n- 垂直领域应用加速落地\n- 算力需求持续增长\n\n## 半导体行业\n- 国产替代进程加快\n- 新制程技术突破在即\n- 汽车芯片需求旺盛\n\n## 互联网企业\n- 云计算业务稳定增长\n- 广告收入逐步恢复\n- 新业务探索持续推进',
    status: 'completed',
    tokens: { input: 10, output: 180 },
    createdAt: new Date('2026-03-14T10:31:30'),
  },
];

// Mock Conversation list
export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    agentId: 'agent-1',
    title: '市场趋势分析',
    messages: createMockMessages('conv-1'),
    totalTokens: 325,
    createdAt: new Date('2026-03-14T10:30:00'),
    updatedAt: new Date('2026-03-14T10:31:30'),
  },
  {
    id: 'conv-2',
    agentId: 'agent-2',
    title: 'React 性能优化讨论',
    messages: [
      {
        id: 'conv-2-msg-1',
        conversationId: 'conv-2',
        role: 'user',
        content: '我的 React 应用性能有问题，应该怎么优化？',
        status: 'completed',
        createdAt: new Date('2026-03-14T09:00:00'),
      },
      {
        id: 'conv-2-msg-2',
        conversationId: 'conv-2',
        role: 'assistant',
        content: 'React 性能优化可以从以下几个方面入手：\n\n1. **使用 React.memo** 避免不必要的重渲染\n2. **useMemo 和 useCallback** 缓存计算结果和回调\n3. **虚拟列表** 处理大量数据渲染\n4. **代码分割** 使用 React.lazy 和 Suspense\n5. **状态管理优化** 避免过大的 context\n\n需要我详细解释某个方面吗？',
        status: 'completed',
        tokens: { input: 20, output: 150 },
        createdAt: new Date('2026-03-14T09:00:20'),
      },
    ],
    totalTokens: 170,
    createdAt: new Date('2026-03-14T09:00:00'),
    updatedAt: new Date('2026-03-14T09:00:20'),
  },
  {
    id: 'conv-3',
    agentId: 'agent-3',
    title: '英文邮件翻译',
    messages: [
      {
        id: 'conv-3-msg-1',
        conversationId: 'conv-3',
        role: 'user',
        content: '请翻译：Dear Team, I hope this email finds you well. I wanted to follow up on our discussion from last week.',
        status: 'completed',
        createdAt: new Date('2026-03-13T14:00:00'),
      },
      {
        id: 'conv-3-msg-2',
        conversationId: 'conv-3',
        role: 'assistant',
        content: '翻译如下：\n\n亲爱的团队，\n\n希望这封邮件找到您时一切安好。我想跟进一下我们上周的讨论。',
        status: 'completed',
        tokens: { input: 35, output: 40 },
        createdAt: new Date('2026-03-13T14:00:10'),
      },
    ],
    totalTokens: 75,
    createdAt: new Date('2026-03-13T14:00:00'),
    updatedAt: new Date('2026-03-13T14:00:10'),
  },
  {
    id: 'conv-4',
    agentId: 'agent-1',
    title: 'Python 学习建议',
    messages: [
      {
        id: 'conv-4-msg-1',
        conversationId: 'conv-4',
        role: 'user',
        content: '我想学习 Python，有什么建议吗？',
        status: 'completed',
        createdAt: new Date('2026-03-12T16:00:00'),
      },
      {
        id: 'conv-4-msg-2',
        conversationId: 'conv-4',
        role: 'assistant',
        content: 'Python 学习路线建议：\n\n## 入门阶段\n1. 基础语法：变量、数据类型、控制流\n2. 函数和模块化编程\n3. 面向对象编程基础\n\n## 进阶阶段\n1. 常用标准库：os, json, datetime 等\n2. 第三方库：requests, pandas, numpy\n3. 异步编程：asyncio\n\n## 实践项目\n- 爬虫项目\n- 数据分析项目\n- Web 开发（Flask/Django）',
        status: 'completed',
        tokens: { input: 15, output: 130 },
        createdAt: new Date('2026-03-12T16:00:25'),
      },
    ],
    totalTokens: 145,
    createdAt: new Date('2026-03-12T16:00:00'),
    updatedAt: new Date('2026-03-12T16:00:25'),
  },
];

// 模拟 API 延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Conversation API Mock
export const conversationApi = {
  // 获取所有会话
  async getAll(): Promise<Conversation[]> {
    await delay(300);
    return mockConversations;
  },

  // 获取单个会话
  async getById(id: string): Promise<Conversation | undefined> {
    await delay(200);
    return mockConversations.find((c) => c.id === id);
  },

  // Get conversationMessages
  async getMessages(conversationId: string): Promise<Message[]> {
    await delay(200);
    const conversation = mockConversations.find((c) => c.id === conversationId);
    return conversation?.messages || [];
  },

  // Create conversation
  async create(data: { agentId: string; title?: string }): Promise<Conversation> {
    await delay(500);
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      agentId: data.agentId,
      title: data.title || '新对话',
      messages: [],
      totalTokens: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockConversations.unshift(newConversation);
    return newConversation;
  },

  // Update conversation
  async update(id: string, data: Partial<Conversation>): Promise<Conversation> {
    await delay(300);
    const idx = mockConversations.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Conversation not found');
    Object.assign(mockConversations[idx], data, { updatedAt: new Date() });
    return mockConversations[idx];
  },

  // Delete conversation
  async delete(id: string): Promise<boolean> {
    await delay(300);
    const idx = mockConversations.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    mockConversations.splice(idx, 1);
    return true;
  },

  // Send message
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<{ userMessage: Message; assistantMessage: Message }> {
    await delay(800);

    const conversation = mockConversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const userMessage: Message = {
      id: `${conversationId}-msg-${Date.now()}`,
      conversationId,
      role: 'user',
      content,
      status: 'completed',
      createdAt: new Date(),
    };

    const assistantMessage: Message = {
      id: `${conversationId}-msg-${Date.now() + 1}`,
      conversationId,
      role: 'assistant',
      content: `这是对您问题的回复：${content}\n\n这是一个模拟的 AI 响应，实际应用中会调用真实的 AI API。`,
      status: 'completed',
      tokens: { input: content.length, output: 50 },
      createdAt: new Date(),
    };

    conversation.messages.push(userMessage, assistantMessage);
    conversation.updatedAt = new Date();

    return { userMessage, assistantMessage };
  },
};
