/**
 * Prompts 真实 API
 * 后端端点: /api/prompt/...
 *
 * 后端字段映射 (snake_case → camelCase):
 *   create_time    → createdAt
 *   update_time    → updatedAt
 *   prompt_id      → promptId
 *   change_note    → changeNote
 *   created_by     → createdBy
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";

// ==================== 类型定义 ====================

interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  variables: PromptVariable[];
  category: string;
  tags: string[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PromptVariable {
  name: string;
  description: string;
  defaultValue: string;
  required: boolean;
  type?: string;
  options?: string[];
}

interface PromptVersion {
  id: string;
  promptId: string;
  version: string;
  content: string;
  changes: string;
  createdAt: Date;
  createdBy?: string;
}

interface VersionDiff {
  additions: { line: number; content: string }[];
  deletions: { line: number; content: string }[];
  modifications: { line: number; oldContent: string; newContent: string }[];
}

// ==================== 后端原始类型 ====================

interface BackendPrompt {
  id: string;
  name: string;
  description?: string;
  category?: string;
  content: string;
  variables?: unknown;
  version: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

interface BackendPromptVersion {
  id: string;
  prompt_id?: string;
  promptId?: string;
  version: string;
  content: string;
  variables?: unknown[];
  change_note?: string;
  changeNote?: string;
  changes?: string;
  create_time?: string;
  createdAt?: string;
  created_by?: string;
  createdBy?: string;
}

// ==================== 字段映射 ====================

function mapPrompt(raw: BackendPrompt): Prompt {
  let variables: PromptVariable[] = [];
  if (raw.variables) {
    if (Array.isArray(raw.variables)) {
      variables = raw.variables as PromptVariable[];
    } else if (typeof raw.variables === 'object') {
      // 后端可能存为 JSON 对象
      variables = Array.isArray(raw.variables) ? raw.variables as PromptVariable[] : [];
    }
  }

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || "",
    content: raw.content,
    variables,
    category: raw.category || "",
    tags: [],
    version: raw.version,
    createdAt: parseDate(raw.create_time) ?? new Date(),
    updatedAt: parseDate(raw.update_time) ?? new Date(),
  };
}

function mapPromptToBackend(prompt: Partial<Prompt>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (prompt.name !== undefined) result.name = prompt.name;
  if (prompt.description !== undefined) result.description = prompt.description;
  if (prompt.content !== undefined) result.content = prompt.content;
  if (prompt.variables !== undefined) result.variables = prompt.variables;
  if (prompt.category !== undefined) result.category = prompt.category;
  if (prompt.version !== undefined) result.version = prompt.version;
  return result;
}

// ==================== API 方法 ====================

const promptRealApi = {
  /** 获取所有 Prompt */
  async getAll(): Promise<Prompt[]> {
    const data = await apiClient.get<BackendPrompt[]>("/api/prompt/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapPrompt);
  },

  /** 获取单个 Prompt */
  async getById(id: string): Promise<Prompt> {
    const raw = await apiClient.get<BackendPrompt>(`/api/prompt/${id}`);
    return mapPrompt(raw);
  },

  /** 创建 Prompt */
  async create(data: Partial<Prompt>): Promise<Prompt> {
    const body = mapPromptToBackend(data);
    const raw = await apiClient.post<BackendPrompt>("/api/prompt/create", body);
    return mapPrompt(raw);
  },

  /** 更新 Prompt */
  async update(id: string, data: Partial<Prompt>): Promise<Prompt> {
    const existing = await promptRealApi.getById(id);
    const merged = { ...existing, ...data };
    const body = { id, ...mapPromptToBackend(merged) };
    const raw = await apiClient.post<BackendPrompt>("/api/prompt/update", body);
    return mapPrompt(raw);
  },

  /** 删除 Prompt */
  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/prompt/delete/${id}`);
    return true;
  },

  /** 按分类获取 */
  async getByCategory(category: string): Promise<Prompt[]> {
    const data = await apiClient.get<BackendPrompt[]>(`/api/prompt/by-category?category=${category}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapPrompt);
  },

  /** 获取版本列表 */
  async getVersions(promptId: string): Promise<PromptVersion[]> {
    const data = await apiClient.get<BackendPromptVersion[]>(`/api/prompt/versions?prompt_id=${promptId}`);
    if (!Array.isArray(data)) return [];
    return data.map((v) => ({
      id: v.id,
      promptId: v.prompt_id ?? v.promptId ?? "",
      version: v.version,
      content: v.content,
      variables: Array.isArray(v.variables) ? v.variables as PromptVariable[] : [],
      changes: v.change_note ?? v.changeNote ?? v.changes ?? "",
      createdAt: parseDate(v.create_time ?? v.createdAt) ?? new Date(),
      createdBy: v.created_by ?? v.createdBy ?? "未知",
    }));
  },

  /** 版本比较 - 后端暂不支持 */
  async compareVersions(_versionId1: string, _versionId2: string): Promise<VersionDiff> {
    return { additions: [], deletions: [], modifications: [] };
  },

  /** 回滚版本 - 后端暂不支持 */
  async rollbackToVersion(_promptId: string, _versionId: string): Promise<Prompt> {
    throw new Error("Version rollback not supported by backend");
  },

  /** 替换变量 - 前端实现 */
  replaceVariables(content: string, variables: PromptVariable[], values: Record<string, string>): string {
    let result = content;
    for (const variable of variables) {
      const value = values[variable.name] ?? variable.defaultValue ?? "";
      result = result.replace(new RegExp(`{{${variable.name}}}`, "g"), value);
    }
    return result;
  },

  /** 估算 Token count - 前端实现 */
  estimateTokens(content: string): number {
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = content.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  },

  /** 模拟聊天 - 后端暂不支持 */
  async simulateChat(_promptId: string, _message: string, _variables?: Record<string, string>): Promise<{ response: string }> {
    return {
      response: "Chat simulation is not supported by the backend. Please test the prompt in a real conversation.",
    };
  },
};

export { promptRealApi };
export type { Prompt, PromptVariable, PromptVersion, VersionDiff };
