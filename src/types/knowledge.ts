/**
 * Knowledge base type definitions
 */

/** Vector database type */
export type VectorStoreType =
  | 'chroma'      // Chroma (default recommended)
  | 'pinecone'    // Pinecone
  | 'weaviate'    // Weaviate
  | 'milvus'      // Milvus
  | 'qdrant'      // Qdrant
  | 'pgvector';   // PostgreSQL pgvector

/** Embedding model type */
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

/** Document status */
export type DocumentStatus =
  | 'pending'     // Pending
  | 'processing'  // Processing
  | 'completed'   // Completed
  | 'failed'      // Failed
  | 'deleted';    // Deleted

/** Chunking strategy */
export interface ChunkingStrategy {
  type: 'fixed_size' | 'semantic' | 'recursive' | 'custom';
  chunkSize: number;           // Chunk size（characters）
  chunkOverlap: number;        // Overlap size
  separator?: string;          // Separator
  customRules?: string;        // Custom rules（JSON）
}

/** Retrieval configuration */
export interface RetrievalConfig {
  topK: number;                // Number of results to return
  scoreThreshold: number;      // Similarity threshold (0-1)
  rerankingEnabled: boolean;   // Whether to enable reranking
  rerankingModel?: string;     // Reranking model
  hybridSearchEnabled: boolean; // Whether to enable hybrid search
  keywordWeight?: number;      // Keyword weight (0-1)
}

/** Embedding model configuration */
export interface EmbeddingModelConfig {
  type: EmbeddingModelType;
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  dimensions?: number;
  batchSize?: number;
}

/** Vector database configuration */
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

/** Knowledge base configuration */
export interface KnowledgeBaseConfig {
  embeddingModel: EmbeddingModelConfig;
  vectorStore: VectorStoreConfig;
  chunkingStrategy: ChunkingStrategy;
  retrievalConfig: RetrievalConfig;
}

/** Knowledge base */
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

/** Knowledge base statistics */
export interface KnowledgeBaseStats {
  documentCount: number;       // Document count
  chunkCount: number;          // Chunk count
  totalSize: number;           // total size in bytes
  vectorCount: number;         // Vector count
  lastIndexedAt?: Date;        // Last indexed at
}

/** Document metadata */
export interface DocumentMetadata {
  source: string;              // Source
  author?: string;             // Author
  title?: string;              // Title
  created?: Date;              // Created time
  modified?: Date;             // Modified time
  custom?: Record<string, unknown>; // Custom fields
}

/** Document */
export interface Document {
  id: string;
  knowledgeBaseId: string;
  name: string;
  type: 'pdf' | 'txt' | 'md' | 'html' | 'docx' | 'json' | 'csv' | 'url';
  status: DocumentStatus;
  size: number;                // file size in bytes
  content?: string;            // Document content（Optional）
  metadata: DocumentMetadata;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  errorMessage?: string;
}

/** Document chunk */
export interface Chunk {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  content: string;
  position: number;            // Position in document
  tokens: number;              // Token count
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/** Search request */
export interface SearchRequest {
  knowledgeBaseId: string;
  query: string;
  topK?: number;
  scoreThreshold?: number;
  filter?: Record<string, unknown>;
  includeContent?: boolean;
  includeMetadata?: boolean;
}

/** Search result item */
export interface SearchResultItem {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  score: number;               // Similarity score (0-1)
  metadata?: DocumentMetadata;
  chunk?: Chunk;
}

/** Search response */
export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  total: number;
  took: number;                // Search duration（milliseconds）
  knowledgeBaseId: string;
}

/** Agent knowledge base association */
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

/** Vector database configuration info */
export interface VectorStoreTypeInfo {
  type: VectorStoreType;
  name: string;
  description: string;
  icon: string;
  features: string[];
  recommended?: boolean;
}

/** Embedding model configuration info */
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
