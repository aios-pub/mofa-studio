/**
 * RAG service (CHAT-11): upload documents, retrieve top chunks, and build
 * the grounding context block for chat requests.
 */

import { apiClient } from "../api/apiClient";

export interface RagDoc {
  doc_id: string;
  name: string;
  chunks: number;
  chars: number;
}

export interface RagHit {
  seq: number;
  text: string;
  source: string;
}

export const RAG_SUPPORTED_EXTENSIONS = [
  "pdf", "txt", "md", "csv", "xlsx", "docx",
];

export function ragSupports(filename: string): boolean {
  const parts = filename.split(".");
  if (parts.length < 2) return false;
  const ext = (parts.pop() as string).toLowerCase();
  return RAG_SUPPORTED_EXTENSIONS.includes(ext);
}

class RagService {
  async upload(file: File): Promise<RagDoc> {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<RagDoc>("/api/rag/upload", form, {
      headers: { "Content-Type": undefined },
    });
  }

  async query(docId: string, query: string, topK = 4): Promise<{ hits: RagHit[] }> {
    const data = await apiClient.post<{ hits: RagHit[] }>("/api/rag/query", {
      doc_id: docId,
      query,
      top_k: topK,
    });
    return { hits: data?.hits ?? [] };
  }
}

export const ragService = new RagService();

/**
 * Build the grounding system message from retrieved hits — each cited as
 * 「xx 文档 第n段」(CHAT-11 引用标注).
 */
export function buildRagContext(hits: RagHit[]): string | null {
  if (hits.length === 0) return null;
  const numbered = hits
    .map((hit, index) => `[${index + 1}] （${hit.source}）\n${hit.text}`)
    .join("\n\n");
  return (
    "以下是用户上传文档中检索到的相关段落（引用序号与来源对应）。" +
    "回答时优先依据这些段落，并在句末用 [序号] 标注引用来源：\n\n" +
    numbered
  );
}
