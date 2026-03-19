/**
 * Skill Hub 状态管理
 */

import { create } from 'zustand';
import type { HubSkill, HubCategory, HubStats } from '../types/skill';
import { skillHubApi, skillApi } from '@/services';

interface SkillHubState {
  // 搜索状态
  searchQuery: string;
  searchResults: HubSkill[];
  searchLoading: boolean;
  selectedCategory: string;

  // 分类数据
  categories: HubCategory[];
  categoriesLoading: boolean;

  // 热门/最新 Skills
  popularSkills: HubSkill[];
  latestSkills: HubSkill[];
  featuredLoading: boolean;

  // Hub 统计
  stats: HubStats | null;

  // 当前查看的 Skill 详情
  selectedHubSkill: HubSkill | null;
  detailLoading: boolean;

  // 安装状态
  installingSkillIds: string[];

  // 发布状态
  publishLoading: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  searchSkills: (query?: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  loadFeatured: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadSkillDetail: (hubId: string) => Promise<void>;
  setSelectedHubSkill: (skill: HubSkill | null) => void;
  installSkill: (skill: HubSkill) => Promise<boolean>;
  uninstallSkill: (skillId: string) => Promise<boolean>;
  publishSkill: (request: {
    name: string;
    description: string;
    type: 'builtin' | 'custom' | 'api';
    category: string;
    parameters: any[];
    timeout: number;
    tags: string[];
    readme?: string;
  }) => Promise<HubSkill | null>;
  reset: () => void;
}

const initialState = {
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
  selectedCategory: 'all',
  categories: [],
  categoriesLoading: false,
  popularSkills: [],
  latestSkills: [],
  featuredLoading: false,
  stats: null,
  selectedHubSkill: null,
  detailLoading: false,
  installingSkillIds: [],
  publishLoading: false,
};

export const useSkillHubStore = create<SkillHubState>((set, get) => ({
  ...initialState,

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedCategory: (category) => {
    set({ selectedCategory: category });
    // 自动搜索
    get().searchSkills();
  },

  searchSkills: async (query) => {
    const { searchQuery, selectedCategory } = get();
    const actualQuery = query !== undefined ? query : searchQuery;

    set({ searchLoading: true });
    try {
      const result = await skillHubApi.search(actualQuery, selectedCategory);
      set({ searchResults: result.skills });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      set({ searchLoading: false });
    }
  },

  loadCategories: async () => {
    set({ categoriesLoading: true });
    try {
      const categories = await skillHubApi.getCategories();
      set({ categories });
    } catch (error) {
      console.error('Load categories failed:', error);
    } finally {
      set({ categoriesLoading: false });
    }
  },

  loadFeatured: async () => {
    set({ featuredLoading: true });
    try {
      const [popular, latest] = await Promise.all([
        skillHubApi.getPopular(8),
        skillHubApi.getLatest(8),
      ]);
      set({ popularSkills: popular, latestSkills: latest });
    } catch (error) {
      console.error('Load featured failed:', error);
    } finally {
      set({ featuredLoading: false });
    }
  },

  loadStats: async () => {
    try {
      const stats = await skillHubApi.getStats();
      set({ stats });
    } catch (error) {
      console.error('Load stats failed:', error);
    }
  },

  loadSkillDetail: async (hubId) => {
    set({ detailLoading: true });
    try {
      const skill = await skillHubApi.getById(hubId);
      set({ selectedHubSkill: skill || null });
    } catch (error) {
      console.error('Load skill detail failed:', error);
    } finally {
      set({ detailLoading: false });
    }
  },

  setSelectedHubSkill: (skill) => set({ selectedHubSkill: skill }),

  installSkill: async (skill) => {
    const { installingSkillIds } = get();

    // 防止重复安装
    if (installingSkillIds.includes(skill.hubId)) {
      return false;
    }

    set({ installingSkillIds: [...installingSkillIds, skill.hubId] });

    try {
      await skillApi.installFromHub({
        hubId: skill.hubId,
        name: skill.name,
        description: skill.description,
        type: skill.type,
        category: skill.category,
        parameters: skill.parameters,
        timeout: skill.timeout,
        version: skill.version,
      });
      return true;
    } catch (error) {
      console.error('Install skill failed:', error);
      return false;
    } finally {
      set({
        installingSkillIds: installingSkillIds.filter((id) => id !== skill.hubId),
      });
    }
  },

  uninstallSkill: async (skillId) => {
    try {
      const success = await skillApi.uninstallFromHub(skillId);
      return success;
    } catch (error) {
      console.error('Uninstall skill failed:', error);
      return false;
    }
  },

  publishSkill: async (request) => {
    set({ publishLoading: true });
    try {
      const newSkill = await skillHubApi.publish(request);
      return newSkill;
    } catch (error) {
      console.error('Publish skill failed:', error);
      return null;
    } finally {
      set({ publishLoading: false });
    }
  },

  reset: () => set(initialState),
}));
