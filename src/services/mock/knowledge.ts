/**
 * Knowledge base mock data
 */

import type {
  KnowledgeBase,
  Document,
  Chunk,
  SearchRequest,
  SearchResponse,
  SearchResultItem,
  AgentKnowledgeBase,
  VectorStoreType,
  EmbeddingModelType,
  VectorStoreTypeInfo,
  EmbeddingModelTypeInfo,
  KnowledgeBaseStats,
} from '../../types/knowledge';

// Vector database configuration info
export const vectorStoreTypeConfig: Record<VectorStoreType, VectorStoreTypeInfo> = {
  chroma: {
    type: 'chroma',
    name: 'Chroma',
    description: '开源向量数据库，适合本地部署和小规模应用',
    icon: '🎯',
    features: ['本地部署', '开源免费', '易于使用'],
    recommended: true,
  },
  pinecone: {
    type: 'pinecone',
    name: 'Pinecone',
    description: '全托管向量数据库，适合生产环境',
    icon: '🌲',
    features: ['全托管', '高性能', '自动扩缩容'],
  },
  weaviate: {
    type: 'weaviate',
    name: 'Weaviate',
    description: '企业级向量搜索引擎，支持 GraphQL',
    icon: '🔍',
    features: ['GraphQL', '语义搜索', '模块化'],
  },
  milvus: {
    type: 'milvus',
    name: 'Milvus',
    description: '高性能分布式向量数据库',
    icon: '🚀',
    features: ['分布式', '高性能', '大规模'],
  },
  qdrant: {
    type: 'qdrant',
    name: 'Qdrant',
    description: '高效向量相似度搜索引擎',
    icon: '⚡',
    features: ['Rust 实现', '高效过滤', '实时更新'],
  },
  pgvector: {
    type: 'pgvector',
    name: 'pgvector',
    description: 'PostgreSQL 向量扩展',
    icon: '🐘',
    features: ['PostgreSQL 扩展', 'ACID 支持', '成熟稳定'],
  },
};

// Embedding model configuration info
export const embeddingModelTypeConfig: Record<EmbeddingModelType, EmbeddingModelTypeInfo> = {
  openai_text_embedding_ada_002: {
    type: 'openai_text_embedding_ada_002',
    name: 'OpenAI text-embedding-ada-002',
    description: 'OpenAI 第二代嵌入模型',
    dimensions: 1536,
    maxTokens: 8191,
    pricing: { per1kTokens: 0.0001, currency: 'USD' },
  },
  openai_text_embedding_3_small: {
    type: 'openai_text_embedding_3_small',
    name: 'OpenAI text-embedding-3-small',
    description: 'OpenAI 第三代小型嵌入模型，性价比高',
    dimensions: 1536,
    maxTokens: 8191,
    pricing: { per1kTokens: 0.00002, currency: 'USD' },
  },
  openai_text_embedding_3_large: {
    type: 'openai_text_embedding_3_large',
    name: 'OpenAI text-embedding-3-large',
    description: 'OpenAI 第三代大型嵌入模型，效果最佳',
    dimensions: 3072,
    maxTokens: 8191,
    pricing: { per1kTokens: 0.00013, currency: 'USD' },
  },
  cohere_embed_english_v3: {
    type: 'cohere_embed_english_v3',
    name: 'Cohere embed-english-v3.0',
    description: 'Cohere 英文嵌入模型',
    dimensions: 1024,
    maxTokens: 512,
    pricing: { per1kTokens: 0.0001, currency: 'USD' },
  },
  cohere_embed_multilingual_v3: {
    type: 'cohere_embed_multilingual_v3',
    name: 'Cohere embed-multilingual-v3.0',
    description: 'Cohere 多语言嵌入模型',
    dimensions: 1024,
    maxTokens: 512,
    pricing: { per1kTokens: 0.0001, currency: 'USD' },
  },
  anthropic_voyage_2: {
    type: 'anthropic_voyage_2',
    name: 'Voyage AI voyage-2',
    description: 'Voyage AI 高质量嵌入模型',
    dimensions: 1024,
    maxTokens: 4000,
    pricing: { per1kTokens: 0.00012, currency: 'USD' },
  },
  azure_openai_text_embedding_ada_002: {
    type: 'azure_openai_text_embedding_ada_002',
    name: 'Azure OpenAI text-embedding-ada-002',
    description: 'Azure OpenAI 嵌入模型',
    dimensions: 1536,
    maxTokens: 8191,
    pricing: { per1kTokens: 0.0001, currency: 'USD' },
  },
  huggingface_sentence_transformers: {
    type: 'huggingface_sentence_transformers',
    name: 'HuggingFace Sentence Transformers',
    description: '开源嵌入模型，支持本地部署',
    dimensions: 768,
    maxTokens: 512,
  },
  custom: {
    type: 'custom',
    name: '自定义嵌入模型',
    description: '自定义嵌入模型端点',
    dimensions: 1536,
    maxTokens: 8191,
  },
};

// Mock knowledge base data
export const mockKnowledgeBases: KnowledgeBase[] = [
  {
    id: 'kb-1',
    name: '产品文档知识库',
    description: '公司产品相关的技术文档和用户手册',
    config: {
      embeddingModel: {
        type: 'openai_text_embedding_3_small',
        dimensions: 1536,
      },
      vectorStore: {
        type: 'chroma',
        collection: 'product_docs',
      },
      chunkingStrategy: {
        type: 'semantic',
        chunkSize: 500,
        chunkOverlap: 50,
      },
      retrievalConfig: {
        topK: 5,
        scoreThreshold: 0.7,
        rerankingEnabled: false,
        hybridSearchEnabled: true,
        keywordWeight: 0.3,
      },
    },
    stats: {
      documentCount: 156,
      chunkCount: 4820,
      totalSize: 52428800,
      vectorCount: 4820,
      lastIndexedAt: new Date('2026-03-14T10:00:00'),
    },
    enabled: true,
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-03-14'),
  },
  {
    id: 'kb-2',
    name: '客服FAQ知识库',
    description: '客服常见问题解答知识库',
    config: {
      embeddingModel: {
        type: 'openai_text_embedding_3_small',
        dimensions: 1536,
      },
      vectorStore: {
        type: 'chroma',
        collection: 'faq_kb',
      },
      chunkingStrategy: {
        type: 'fixed_size',
        chunkSize: 300,
        chunkOverlap: 30,
      },
      retrievalConfig: {
        topK: 3,
        scoreThreshold: 0.75,
        rerankingEnabled: false,
        hybridSearchEnabled: false,
      },
    },
    stats: {
      documentCount: 89,
      chunkCount: 1250,
      totalSize: 2097152,
      vectorCount: 1250,
      lastIndexedAt: new Date('2026-03-13T16:30:00'),
    },
    enabled: true,
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-03-13'),
  },
  {
    id: 'kb-3',
    name: '技术规范知识库',
    description: '技术规范和标准文档',
    config: {
      embeddingModel: {
        type: 'openai_text_embedding_3_large',
        dimensions: 3072,
      },
      vectorStore: {
        type: 'pinecone',
        indexName: 'tech-specs',
        environment: 'production',
      },
      chunkingStrategy: {
        type: 'recursive',
        chunkSize: 1000,
        chunkOverlap: 100,
      },
      retrievalConfig: {
        topK: 10,
        scoreThreshold: 0.65,
        rerankingEnabled: true,
        rerankingModel: 'cohere-rerank-english',
        hybridSearchEnabled: true,
        keywordWeight: 0.2,
      },
    },
    stats: {
      documentCount: 45,
      chunkCount: 2100,
      totalSize: 15728640,
      vectorCount: 2100,
      lastIndexedAt: new Date('2026-03-14T08:00:00'),
    },
    enabled: true,
    createdAt: new Date('2026-02-15'),
    updatedAt: new Date('2026-03-14'),
  },
  {
    id: 'kb-4',
    name: '政策法规知识库',
    description: '相关政策法规文档',
    config: {
      embeddingModel: {
        type: 'cohere_embed_multilingual_v3',
        dimensions: 1024,
      },
      vectorStore: {
        type: 'weaviate',
        collection: 'policies',
      },
      chunkingStrategy: {
        type: 'semantic',
        chunkSize: 800,
        chunkOverlap: 80,
      },
      retrievalConfig: {
        topK: 5,
        scoreThreshold: 0.7,
        rerankingEnabled: false,
        hybridSearchEnabled: true,
      },
    },
    stats: {
      documentCount: 23,
      chunkCount: 890,
      totalSize: 5242880,
      vectorCount: 890,
      lastIndexedAt: new Date('2026-03-12T14:00:00'),
    },
    enabled: false,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-12'),
  },
];

// Mock documentation data
export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    knowledgeBaseId: 'kb-1',
    name: '产品使用手册 v2.0.pdf',
    type: 'pdf',
    status: 'completed',
    size: 2048576,
    metadata: {
      source: 'upload',
      author: '产品团队',
      title: '产品使用手册',
      modified: new Date('2026-03-10'),
    },
    chunkCount: 156,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-03-10'),
    processedAt: new Date('2026-03-10T10:30:00'),
  },
  {
    id: 'doc-2',
    knowledgeBaseId: 'kb-1',
    name: 'API 接口文档.md',
    type: 'md',
    status: 'completed',
    size: 102400,
    metadata: {
      source: 'upload',
      author: '开发团队',
      title: 'API 接口文档',
    },
    chunkCount: 45,
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-03-12'),
    processedAt: new Date('2026-03-12T09:00:00'),
  },
  {
    id: 'doc-3',
    knowledgeBaseId: 'kb-1',
    name: '快速入门指南.pdf',
    type: 'pdf',
    status: 'processing',
    size: 512000,
    metadata: {
      source: 'upload',
      title: '快速入门指南',
    },
    chunkCount: 0,
    createdAt: new Date('2026-03-14'),
    updatedAt: new Date('2026-03-14'),
  },
  {
    id: 'doc-4',
    knowledgeBaseId: 'kb-2',
    name: 'FAQ-常见问题.json',
    type: 'json',
    status: 'completed',
    size: 20480,
    metadata: {
      source: 'upload',
      author: '客服团队',
    },
    chunkCount: 89,
    createdAt: new Date('2026-02-05'),
    updatedAt: new Date('2026-03-13'),
    processedAt: new Date('2026-03-13T16:30:00'),
  },
  {
    id: 'doc-5',
    knowledgeBaseId: 'kb-1',
    name: '错误代码参考.txt',
    type: 'txt',
    status: 'failed',
    size: 8192,
    metadata: {
      source: 'upload',
    },
    chunkCount: 0,
    createdAt: new Date('2026-03-14'),
    updatedAt: new Date('2026-03-14'),
    errorMessage: '文件编码格式不支持',
  },
];

// Mock chunk data
export const mockChunks: Chunk[] = [
  {
    id: 'chunk-1',
    documentId: 'doc-1',
    knowledgeBaseId: 'kb-1',
    content: '欢迎使用我们的产品。本手册将帮助您快速了解产品的各项功能和操作方法。首先，让我们从基础配置开始...',
    position: 1,
    tokens: 45,
    createdAt: new Date('2026-03-10T10:30:00'),
  },
  {
    id: 'chunk-2',
    documentId: 'doc-1',
    knowledgeBaseId: 'kb-1',
    content: '系统设置页面允许您配置全局参数，包括语言选择、时区设置、通知偏好等。点击右上角的设置图标即可进入...',
    position: 2,
    tokens: 52,
    createdAt: new Date('2026-03-10T10:30:00'),
  },
];

// Mock agent-knowledge base association
export const mockAgentKnowledgeBases: AgentKnowledgeBase[] = [
  {
    id: 'akb-1',
    agentId: 'agent-1',
    knowledgeBaseId: 'kb-1',
    enabled: true,
    priority: 10,
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-03-10'),
  },
  {
    id: 'akb-2',
    agentId: 'agent-1',
    knowledgeBaseId: 'kb-2',
    enabled: true,
    priority: 5,
    createdAt: new Date('2026-02-10'),
    updatedAt: new Date('2026-03-10'),
  },
  {
    id: 'akb-3',
    agentId: 'agent-3',
    knowledgeBaseId: 'kb-1',
    enabled: true,
    priority: 10,
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-03-12'),
  },
];

// Mock API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Knowledge API Mock
export const knowledgeApi = {
  // Get all knowledge bases
  async getAllKnowledgeBases(): Promise<KnowledgeBase[]> {
    await delay(300);
    return mockKnowledgeBases;
  },

  // Get a single knowledge base
  async getKnowledgeBaseById(id: string): Promise<KnowledgeBase | undefined> {
    await delay(200);
    return mockKnowledgeBases.find((kb) => kb.id === id);
  },

  // Create knowledge base
  async createKnowledgeBase(data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    await delay(500);
    const newKB: KnowledgeBase = {
      id: `kb-${Date.now()}`,
      name: data.name || '新知识库',
      description: data.description || '',
      config: data.config || {
        embeddingModel: { type: 'openai_text_embedding_3_small', dimensions: 1536 },
        vectorStore: { type: 'chroma', collection: `collection_${Date.now()}` },
        chunkingStrategy: { type: 'semantic', chunkSize: 500, chunkOverlap: 50 },
        retrievalConfig: { topK: 5, scoreThreshold: 0.7, rerankingEnabled: false, hybridSearchEnabled: false },
      },
      stats: {
        documentCount: 0,
        chunkCount: 0,
        totalSize: 0,
        vectorCount: 0,
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockKnowledgeBases.push(newKB);
    return newKB;
  },

  // Update knowledge base
  async updateKnowledgeBase(id: string, data: Partial<KnowledgeBase>): Promise<KnowledgeBase | undefined> {
    await delay(300);
    const index = mockKnowledgeBases.findIndex((kb) => kb.id === id);
    if (index === -1) return undefined;
    mockKnowledgeBases[index] = { ...mockKnowledgeBases[index], ...data, updatedAt: new Date() };
    return mockKnowledgeBases[index];
  },

  // Delete knowledge base
  async deleteKnowledgeBase(id: string): Promise<boolean> {
    await delay(300);
    const index = mockKnowledgeBases.findIndex((kb) => kb.id === id);
    if (index === -1) return false;
    mockKnowledgeBases.splice(index, 1);
    // Delete related documentation
    const docIndices = mockDocuments.map((d, i) => (d.knowledgeBaseId === id ? i : -1)).filter((i) => i !== -1).reverse();
    docIndices.forEach((i) => mockDocuments.splice(i, 1));
    return true;
  },

  // Get knowledge base documentation
  async getDocuments(knowledgeBaseId: string): Promise<Document[]> {
    await delay(200);
    return mockDocuments.filter((d) => d.knowledgeBaseId === knowledgeBaseId);
  },

  // Upload documentation
  async uploadDocument(knowledgeBaseId: string, file: { name: string; type: Document['type']; size: number }): Promise<Document> {
    await delay(500);
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      knowledgeBaseId,
      name: file.name,
      type: file.type,
      status: 'pending',
      size: file.size,
      metadata: { source: 'upload' },
      chunkCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDocuments.push(newDoc);

    // Simulated processing
    setTimeout(() => {
      const doc = mockDocuments.find((d) => d.id === newDoc.id);
      if (doc) {
        doc.status = 'processing';
        setTimeout(() => {
          doc.status = 'completed';
          doc.chunkCount = Math.floor(file.size / 500);
          doc.processedAt = new Date();
        }, 2000);
      }
    }, 500);

    return newDoc;
  },

  // Delete documentation
  async deleteDocument(documentId: string): Promise<boolean> {
    await delay(300);
    const index = mockDocuments.findIndex((d) => d.id === documentId);
    if (index === -1) return false;
    mockDocuments.splice(index, 1);
    return true;
  },

  // Search
  async search(request: SearchRequest): Promise<SearchResponse> {
    await delay(300 + Math.random() * 200);
    const startTime = Date.now();

    // Simulated search results
    const results: SearchResultItem[] = [
      {
        id: 'result-1',
        documentId: 'doc-1',
        documentName: '产品使用手册 v2.0.pdf',
        content: '欢迎使用我们的产品。本手册将帮助您快速了解产品的各项功能和操作方法...',
        score: 0.92,
        metadata: { source: 'upload', author: '产品团队' },
      },
      {
        id: 'result-2',
        documentId: 'doc-2',
        documentName: 'API 接口文档.md',
        content: '系统设置页面允许您配置全局参数，包括语言选择、时区设置...',
        score: 0.85,
        metadata: { source: 'upload', author: '开发团队' },
      },
      {
        id: 'result-3',
        documentId: 'doc-4',
        documentName: 'FAQ-常见问题.json',
        content: '如何重置密码？请访问设置页面，点击"安全设置"，然后选择"修改密码"...',
        score: 0.78,
        metadata: { source: 'upload', author: '客服团队' },
      },
    ];

    return {
      query: request.query,
      results: results.slice(0, request.topK || 5),
      total: results.length,
      took: Date.now() - startTime,
      knowledgeBaseId: request.knowledgeBaseId,
    };
  },

  // Similarity search
  async searchSimilar(_chunkId: string, topK: number = 5): Promise<SearchResultItem[]> {
    await delay(200);
    // Return similar chunks (simulated)
    return [
      {
        id: 'similar-1',
        documentId: 'doc-1',
        documentName: '产品使用手册 v2.0.pdf',
        content: '相似内容示例 1...',
        score: 0.88,
      },
      {
        id: 'similar-2',
        documentId: 'doc-1',
        documentName: '产品使用手册 v2.0.pdf',
        content: '相似内容示例 2...',
        score: 0.82,
      },
    ].slice(0, topK);
  },

  // Get knowledge base statistics
  async getStats(knowledgeBaseId: string): Promise<KnowledgeBaseStats> {
    await delay(100);
    const kb = mockKnowledgeBases.find((k) => k.id === knowledgeBaseId);
    return kb?.stats || {
      documentCount: 0,
      chunkCount: 0,
      totalSize: 0,
      vectorCount: 0,
    };
  },

  // Agent knowledge base association
  async getAgentKnowledgeBases(agentId: string): Promise<AgentKnowledgeBase[]> {
    await delay(200);
    return mockAgentKnowledgeBases.filter((akb) => akb.agentId === agentId);
  },

  async addAgentKnowledgeBase(data: { agentId: string; knowledgeBaseId: string; priority?: number }): Promise<AgentKnowledgeBase> {
    await delay(300);
    const newAkb: AgentKnowledgeBase = {
      id: `akb-${Date.now()}`,
      agentId: data.agentId,
      knowledgeBaseId: data.knowledgeBaseId,
      enabled: true,
      priority: data.priority || 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockAgentKnowledgeBases.push(newAkb);
    return newAkb;
  },

  async removeAgentKnowledgeBase(agentId: string, knowledgeBaseId: string): Promise<boolean> {
    await delay(300);
    const index = mockAgentKnowledgeBases.findIndex(
      (akb) => akb.agentId === agentId && akb.knowledgeBaseId === knowledgeBaseId
    );
    if (index === -1) return false;
    mockAgentKnowledgeBases.splice(index, 1);
    return true;
  },

  // Get vector store type configuration
  getVectorStoreTypeConfig(type: VectorStoreType) {
    return vectorStoreTypeConfig[type];
  },

  // Get all vector store types
  getAllVectorStoreTypes() {
    return Object.entries(vectorStoreTypeConfig).map(([key, config]) => ({
      ...config,
      type: key as VectorStoreType,
    }));
  },

  // Get embedding model type configuration
  getEmbeddingModelTypeConfig(type: EmbeddingModelType) {
    return embeddingModelTypeConfig[type];
  },

  // Get all embedding model types
  getAllEmbeddingModelTypes() {
    return Object.entries(embeddingModelTypeConfig).map(([key, config]) => ({
      ...config,
      type: key as EmbeddingModelType,
    }));
  },
};
