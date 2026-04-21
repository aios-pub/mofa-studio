/**
 * Skill Hub 状态管理 (V2)
 */

import { create } from 'zustand';
import type {
  HubSkill,
  HubSkillVersion,
  HubSkillFile,
  HubNamespace,
  HubLabel,
  ReviewTask,
  SkillReport,
  HubSearchResult,
  HubStats,
  PageResponse,
  SkillVisibility,
  NamespaceRole,
  LabelType,
  PublishSkillResult,
  PromotionTask,
} from '../types/skill';
import { skillHubV2Api } from '@/services';

interface SkillHubState {
  // === Search & Browse ===
  searchQuery: string;
  selectedNamespace: string;
  selectedLabels: string[];
  sortBy: 'newest' | 'popular' | 'rating';
  searchResults: HubSearchResult | null;
  searchLoading: boolean;

  // === Categories / Namespaces ===
  namespaces: HubNamespace[];
  namespaceLoading: boolean;

  // === Labels ===
  labels: HubLabel[];
  labelsLoading: boolean;

  // === Skill Detail ===
  selectedHubSkill: HubSkill | null;
  detailLoading: boolean;
  selectedHubSkillVersions: PageResponse<HubSkillVersion> | null;

  // === Social ===
  starredSkillIds: Set<string>;
  userRatings: Map<string, number>;

  // === File Browser ===
  currentFiles: HubSkillFile[];
  selectedFileContent: string | null;
  selectedFileName: string | null;
  fileLoading: boolean;

  // === Publishing ===
  publishLoading: boolean;
  publishProgress: number;
  publishResult: PublishSkillResult | null;

  // === Reviews ===
  reviewTasks: PageResponse<ReviewTask> | null;
  reviewLoading: boolean;

  // === Reports ===
  reports: PageResponse<SkillReport> | null;
  reportsLoading: boolean;

  // === Promotions ===
  promotions: PageResponse<PromotionTask> | null;
  promotionsLoading: boolean;

  // === Stats ===
  stats: HubStats | null;

  // === Actions ===
  setSearchQuery: (query: string) => void;
  setSelectedNamespace: (namespace: string) => void;
  setSelectedLabels: (labels: string[]) => void;
  setSortBy: (sort: 'newest' | 'popular' | 'rating') => void;
  search: () => Promise<void>;
  loadNamespaces: () => Promise<void>;
  loadLabels: (locale?: string) => Promise<void>;
  loadSkillDetail: (namespace: string, slug: string) => Promise<void>;
  loadVersions: (namespace: string, slug: string, page?: number) => Promise<void>;
  loadFiles: (namespace: string, slug: string, version: string) => Promise<void>;
  loadFileContent: (namespace: string, slug: string, version: string, path: string) => Promise<void>;
  starSkill: (skillId: string) => Promise<void>;
  unstarSkill: (skillId: string) => Promise<void>;
  rateSkill: (skillId: string, score: number) => Promise<void>;
  publish: (namespace: string, file: File, visibility: SkillVisibility) => Promise<PublishSkillResult | null>;
  submitReview: (namespace: string, slug: string, version: string) => Promise<void>;
  approveReview: (id: string, comment?: string) => Promise<void>;
  rejectReview: (id: string, comment?: string) => Promise<void>;
  submitReport: (namespace: string, slug: string, reason: string, details?: string) => Promise<void>;
  loadReviews: (params?: { status?: string; namespaceId?: string; page?: number }) => Promise<void>;
  loadReports: (params?: { status?: string; page?: number }) => Promise<void>;
  resolveReport: (id: string, data: { action: string; comment?: string }) => Promise<void>;
  hideSkill: (skillId: string, reason?: string) => Promise<void>;
  unhideSkill: (skillId: string) => Promise<void>;
  loadPromotions: (params?: { namespaceId?: string; status?: string; page?: number }) => Promise<void>;
  approvePromotion: (id: string, data?: { comment?: string }) => Promise<void>;
  rejectPromotion: (id: string, data?: { comment?: string }) => Promise<void>;
  loadStats: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  searchQuery: '',
  selectedNamespace: '',
  selectedLabels: [],
  sortBy: 'newest' as const,
  searchResults: null,
  searchLoading: false,
  namespaces: [],
  namespaceLoading: false,
  labels: [],
  labelsLoading: false,
  selectedHubSkill: null,
  detailLoading: false,
  selectedHubSkillVersions: null,
  starredSkillIds: new Set<string>(),
  userRatings: new Map<string, number>(),
  currentFiles: [],
  selectedFileContent: null,
  selectedFileName: null,
  fileLoading: false,
  publishLoading: false,
  publishProgress: 0,
  publishResult: null,
  reviewTasks: null,
  reviewLoading: false,
  reports: null,
  reportsLoading: false,
  promotions: null,
  promotionsLoading: false,
  stats: null,
};

export const useSkillHubStore = create<SkillHubState>((set, get) => ({
  ...initialState,

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedNamespace: (namespace) => set({ selectedNamespace: namespace }),

  setSelectedLabels: (labels) => set({ selectedLabels: labels }),

  setSortBy: (sort) => set({ sortBy: sort }),

  search: async () => {
    const { searchQuery, selectedNamespace, selectedLabels, sortBy } = get();
    set({ searchLoading: true });
    try {
      const result = await skillHubV2Api.search({
        q: searchQuery || undefined,
        namespace: selectedNamespace || undefined,
        labels: selectedLabels.length > 0 ? selectedLabels : undefined,
        sort: sortBy,
        page: 0,
        size: 20,
      });
      set({ searchResults: result });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      set({ searchLoading: false });
    }
  },

  loadNamespaces: async () => {
    set({ namespaceLoading: true });
    try {
      const namespaces = await skillHubV2Api.listNamespaces();
      set({ namespaces });
    } catch (error) {
      console.error('Load namespaces failed:', error);
    } finally {
      set({ namespaceLoading: false });
    }
  },

  loadLabels: async (locale = 'zh-CN') => {
    set({ labelsLoading: true });
    try {
      const labels = await skillHubV2Api.getLabels(locale);
      set({ labels });
    } catch (error) {
      console.error('Load labels failed:', error);
    } finally {
      set({ labelsLoading: false });
    }
  },

  loadSkillDetail: async (namespace, slug) => {
    set({ detailLoading: true });
    try {
      const skill = await skillHubV2Api.getSkillDetail(namespace, slug);
      set({ selectedHubSkill: skill });
    } catch (error) {
      console.error('Load skill detail failed:', error);
    } finally {
      set({ detailLoading: false });
    }
  },

  loadVersions: async (namespace, slug, page = 0) => {
    try {
      const versions = await skillHubV2Api.listVersions(namespace, slug, page);
      set({ selectedHubSkillVersions: versions });
    } catch (error) {
      console.error('Load versions failed:', error);
    }
  },

  loadFiles: async (namespace, slug, version) => {
    try {
      const files = await skillHubV2Api.listFiles(namespace, slug, version);
      set({ currentFiles: files });
    } catch (error) {
      console.error('Load files failed:', error);
    }
  },

  loadFileContent: async (namespace, slug, version, path) => {
    set({ fileLoading: true, selectedFileName: path });
    try {
      const blob = await skillHubV2Api.getFileContent(namespace, slug, version, path);
      const text = await blob.text();
      set({ selectedFileContent: text });
    } catch (error) {
      console.error('Load file content failed:', error);
      set({ selectedFileContent: null });
    } finally {
      set({ fileLoading: false });
    }
  },

  starSkill: async (skillId) => {
    const { starredSkillIds } = get();
    try {
      await skillHubV2Api.starSkill(skillId);
      set({ starredSkillIds: new Set([...starredSkillIds, skillId]) });
    } catch (error) {
      console.error('Star skill failed:', error);
    }
  },

  unstarSkill: async (skillId) => {
    const { starredSkillIds } = get();
    try {
      await skillHubV2Api.unstarSkill(skillId);
      const newSet = new Set(starredSkillIds);
      newSet.delete(skillId);
      set({ starredSkillIds: newSet });
    } catch (error) {
      console.error('Unstar skill failed:', error);
    }
  },

  rateSkill: async (skillId, score) => {
    const { userRatings } = get();
    try {
      await skillHubV2Api.rateSkill(skillId, score);
      set({ userRatings: new Map([...userRatings, [skillId, score]]) });
    } catch (error) {
      console.error('Rate skill failed:', error);
    }
  },

  publish: async (namespace, file, visibility) => {
    set({ publishLoading: true, publishProgress: 0, publishResult: null });
    try {
      const result = await skillHubV2Api.publish(namespace, file, visibility);
      console.log('[useSkillHubStore] Publish result:', result);
      console.log('[useSkillHubStore] slug value:', result.slug);
      set({ publishResult: result, publishProgress: 100 });
      return result;
    } catch (error) {
      console.error('Publish skill failed:', error);
      return null;
    } finally {
      set({ publishLoading: false });
    }
  },

  submitReview: async (namespace, slug, version) => {
    try {
      await skillHubV2Api.submitReview(namespace, slug, version);
    } catch (error) {
      console.error('Submit review failed:', error);
    }
  },

  approveReview: async (id, comment) => {
    try {
      await skillHubV2Api.approveReview(id, comment);
    } catch (error) {
      console.error('Approve review failed:', error);
    }
  },

  rejectReview: async (id, comment) => {
    try {
      await skillHubV2Api.rejectReview(id, comment);
    } catch (error) {
      console.error('Reject review failed:', error);
    }
  },

  submitReport: async (namespace, slug, reason, details) => {
    try {
      await skillHubV2Api.submitReport(namespace, slug, { reason, details });
    } catch (error) {
      console.error('Submit report failed:', error);
    }
  },

  loadReviews: async (params) => {
    set({ reviewLoading: true });
    try {
      const reviews = await skillHubV2Api.listReviews(params || {});
      set({ reviewTasks: reviews });
    } catch (error) {
      console.error('Load reviews failed:', error);
    } finally {
      set({ reviewLoading: false });
    }
  },

  loadReports: async (params) => {
    set({ reportsLoading: true });
    try {
      const reports = await skillHubV2Api.listReports(params || {});
      set({ reports: reports });
    } catch (error) {
      console.error('Load reports failed:', error);
    } finally {
      set({ reportsLoading: false });
    }
  },

  resolveReport: async (id, data) => {
    try {
      await skillHubV2Api.resolveReport(id, data);
      // Reload reports after resolution
      get().loadReports();
    } catch (error) {
      console.error('Resolve report failed:', error);
      throw error;
    }
  },

  hideSkill: async (skillId, reason) => {
    try {
      await skillHubV2Api.hideSkill(skillId, reason);
    } catch (error) {
      console.error('Hide skill failed:', error);
      throw error;
    }
  },

  unhideSkill: async (skillId) => {
    try {
      await skillHubV2Api.unhideSkill(skillId);
    } catch (error) {
      console.error('Unhide skill failed:', error);
      throw error;
    }
  },

  loadStats: async () => {
    try {
      const stats = await skillHubV2Api.getStats();
      set({ stats });
    } catch (error) {
      console.error('Load stats failed:', error);
    }
  },

  loadPromotions: async (params) => {
    set({ promotionsLoading: true });
    try {
      const promotions = await skillHubV2Api.listPromotions(params || {});
      set({ promotions });
    } catch (error) {
      console.error('Load promotions failed:', error);
    } finally {
      set({ promotionsLoading: false });
    }
  },

  approvePromotion: async (id, data) => {
    try {
      await skillHubV2Api.approvePromotion(id, data);
      // Reload promotions
      get().loadPromotions();
    } catch (error) {
      console.error('Approve promotion failed:', error);
      throw error;
    }
  },

  rejectPromotion: async (id, data) => {
    try {
      await skillHubV2Api.rejectPromotion(id, data);
      // Reload promotions
      get().loadPromotions();
    } catch (error) {
      console.error('Reject promotion failed:', error);
      throw error;
    }
  },

  reset: () => set(initialState),
}));
