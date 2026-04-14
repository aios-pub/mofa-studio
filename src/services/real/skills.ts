/**
 * Skills 真实 API
 * 后端端点: /api/skill/...
 *
 * 后端字段映射 (snake_case → camelCase):
 *   skill_type     → type
 *   create_time    → createdAt
 *   update_time    → updatedAt
 *   agent_id       → agentId
 *   skill_id       → skillId
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";

// ==================== 类型定义 ====================

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
  type: 'builtin' | 'custom' | 'api';
  version: string;
  author: string;
  category: string;
  tags: string[];
  parameters: SkillParameter[];
  timeout: number;
  enabled: boolean;
  installed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 后端原始类型 ====================

interface BackendSkill {
  id: string;
  name: string;
  description?: string;
  skill_type?: string;
  category?: string;
  parameters?: unknown;
  timeout?: number;
  enabled: boolean;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

// ==================== 字段映射 ====================

function mapSkill(raw: BackendSkill): Skill {
  let parameters: SkillParameter[] = [];
  if (raw.parameters) {
    if (Array.isArray(raw.parameters)) {
      parameters = raw.parameters as SkillParameter[];
    }
  }

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || "",
    type: (raw.skill_type || 'custom') as Skill['type'],
    version: "1.0",
    author: "",
    category: raw.category || "",
    tags: [],
    parameters,
    timeout: raw.timeout ?? 30000,
    enabled: raw.enabled,
    installed: true,
    createdAt: parseDate(raw.create_time) ?? new Date(),
    updatedAt: parseDate(raw.update_time) ?? new Date(),
  };
}

function mapSkillToBackend(skill: Partial<Skill>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (skill.name !== undefined) result.name = skill.name;
  if (skill.description !== undefined) result.description = skill.description;
  if (skill.category !== undefined) result.category = skill.category;
  if (skill.parameters !== undefined) result.parameters = skill.parameters;
  if (skill.enabled !== undefined) result.enabled = skill.enabled;
  return result;
}

// ==================== API 方法 ====================

const skillRealApi = {
  /** 获取所有技能 */
  async getAll(): Promise<Skill[]> {
    const data = await apiClient.get<BackendSkill[]>("/api/skill/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapSkill);
  },

  /** 获取单个技能 */
  async getById(id: string): Promise<Skill> {
    const raw = await apiClient.get<BackendSkill>(`/api/skill/${id}`);
    return mapSkill(raw);
  },

  /** 创建技能 */
  async create(data: Partial<Skill>): Promise<Skill> {
    const body = mapSkillToBackend(data);
    const raw = await apiClient.post<BackendSkill>("/api/skill/create", body);
    return mapSkill(raw);
  },

  /** 更新技能 */
  async update(id: string, data: Partial<Skill>): Promise<Skill> {
    const existing = await skillRealApi.getById(id);
    const merged = { ...existing, ...data };
    const body = { id, ...mapSkillToBackend(merged) };
    const raw = await apiClient.post<BackendSkill>("/api/skill/update", body);
    return mapSkill(raw);
  },

  /** 删除技能 */
  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/skill/delete/${id}`);
    return true;
  },

  /** 按分类获取 */
  async getByCategory(category: string): Promise<Skill[]> {
    const data = await apiClient.get<BackendSkill[]>(`/api/skill/by-category?category=${category}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapSkill);
  },

  /** 按类型获取 */
  async getByType(type: string): Promise<Skill[]> {
    const data = await apiClient.get<BackendSkill[]>(`/api/skill/by-type?type=${type}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapSkill);
  },

  /** 获取已启用的技能 */
  async getEnabled(): Promise<Skill[]> {
    const data = await apiClient.get<BackendSkill[]>("/api/skill/enabled");
    if (!Array.isArray(data)) return [];
    return data.map(mapSkill);
  },

  /** 获取 Agent 关联的技能 */
  async getAgentSkills(agentId: string): Promise<Skill[]> {
    const data = await apiClient.get<BackendSkill[]>(`/api/skill/agent-skills?agent_id=${agentId}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapSkill);
  },

  /** 分配技能给 Agent */
  async assign(agentId: string, skillId: string): Promise<void> {
    await apiClient.post("/api/skill/assign", { agent_id: agentId, skill_id: skillId });
  },

  /** 取消分配 */
  async unassign(id: string): Promise<void> {
    await apiClient.delete(`/api/skill/unassign/${id}`);
  },

  /** 执行技能 */
  async execute(id: string, params: Record<string, unknown>): Promise<{ success: boolean; result: unknown }> {
    return apiClient.post(`/api/skill/execute/${id}`, params);
  },

  /** Skill Hub */
  async getHubSkills(): Promise<Skill[]> {
    const data = await apiClient.get<BackendSkill[]>("/api/skill-hub/popular");
    if (!Array.isArray(data)) return [];
    return data.map(mapSkill);
  },
};

export { skillRealApi };
export type { Skill, SkillParameter };
