/**
 * Tests for FLOW-06's PNG snapshot extraction: chunk-scanning, base64 JSON
 * decode, and honest nulls for images without a snapshot.
 */
import { describe, expect, it } from "vitest";
import { extractWorkflowFromPng } from "./flow";

/** Build a minimal PNG carrying a mofa_workflow tEXt chunk (mirrors the
 * gateway's embed format). */
function pngWithWorkflow(workflowJson: string): Uint8Array {
  const crc32 = (data: Uint8Array): number => {
    let c = 0xffffffff;
    for (const byte of data) {
      c ^= byte;
      for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (kind: string, data: number[]) => {
    const body = [...kind].map((c) => c.charCodeAt(0)).concat(data);
    const length = [0, 0, 0, data.length];
    const crc = new Uint8Array(4);
    new DataView(crc.buffer).setUint32(0, crc32(new Uint8Array(body)));
    return [...length, ...body, ...crc];
  };
  // btoa() rejects non-Latin-1; encode UTF-8 bytes like the server does.
  const utf8ToBase64 = (text: string): string => {
    const bytes = new TextEncoder().encode(text);
    const TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let out = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const b = [bytes[i], bytes[i + 1] ?? 0, bytes[i + 2] ?? 0];
      const n = (b[0] << 16) | (b[1] << 8) | b[2];
      out += TABLE[(n >> 18) & 63];
      out += TABLE[(n >> 12) & 63];
      out += i + 1 < bytes.length ? TABLE[(n >> 6) & 63] : "=";
      out += i + 2 < bytes.length ? TABLE[n & 63] : "=";
    }
    return out;
  };
  const b64 = utf8ToBase64(workflowJson);
  const textPayload = [
    ...Array.from("mofa_workflow", (c) => c.charCodeAt(0)),
    0,
    ...Array.from(b64, (c) => c.charCodeAt(0)),
  ];
  const foreign = [
    ...Array.from("Description", (c) => c.charCodeAt(0)),
    0,
    ...Array.from("a cat", (c) => c.charCodeAt(0)),
  ];
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk("IHDR", new Array(13).fill(0)),
    ...chunk("tEXt", foreign),
    ...chunk("tEXt", textPayload),
    ...chunk("IEND", []),
  ]);
}

describe("extractWorkflowFromPng (FLOW-06)", () => {
  it("round-trips a snapshot past foreign text chunks", () => {
    const workflow = JSON.stringify({
      nodes: [{ id: "a", type: "prompt_text", params: { text: "一只橘猫" } }],
      edges: [],
    });
    const extracted = extractWorkflowFromPng(pngWithWorkflow(workflow));
    expect(extracted).toBe(workflow);
    expect(JSON.parse(extracted!).nodes[0].params.text).toBe("一只橘猫");
  });

  it("returns null for non-PNG bytes and snapshot-less PNGs", () => {
    expect(extractWorkflowFromPng(new Uint8Array([0x89, 0x50]))).toBeNull();
    const noSnapshot = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      // Truncated chunk structure → null, not a crash.
      0, 0, 0, 5, 0x49, 0x48, 0x44, 0x52,
    ]);
    expect(extractWorkflowFromPng(noSnapshot)).toBeNull();
  });
});
