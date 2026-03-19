/**
 * Knowledge 真实 API
 * 后端端点: /api/knowledge/...
 */

import { createActionApi } from "./base";
import { apiClient } from "../api/apiClient";

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  enabled?: boolean;
  createdAt: string;
}

interface Document {
  id: string;
  knowledgeBaseId: string;
  name: string;
  type: string;
  size: number;
  status: string;
}

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

const baseApi = createActionApi<KnowledgeBase>("/api/knowledge", "list");

const knowledgeRealApi = {
  ...baseApi,

  // 别名方法
  getAllKnowledgeBases: (): Promise<KnowledgeBase[]> =>
    apiClient.get<KnowledgeBase[]>("/api/knowledge/list"),

  getKnowledgeBase: (id: string): Promise<KnowledgeBase> =>
    apiClient.get<KnowledgeBase>(`/api/knowledge/${id}`),

  createKnowledgeBase: (data: Partial<KnowledgeBase>): Promise<KnowledgeBase> =>
    apiClient.post<KnowledgeBase>("/api/knowledge/create", data),

  updateKnowledgeBase: (id: string, data: Partial<KnowledgeBase>): Promise<KnowledgeBase> =>
    apiClient.post<KnowledgeBase>("/api/knowledge/update", { id, ...data }),

  deleteKnowledgeBase: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/knowledge/delete/${id}`);
    return true;
  },

  getEnabled: (): Promise<KnowledgeBase[]> =>
    apiClient.get<KnowledgeBase[]>("/api/knowledge/enabled"),

  // 搜索
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

  // Documents
  getDocuments: (kbId?: string): Promise<Document[]> =>
    kbId
      ? apiClient.get<Document[]>(`/api/knowledge/documents?kb_id=${kbId}`)
      : apiClient.get<Document[]>("/api/knowledge/documents"),

  getDocumentsByStatus: (status: string): Promise<Document[]> =>
    apiClient.get<Document[]>(`/api/knowledge/documents/by-status?status=${status}`),

  getDocument: (id: string): Promise<Document> =>
    apiClient.get<Document>(`/api/knowledge/document/${id}`),

  createDocument: (data: Partial<Document>): Promise<Document> =>
    apiClient.post<Document>("/api/knowledge/document/create", data),

  updateDocument: (id: string, data: Partial<Document>): Promise<Document> =>
    apiClient.post<Document>("/api/knowledge/document/update", { id, ...data }),

  deleteDocument: async (id: string): Promise<boolean> => {
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
