/**
 * Skills real API
 * Backend endpoints: /api/skill/...
 *
 * Backend field mapping (snake_case -> camelCase):
 *   skill_type     → type
 *   create_time    → createdAt
 *   update_time    → updatedAt
 *   agent_id       → agentId
 *   skill_id       → skillId
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";

// ==================== Type definitions ====================

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
  hubSkillId?: string;
  installedVersion?: string;
  source?: 'local' | 'hub' | 'installed';
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Raw backend types ====================

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
  create_time: string | Date;
  update_time: string | Date;
  hub_skill_id?: number;
  installed_version?: string;
  source?: string;
}

// ==================== Field mapping ====================

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
    hubSkillId: raw.hub_skill_id ? String(raw.hub_skill_id) : undefined,
    installedVersion: raw.installed_version,
    source: (raw.source || 'local') as Skill['source'],
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
  if (skill.hubSkillId !== undefined) result.hub_skill_id = skill.hubSkillId ? Number(skill.hubSkillId) : null;
  if (skill.installedVersion !== undefined) result.installed_version = skill.installedVersion;
  if (skill.source !== undefined) result.source = skill.source;
  return result;
}

// ==================== API methods ====================

const skillRealApi = {
  /** Get all skills */
  async getAll(): Promise<Skill[]> {
    const data = await apiClient.get<BackendSkill[]>("/api/skill/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapSkill);
  },

  /** Get a single skill */
  async getById(id: string): Promise<Skill> {
    const raw = await apiClient.get<BackendSkill>(`/api/skill/${id}`);
    return mapSkill(raw);
  },

  /** Create skill */
  async create(data: Partial<Skill>): Promise<Skill> {
    const body = mapSkillToBackend(data);
    const raw = await apiClient.post<BackendSkill>("/api/skill/create", body);
    return mapSkill(raw);
  },

  /** Update skill */
  async update(id: string, data: Partial<Skill>): Promise<Skill> {
    const existing = await skillRealApi.getById(id);
    const merged = { ...existing, ...data };
    const body = { id, ...mapSkillToBackend(merged) };
    const raw = await apiClient.post<BackendSkill>("/api/skill/update", body);
    return mapSkill(raw);
  },

  /** Delete skill */
  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/skill/delete/${id}`);
    return true;
  },

  /** Get by category */
  async getByCategory(category: string): Promise<Skill[]> {
    const data = await apiClient.get<BackendSkill[]>(`/api/skill/by-category?category=${category}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapSkill);
  },

  /** Get by type */
  async getByType(type: string): Promise<Skill[]> {
    const data = await apiClient.get<BackendSkill[]>(`/api/skill/by-type?type=${type}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapSkill);
  },

  /** Get enabled skills */
  async getEnabled(): Promise<Skill[]> {
    const data = await apiClient.get<BackendSkill[]>("/api/skill/enabled");
    if (!Array.isArray(data)) return [];
    return data.map(mapSkill);
  },

  /** Get skills associated with an agent */
  async getAgentSkills(agentId: string): Promise<Skill[]> {
    const data = await apiClient.get<BackendSkill[]>(`/api/skill/agent-skills?agent_id=${agentId}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapSkill);
  },

  /** Assign skills to an agent */
  async assign(agentId: string, skillId: string): Promise<void> {
    await apiClient.post("/api/skill/assign", { agent_id: agentId, skill_id: skillId });
  },

  /** Unassign */
  async unassign(id: string): Promise<void> {
    await apiClient.delete(`/api/skill/unassign/${id}`);
  },

  /** Execute skill */
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
