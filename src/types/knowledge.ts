/**
 * Knowledge 知识库类型定义
 */

/** 向量数据库类型 */
export type VectorStoreType =
  | 'chroma'      // Chroma (默认推荐)
  | 'pinecone'    // Pinecone
  | 'weaviate'    // Weaviate
  | 'milvus'      // Milvus
  | 'qdrant'      // Qdrant
  | 'pgvector';   // PostgreSQL pgvector

/** 嵌入模型类型 */
export type EmbeddingModelType =
  | 'openai_text_embedding_ada_002'
  | 'openai_text_embedding_3_small'
  | 'openai_text_embedding_3_large'
  | 'cohere_embed_english_v3'
  | 'cohere_embed_multilingual_v3'
  | 'anthropic_voyage_2'
  | 'azure_openai_text_embedding_ada_002'
  | 'huggingface_sentence_transformers'
  | 'custom';

/** 文档状态 */
export type DocumentStatus =
  | 'pending'     // 待处理
  | 'processing'  // 处理中
  | 'completed'   // 已完成
  | 'failed'      // 失败
  | 'deleted';    // 已删除

/** 分片策略 */
export interface ChunkingStrategy {
  type: 'fixed_size' | 'semantic' | 'recursive' | 'custom';
  chunkSize: number;           // 分片大小（字符数）
  chunkOverlap: number;        // 重叠大小
  separator?: string;          // 分隔符
  customRules?: string;        // 自定义规则（JSON）
}

/** 检索配置 */
export interface RetrievalConfig {
  topK: number;                // 返回结果数量
  scoreThreshold: number;      // 相似度阈值 (0-1)
  rerankingEnabled: boolean;   // 是否启用重排序
  rerankingModel?: string;     // 重排序模型
  hybridSearchEnabled: boolean; // 是否启用混合搜索
  keywordWeight?: number;      // 关键词权重 (0-1)
}

/** 嵌入模型配置 */
export interface EmbeddingModelConfig {
  type: EmbeddingModelType;
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  dimensions?: number;
  batchSize?: number;
}

/** 向量数据库配置 */
export interface VectorStoreConfig {
  type: VectorStoreType;
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  collection?: string;
  apiKey?: string;
  environment?: string;
  indexName?: string;
  namespace?: string;
}

/** 知识库配置 */
export interface KnowledgeBaseConfig {
  embeddingModel: EmbeddingModelConfig;
  vectorStore: VectorStoreConfig;
  chunkingStrategy: ChunkingStrategy;
  retrievalConfig: RetrievalConfig;
}

/** 知识库 */
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  config: KnowledgeBaseConfig;
  stats: KnowledgeBaseStats;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/** 知识库统计信息 */
export interface KnowledgeBaseStats {
  documentCount: number;       // 文档数量
  chunkCount: number;          // 分片数量
  totalSize: number;           // 总大小（字节）
  vectorCount: number;         // 向量数量
  lastIndexedAt?: Date;        // 最后索引时间
}

/** 文档元数据 */
export interface DocumentMetadata {
  source: string;              // 来源
  author?: string;             // 作者
  title?: string;              // 标题
  created?: Date;              // 创建时间
  modified?: Date;             // 修改时间
  custom?: Record<string, unknown>; // 自定义字段
}

/** 文档 */
export interface Document {
  id: string;
  knowledgeBaseId: string;
  name: string;
  type: 'pdf' | 'txt' | 'md' | 'html' | 'docx' | 'json' | 'csv' | 'url';
  status: DocumentStatus;
  size: number;                // 文件大小（字节）
  content?: string;            // 文档内容（可选）
  metadata: DocumentMetadata;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  errorMessage?: string;
}

/** 文档分片 */
export interface Chunk {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  content: string;
  position: number;            // 在文档中的位置
  tokens: number;              // Token 数量
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/** 搜索请求 */
export interface SearchRequest {
  knowledgeBaseId: string;
  query: string;
  topK?: number;
  scoreThreshold?: number;
  filter?: Record<string, unknown>;
  includeContent?: boolean;
  includeMetadata?: boolean;
}

/** 搜索结果项 */
export interface SearchResultItem {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  score: number;               // 相似度分数 (0-1)
  metadata?: DocumentMetadata;
  chunk?: Chunk;
}

/** 搜索响应 */
export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  took: number;                // 搜索耗时（毫秒）
  knowledgeBaseId: string;
}

/** Agent 与知识库的关联 */
export interface AgentKnowledgeBase {
  id: string;
  agentId: string;
  knowledgeBaseId: string;
  enabled: boolean;
  priority: number;
  retrievalConfig?: Partial<RetrievalConfig>;
  createdAt: Date;
  updatedAt: Date;
}

/** 向量数据库配置信息 */
export interface VectorStoreTypeInfo {
  type: VectorStoreType;
  name: string;
  description: string;
  icon: string;
  features: string[];
  recommended?: boolean;
}

/** 嵌入模型配置信息 */
export interface EmbeddingModelTypeInfo {
  type: EmbeddingModelType;
  name: string;
  description: string;
  dimensions: number;
  maxTokens: number;
  pricing?: {
    per1kTokens: number;
    currency: string;
  };
}
