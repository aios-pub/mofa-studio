/**
 * Tests for the RAG service (CHAT-11): upload/query mapping, format
 * whitelist, and the grounding-context builder.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { RagHit } from "./rag";
import { buildRagContext, ragService, ragSupports } from "./rag";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const mockedPost = vi.mocked(apiClient.post);

beforeEach(() => {
  mockedPost.mockReset();
});

describe("ragSupports (白名单 v1)", () => {
  it("accepts the PRD whitelist and rejects others", () => {
    for (const name of ["a.pdf", "b.docx", "c.xlsx", "d.csv", "e.md", "f.txt", "g.TXT"]) {
      expect(ragSupports(name), name).toBe(true);
    }
    for (const name of ["deck.pptx", "archive.zip", "noext", "audio.mp3"]) {
      expect(ragSupports(name), name).toBe(false);
    }
  });
});

describe("ragService", () => {
  it("uploads as multipart", async () => {
    mockedPost.mockResolvedValueOnce({
      doc_id: "doc-1",
      name: "资料.txt",
      chunks: 3,
      chars: 2100,
    });
    const result = await ragService.upload(new File(["x"], "资料.txt"));
    expect(result.doc_id).toBe("doc-1");
    const [url, body] = mockedPost.mock.calls[0];
    expect(url).toBe("/api/rag/upload");
    expect(body).toBeInstanceOf(FormData);
  });

  it("queries with top_k and returns hits fail-soft", async () => {
    mockedPost.mockResolvedValueOnce({ hits: [{ seq: 2, text: "橘猫习性", source: "资料.txt 第2段" }] });
    const result = await ragService.query("doc-1", "橘猫习性", 4);
    expect(mockedPost).toHaveBeenCalledWith("/api/rag/query", {
      doc_id: "doc-1",
      query: "橘猫习性",
      top_k: 4,
    });
    expect(result.hits[0].source).toContain("第2段");
  });
});

describe("buildRagContext (引用标注)", () => {
  const hits: RagHit[] = [
    { seq: 1, text: "第一段内容", source: "报告.pdf 第1段" },
    { seq: 5, text: "第五段内容", source: "报告.pdf 第5段" },
  ];

  it("numbers hits and instructs citation", () => {
    const context = buildRagContext(hits)!;
    expect(context).toContain("[1] （报告.pdf 第1段）");
    expect(context).toContain("[2] （报告.pdf 第5段）");
    expect(context).toContain("句末用 [序号] 标注");
  });

  it("empty hits yield null (no grounding)", () => {
    expect(buildRagContext([])).toBeNull();
  });
});
