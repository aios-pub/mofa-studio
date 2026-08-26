/**
 * PLAT-07 FTS5 global search (会话/文档): server-side full-text over the
 * conversation and rag_doc collections. CJK is bigram-matched on both the
 * index and the query side, so unsegmented text still hits.
 */

import { apiClient } from "../api/apiClient";

export interface GlobalSearchResult {
  conversations: Array<{
    id: string;
    title?: string;
    [key: string]: unknown;
  }>;
  documents: Array<{
    id: string;
    name?: string;
    [key: string]: unknown;
  }>;
}

export async function globalSearch(query: string, limit = 20): Promise<GlobalSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) return { conversations: [], documents: [] };
  try {
    const data = await apiClient.get<{ data?: GlobalSearchResult }>(
      `/api/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`,
    );
    return {
      conversations: data?.data?.conversations ?? [],
      documents: data?.data?.documents ?? [],
    };
  } catch {
    return { conversations: [], documents: [] };
  }
}
