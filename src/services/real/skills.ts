/**
 * Skills 真实 API
 * 后端端点: /api/skill/...
 */

import { createActionApi } from "./base";
import { apiClient } from "../api/apiClient";

// 类型定义
interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: unknown;
  defaultValue?: unknown;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  parameters: SkillParameter[];
  enabled: boolean;
  installed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const baseApi = createActionApi<Skill>("/api/skill", "list");

const skillRealApi = {
  ...baseApi,

  getByCategory: (category: string): Promise<Skill[]> =>
    apiClient.get<Skill[]>(`/api/skill/by-category?category=${category}`),

  getByType: (type: string): Promise<Skill[]> =>
    apiClient.get<Skill[]>(`/api/skill/by-type?type=${type}`),

  getEnabled: (): Promise<Skill[]> =>
    apiClient.get<Skill[]>("/api/skill/enabled"),

  getAgentSkills: (agentId: string): Promise<Skill[]> =>
    apiClient.get<Skill[]>(`/api/skill/agent-skills?agent_id=${agentId}`),

  assign: (agentId: string, skillId: string): Promise<void> =>
    apiClient.post("/api/skill/assign", { agent_id: agentId, skill_id: skillId }),

  unassign: (id: string): Promise<void> =>
    apiClient.delete(`/api/skill/unassign/${id}`),

  // Skill Hub 相关
  getHubSkills: (): Promise<Skill[]> =>
    apiClient.get<Skill[]>("/api/skill-hub/popular"),

  // 执行技能
  execute: (id: string, params: Record<string, unknown>): Promise<{ success: boolean; result: unknown }> =>
    apiClient.post(`/api/skill/execute/${id}`, params),
};

export { skillRealApi };
export type { Skill, SkillParameter };
