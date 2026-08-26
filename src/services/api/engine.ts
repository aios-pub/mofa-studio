/**
 * mofa-engine gateway service
 *
 * Thin client for the OpenAI-compatible endpoints the embedded server-core
 * exposes on top of mofa-engine (linked in-process behind server-core's
 * engine bridge): model listing (`GET /v1/models`) and engine status
 * (`GET /v1/engine/health`). The chat endpoints are served by `chatService`
 * in `chat.ts`.
 */

import { apiClient } from "../api/apiClient";

/** A model card as returned by the gateway's `/v1/models` (OpenAI shape). */
export interface EngineModel {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
  /** Extra gateway fields describing the underlying engine card. */
  capability?: string;
  status?: string;
  cost_tier?: string;
  context_window?: number;
}

/** Engine status as reported by the gateway's `/v1/engine/health`. */
export interface EngineHealth {
  engine_url: string;
  reachable: boolean;
  status: string;
  version?: string;
  /** True when the engine runs in-process (no external daemon). */
  embedded?: boolean;
  /** Number of configured providers; 0 means BYOK setup is pending. */
  providers_configured?: number;
}

/** Sentinel id for "let the engine route by capability". */
export const AUTO_MODEL = "__auto__";

class EngineService {
  /**
   * List models the engine can serve. Empty array when the engine is
   * reachable but has no models yet (e.g. no Ollama / API key configured).
   */
  async listModels(): Promise<EngineModel[]> {
    try {
      const data = await apiClient.get<{ object: string; data: EngineModel[] }>(
        "/v1/models",
      );
      return Array.isArray(data?.data) ? data.data : [];
    } catch {
      // Engine down or gateway unreachable: the health endpoint is the
      // authoritative signal; model listing fails soft.
      return [];
    }
  }

  /** Chat-capable models for the assistant model picker. */
  async listChatModels(): Promise<EngineModel[]> {
    const models = await this.listModels();
    return models.filter(
      (m) => !m.capability || m.capability === "chat" || m.capability === "vlm",
    );
  }

  /** Probe engine reachability through the gateway. Never throws. */
  async health(): Promise<EngineHealth> {
    try {
      return await apiClient.get<EngineHealth>("/v1/engine/health");
    } catch {
      return { engine_url: "", reachable: false, status: "gateway_down" };
    }
  }
}

export const engineService = new EngineService();
