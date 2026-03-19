/**
 * Agent 真实 API
 * 后端端点: /api/agent/...
 */

import { createActionApi } from "./base";
import { apiClient } from "../api/apiClient";
import type { Agent, AgentPermission } from "@/types";

const baseApi = createActionApi<Agent>("/api/agent", { listAction: "fetch", hasGetById: false });

export const agentRealApi = {
  ...baseApi,

  // 别名方法
  getAgents: (): Promise<Agent[]> =>
    apiClient.get<Agent[]>("/api/agent/fetch"),

  async getPermissions(agentId: string): Promise<AgentPermission | undefined> {
    return apiClient.get<AgentPermission>(`/api/permission/by-agent?agent_id=${agentId}`);
  },

  async updatePermissions(
    agentId: string,
    data: Partial<AgentPermission>
  ): Promise<AgentPermission | undefined> {
    return apiClient.post<AgentPermission>("/api/permission/save", {
      agent_id: agentId,
      ...data
    });
  },
};
