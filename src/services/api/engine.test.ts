/**
 * Tests for the mofa-engine gateway service: model listing, chat filtering,
 * and fail-soft behavior when the gateway/engine is down.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../api/apiClient";
import { engineService, type EngineModel } from "./engine";

vi.mock("../api/apiClient", () => ({
  apiClient: { get: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);

function modelCard(overrides: Partial<EngineModel> = {}): EngineModel {
  return {
    id: "mock/mock-chat",
    object: "model",
    created: 0,
    owned_by: "mock",
    capability: "chat",
    status: "hot",
    cost_tier: "free",
    context_window: 8192,
    ...overrides,
  };
}

beforeEach(() => {
  mockedGet.mockReset();
});

describe("engineService.listModels", () => {
  it("returns the data array from the OpenAI-shaped response", async () => {
    mockedGet.mockResolvedValueOnce({
      object: "list",
      data: [modelCard(), modelCard({ id: "mock/mock-tts", capability: "tts" })],
    });
    const models = await engineService.listModels();
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe("mock/mock-chat");
    expect(mockedGet).toHaveBeenCalledWith("/v1/models");
  });

  it("fails soft to an empty list when the gateway is down", async () => {
    mockedGet.mockRejectedValueOnce(new Error("network down"));
    await expect(engineService.listModels()).resolves.toEqual([]);
  });

  it("tolerates malformed payloads", async () => {
    mockedGet.mockResolvedValueOnce({ object: "list" });
    await expect(engineService.listModels()).resolves.toEqual([]);
  });
});

describe("engineService.listChatModels", () => {
  it("keeps chat and vlm cards, drops other capabilities", async () => {
    mockedGet.mockResolvedValueOnce({
      object: "list",
      data: [
        modelCard(),
        modelCard({ id: "mock/vlm", capability: "vlm" }),
        modelCard({ id: "mock/tts", capability: "tts" }),
        modelCard({ id: "mock/no-cap" , capability: undefined }),
      ],
    });
    const chat = await engineService.listChatModels();
    expect(chat.map((m) => m.id)).toEqual([
      "mock/mock-chat",
      "mock/vlm",
      "mock/no-cap",
    ]);
  });
});

describe("engineService.health", () => {
  it("returns the gateway payload", async () => {
    mockedGet.mockResolvedValueOnce({
      engine_url: "http://127.0.0.1:8420",
      reachable: true,
      status: "ok",
      version: "0.1.0",
    });
    const health = await engineService.health();
    expect(health.reachable).toBe(true);
    expect(health.version).toBe("0.1.0");
  });

  it("never throws; reports gateway_down when the request fails", async () => {
    mockedGet.mockRejectedValueOnce(new Error("boom"));
    const health = await engineService.health();
    expect(health.reachable).toBe(false);
    expect(health.status).toBe("gateway_down");
  });
});
