/**
 * Prompts 真实 API
 * 后端端点: /api/prompt/...
 */

import { createActionApi } from "./base";
import { apiClient } from "../api/apiClient";

// 类型定义
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

const baseApi = createActionApi<Prompt>("/api/prompt", "list");

const promptRealApi = {
  ...baseApi,

  getByCategory: (category: string): Promise<Prompt[]> =>
    apiClient.get<Prompt[]>(`/api/prompt/by-category?category=${category}`),

  getVersions: async (promptId: string): Promise<PromptVersion[]> => {
    const data = await apiClient.get<any[]>(`/api/prompt/versions?prompt_id=${promptId}`);
    return data.map((v) => ({
      id: v.id,
      promptId: v.prompt_id ?? v.promptId,
      version: v.version,
      content: v.content,
      variables: v.variables ?? [],
      changeNote: v.change_note ?? v.changeNote ?? v.changes ?? '',
      createdAt: v.create_time ?? v.createdAt,
      createdBy: v.created_by ?? v.createdBy ?? '未知',
    }));
  },

  // 版本比较 - 后端可能不支持，返回模拟数据
  compareVersions: async (_versionId1: string, _versionId2: string): Promise<VersionDiff> => {
    console.warn("promptApi.compareVersions: Backend does not support version comparison");
    return {
      additions: [],
      deletions: [],
      modifications: [],
    };
  },

  // 回滚到指定版本 - 后端可能不支持
  rollbackToVersion: async (_promptId: string, _versionId: string): Promise<Prompt> => {
    console.warn("promptApi.rollbackToVersion: Backend does not support version rollback");
    throw new Error("Version rollback not supported by backend");
  },

  // 替换变量 - 前端实现
  replaceVariables: (content: string, variables: PromptVariable[], values: Record<string, string>): string => {
    let result = content;
    for (const variable of variables) {
      const value = values[variable.name] ?? variable.defaultValue ?? '';
      result = result.replace(new RegExp(`{{${variable.name}}}`, 'g'), value);
    }
    return result;
  },

  // 估算 Token 数量 - 前端实现（简单估算）
  estimateTokens: (content: string): number => {
    // 简单估算：中文约 1.5 字符/token，英文约 4 字符/token
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = content.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  },

  // 模拟聊天 - 后端可能不支持
  simulateChat: async (_promptId: string, _message: string, _variables?: Record<string, string>): Promise<{ response: string }> => {
    console.warn("promptApi.simulateChat: Backend does not support chat simulation");
    return {
      response: "Chat simulation is not supported by the backend. Please test the prompt in a real conversation.",
    };
  },
};

export { promptRealApi };
export type { Prompt, PromptVariable, PromptVersion, VersionDiff };
