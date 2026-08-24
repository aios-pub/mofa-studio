/**
 * Tests for the unified Asset model service (PLAT-06): CRUD mapping,
 * best-effort semantics, and the type × source gallery filter.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import type { Asset } from "./assets";
import {
  assetService,
  filterAssets,
  recordImageAssets,
} from "./assets";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedDelete = vi.mocked(apiClient.delete);

function asset(partial: Partial<Asset>): Asset {
  return {
    id: "a1",
    type: "image",
    source: "studio",
    title: "橘猫",
    meta_json: {},
    ref_path: "data:image/png;base64,QUJD",
    created_at: "2026-08-25T00:00:00Z",
    tags: [],
    ...partial,
  };
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedDelete.mockReset();
});

describe("assetService", () => {
  it("lists assets fail-soft", async () => {
    mockedGet.mockResolvedValueOnce([asset({})]);
    expect(await assetService.list()).toHaveLength(1);
    mockedGet.mockRejectedValueOnce(new Error("down"));
    expect(await assetService.list()).toEqual([]);
  });

  it("creates with the PLAT-06 field shape", async () => {
    mockedPost.mockResolvedValueOnce(asset({ id: "new" }));
    await assetService.create({
      type: "image",
      source: "chat",
      title: "夜景橘猫",
      meta_json: { prompt: "橘猫" },
      ref_path: "data:...",
      tags: ["生成"],
    });
    expect(mockedPost).toHaveBeenCalledWith("/api/asset/create", {
      type: "image",
      source: "chat",
      title: "夜景橘猫",
      meta_json: { prompt: "橘猫" },
      ref_path: "data:...",
      tags: ["生成"],
    });
  });

  it("create failures resolve null (recording is best-effort)", async () => {
    mockedPost.mockRejectedValueOnce(new Error("boom"));
    expect(
      await assetService.create({ type: "file", source: "import", title: "x", ref_path: "p" }),
    ).toBeNull();
  });

  it("deletes by id", async () => {
    mockedDelete.mockResolvedValueOnce(undefined);
    expect(await assetService.remove("a1")).toBe(true);
    mockedDelete.mockRejectedValueOnce(new Error("x"));
    expect(await assetService.remove("a1")).toBe(false);
  });
});

describe("filterAssets (gallery type × source)", () => {
  const assets = [
    asset({ id: "1", type: "image", source: "chat" }),
    asset({ id: "2", type: "image", source: "studio" }),
    asset({ id: "3", type: "doc", source: "task" }),
    asset({ id: "4", type: "video", source: "flow" }),
  ];

  it("all/all returns everything", () => {
    expect(filterAssets(assets, "all", "all")).toHaveLength(4);
  });

  it("filters by type only, source only, and both", () => {
    expect(filterAssets(assets, "image", "all")).toHaveLength(2);
    expect(filterAssets(assets, "all", "chat")).toHaveLength(1);
    expect(filterAssets(assets, "image", "studio")).toEqual([assets[1]]);
    expect(filterAssets(assets, "doc", "flow")).toEqual([]);
  });
});

describe("recordImageAssets", () => {
  it("records one asset per image with prompt metadata", async () => {
    mockedPost.mockResolvedValue(asset({}));
    await recordImageAssets("studio", "橘猫", ["data:1", "data:2"], {
      size: "1024x1024",
    });
    expect(mockedPost).toHaveBeenCalledTimes(2);
    const first = mockedPost.mock.calls[0][1] as Record<string, unknown>;
    expect(first.type).toBe("image");
    expect(first.source).toBe("studio");
    expect((first.meta_json as Record<string, unknown>).prompt).toBe("橘猫");
    expect((first.meta_json as Record<string, unknown>).size).toBe("1024x1024");
    expect(first.title).toBe("橘猫（1）");
  });
});
