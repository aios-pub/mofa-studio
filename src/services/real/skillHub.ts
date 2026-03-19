/**
 * Skill Hub 真实 API
 * 后端端点: /api/skill-hub/...
 */

import { apiClient } from "../api/apiClient";

// 类型定义
interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

interface HubSkill {
  hubId: string;
  name: string;
  description: string;
  type: 'api' | 'builtin' | 'custom';
  category: string;
  parameters: SkillParameter[];
  timeout: number;
  version: string;
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  readme?: string;
  publishedAt: Date;
  updatedAt: Date;
}

interface HubCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface HubSearchResult {
  skills: HubSkill[];
  total: number;
  page: number;
  pageSize: number;
}

interface HubStats {
  totalSkills: number;
  totalDownloads: number;
  totalCategories: number;
}

const skillHubRealApi = {
  // 获取热门 Skills
  getPopular: (limit: number = 10): Promise<HubSkill[]> =>
    apiClient.get<HubSkill[]>('/api/skill-hub/popular', { params: { limit } }),

  // 获取最新 Skills
  getLatest: (limit: number = 10): Promise<HubSkill[]> =>
    apiClient.get<HubSkill[]>('/api/skill-hub/latest', { params: { limit } }),

  // 获取所有分类
  getCategories: (): Promise<HubCategory[]> =>
    apiClient.get<HubCategory[]>('/api/skill-hub/categories'),

  // 搜索 Skills
  search: (query: string, category?: string, page: number = 1, pageSize: number = 20): Promise<HubSearchResult> =>
    apiClient.get<HubSearchResult>('/api/skill-hub/search', {
      params: { query, category, page, page_size: pageSize }
    }),

  // 获取单个 Skill 详情
  getById: (hubId: string): Promise<HubSkill> =>
    apiClient.get<HubSkill>(`/api/skill-hub/skills/${hubId}`),

  // 获取 Hub 统计
  getStats: (): Promise<HubStats> =>
    apiClient.get<HubStats>('/api/skill-hub/stats'),

  // 检查更新
  checkUpdates: (installedSkills: Array<{ hubId: string; version: string }>): Promise<Array<{ hubId: string; latestVersion: string }>> =>
    apiClient.post<Array<{ hubId: string; latestVersion: string }>>('/api/skill-hub/check-updates', { installed_skills: installedSkills }),
};

export { skillHubRealApi };
export type { HubSkill, HubCategory, HubSearchResult, HubStats, SkillParameter };
