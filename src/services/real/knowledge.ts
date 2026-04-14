/**
 * Knowledge 真实 API
 * 后端端点: /api/knowledge/...
 *
 * 后端字段映射 (snake_case → camelCase):
 *   knowledge_base_id → knowledgeBaseId
 *   doc_type          → type
 *   chunk_count       → chunkCount
 *   error_message     → errorMessage
 *   processed_at      → processedAt
 *   create_time       → createdAt
 *   update_time       → updatedAt
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";
import type {
  KnowledgeBase,
  KnowledgeBaseConfig,
  Document,
} from "@/types/knowledge";

// ==================== 后端原始类型 ====================

interface BackendKnowledgeBase {
  id: string;
  name: string;
  description?: string;
  config?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  enabled: boolean;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

interface BackendDocument {
  id: string;
  knowledge_base_id: string;
  name: string;
  doc_type: string;
  status: string;
  size: number;
  metadata?: Record<string, unknown>;
  chunk_count?: number;
  error_message?: string;
  processed_at?: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

// ==================== 默认值 ====================

const DEFAULT_CONFIG: KnowledgeBaseConfig = {
  embeddingModel: { type: 'openai_text_embedding_ada_002' },
  vectorStore: { type: 'chroma' },
  chunkingStrategy: { type: 'fixed_size', chunkSize: 512, chunkOverlap: 50 },
  retrievalConfig: { topK: 5, scoreThreshold: 0.7, rerankingEnabled: false, hybridSearchEnabled: false },
};

// ==================== 字段映射 ====================

function mapKnowledgeBase(raw: BackendKnowledgeBase): KnowledgeBase {
  const rawStats = raw.stats ?? {};
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    enabled: raw.enabled,
    stats: {
      documentCount: (rawStats.document_count ?? rawStats.documentCount) as number || 0,
      chunkCount: (rawStats.chunk_count ?? rawStats.chunkCount) as number || 0,
      totalSize: (rawStats.total_size ?? rawStats.totalSize) as number || 0,
      vectorCount: (rawStats.vector_count ?? rawStats.vectorCount) as number || 0,
      lastIndexedAt: parseDate((rawStats.last_indexed_at ?? rawStats.lastIndexedAt) as string),
    },
    config: raw.config
      ? (raw.config as unknown as KnowledgeBaseConfig)
      : { ...DEFAULT_CONFIG },
    createdAt: parseDate(raw.create_time) ?? new Date(),
    updatedAt: parseDate(raw.update_time) ?? new Date(),
  };
}

function mapDocument(raw: BackendDocument): Document {
  return {
    id: raw.id,
    knowledgeBaseId: raw.knowledge_base_id,
    name: raw.name,
    type: raw.doc_type as Document['type'],
    status: raw.status as Document['status'],
    size: raw.size,
    metadata: {
      source: (raw.metadata as Record<string, unknown>)?.source as string || '',
    },
    chunkCount: raw.chunk_count ?? 0,
    errorMessage: raw.error_message,
    processedAt: parseDate(raw.processed_at),
    createdAt: parseDate(raw.create_time) ?? new Date(),
    updatedAt: parseDate(raw.update_time) ?? new Date(),
  };
}

function mapKnowledgeBaseToBackend(data: Partial<KnowledgeBase>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.description !== undefined) result.description = data.description;
  if (data.enabled !== undefined) result.enabled = data.enabled;
  return result;
}

function mapDocumentToBackend(data: Partial<Document>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.type !== undefined) result.doc_type = data.type;
  if (data.knowledgeBaseId !== undefined) result.knowledge_base_id = data.knowledgeBaseId;
  return result;
}

// ==================== API 方法 ====================

interface SearchResponse {
  results: Array<{
    documentId: string;
    documentName: string;
    content: string;
    score: number;
    highlights?: string[];
  }>;
  total: number;
  page: number;
  pageSize: number;
}

const knowledgeRealApi = {
  /** 获取所有知识库 */
  async getAll(): Promise<KnowledgeBase[]> {
    const data = await apiClient.get<BackendKnowledgeBase[]>("/api/knowledge/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapKnowledgeBase);
  },

  getAllKnowledgeBases: (): Promise<KnowledgeBase[]> => knowledgeRealApi.getAll(),

  async getById(id: string): Promise<KnowledgeBase> {
    const raw = await apiClient.get<BackendKnowledgeBase>(`/api/knowledge/${id}`);
    return mapKnowledgeBase(raw);
  },

  getKnowledgeBase: (id: string): Promise<KnowledgeBase> => knowledgeRealApi.getById(id),

  async create(data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    const body = mapKnowledgeBaseToBackend(data);
    const raw = await apiClient.post<BackendKnowledgeBase>("/api/knowledge/create", body);
    return mapKnowledgeBase(raw);
  },

  createKnowledgeBase: (data: Partial<KnowledgeBase>): Promise<KnowledgeBase> => knowledgeRealApi.create(data),

  async update(id: string, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> {
    const existing = await knowledgeRealApi.getById(id);
    const merged = { ...existing, ...data };
    const body = { id, ...mapKnowledgeBaseToBackend(merged) };
    const raw = await apiClient.post<BackendKnowledgeBase>("/api/knowledge/update", body);
    return mapKnowledgeBase(raw);
  },

  updateKnowledgeBase: (id: string, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> => knowledgeRealApi.update(id, data),

  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/knowledge/delete/${id}`);
    return true;
  },

  deleteKnowledgeBase: (id: string): Promise<boolean> => knowledgeRealApi.delete(id),

  async getEnabled(): Promise<KnowledgeBase[]> {
    const data = await apiClient.get<BackendKnowledgeBase[]>("/api/knowledge/enabled");
    if (!Array.isArray(data)) return [];
    return data.map(mapKnowledgeBase);
  },

  search: (query: string, options?: { knowledgeBaseIds?: string[]; limit?: number }): Promise<SearchResponse> => {
    const params: Record<string, string | number> = { query };
    if (options?.knowledgeBaseIds?.length) {
      params.kb_ids = options.knowledgeBaseIds.join(',');
    }
    if (options?.limit) {
      params.limit = options.limit;
    }
    return apiClient.get<SearchResponse>("/api/knowledge/search", { params });
  },

  // ==================== 文档管理 ====================

  async getDocuments(kbId?: string): Promise<Document[]> {
    const url = kbId
      ? `/api/knowledge/documents?kb_id=${kbId}`
      : "/api/knowledge/documents";
    const data = await apiClient.get<BackendDocument[]>(url);
    if (!Array.isArray(data)) return [];
    return data.map(mapDocument);
  },

  async getDocumentsByStatus(status: string): Promise<Document[]> {
    const data = await apiClient.get<BackendDocument[]>(`/api/knowledge/documents/by-status?status=${status}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapDocument);
  },

  async getDocument(id: string): Promise<Document> {
    const raw = await apiClient.get<BackendDocument>(`/api/knowledge/document/${id}`);
    return mapDocument(raw);
  },

  async createDocument(data: Partial<Document>): Promise<Document> {
    const body = mapDocumentToBackend(data);
    const raw = await apiClient.post<BackendDocument>("/api/knowledge/document/create", body);
    return mapDocument(raw);
  },

  async updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    const body = { id, ...mapDocumentToBackend(data) };
    const raw = await apiClient.post<BackendDocument>("/api/knowledge/document/update", body);
    return mapDocument(raw);
  },

  async deleteDocument(id: string): Promise<boolean> {
    await apiClient.delete(`/api/knowledge/document/delete/${id}`);
    return true;
  },

  uploadDocument: (kbId: string, file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kb_id", kbId);
    return apiClient.upload<Document>("/api/files", formData);
  },
};

export { knowledgeRealApi };
