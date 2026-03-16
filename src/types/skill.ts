/**
 * Skill Hub 类型定义
 */

import type { Skill, SkillParameter } from '../services/mock/skills';

// Skill 来源类型
export type SkillSource = 'local' | 'hub' | 'installed';

// Hub Skill（公共仓库）
export interface HubSkill {
  hubId: string;
  name: string;
  description: string;
  type: 'builtin' | 'custom' | 'api';
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

// 本地安装的 Skill（扩展）
export interface InstalledSkill extends Skill {
  source: SkillSource;
  hubId?: string;
  installedVersion?: string;
  latestVersion?: string;
  hasUpdate?: boolean;
}

// 发布 Skill 请求
export interface PublishSkillRequest {
  name: string;
  description: string;
  type: 'builtin' | 'custom' | 'api';
  category: string;
  parameters: SkillParameter[];
  timeout: number;
  tags: string[];
  readme?: string;
}

// Hub 分类
export interface HubCategory {
  id: string;
  name: string;
  icon?: string;
  count: number;
}

// Hub 搜索结果
export interface HubSearchResult {
  skills: HubSkill[];
  total: number;
  page: number;
  pageSize: number;
}

// Hub 统计
export interface HubStats {
  totalSkills: number;
  totalDownloads: number;
  totalCategories: number;
}
