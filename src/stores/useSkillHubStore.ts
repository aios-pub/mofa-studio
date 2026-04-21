/**
 * Skill Hub 状态管理 (V2)
 */

import { create } from 'zustand';
import { message } from 'antd';
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
  PublishSkillResult,
  PromotionTask,
  SkillLifecycleResponse,
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

  // === Installing ===
  installingSkillIds: Set<string>;
  installedSkillIds: Set<string>;

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
  search: (page?: number) => Promise<void>;
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
  archiveSkill: (namespace: string, slug: string) => Promise<SkillLifecycleResponse | null>;
  unarchiveSkill: (namespace: string, slug: string) => Promise<SkillLifecycleResponse | null>;
  confirmPublish: (namespace: string, slug: string, version: string) => Promise<SkillLifecycleResponse | null>;
  withdrawReview: (namespace: string, slug: string, version: string) => Promise<SkillLifecycleResponse | null>;
  yankVersion: (namespace: string, slug: string, version: string, reason: string) => Promise<void>;
  rereleaseVersion: (namespace: string, slug: string, version: string) => Promise<SkillLifecycleResponse | null>;
  loadPromotions: (params?: { namespaceId?: string; status?: string; page?: number }) => Promise<void>;
  approvePromotion: (id: string, data?: { comment?: string }) => Promise<void>;
  rejectPromotion: (id: string, data?: { comment?: string }) => Promise<void>;
  loadStats: () => Promise<void>;
  downloadSkillBundle: (namespace: string, slug: string, version?: string) => Promise<Blob | null>;
  installSkillFromHub: (namespace: string, slug: string, skillId: string, version?: string) => Promise<boolean>;
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
  installingSkillIds: new Set<string>(),
  installedSkillIds: new Set<string>(),
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

  search: async (page = 0) => {
    const { searchQuery, selectedNamespace, selectedLabels, sortBy } = get();
    set({ searchLoading: true });
    try {
      const result = await skillHubV2Api.search({
        q: searchQuery || undefined,
        namespace: selectedNamespace || undefined,
        labels: selectedLabels.length > 0 ? selectedLabels : undefined,
        sort: sortBy,
        page,
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

  archiveSkill: async (namespace, slug) => {
    try {
      const result = await skillHubV2Api.archiveSkill(namespace, slug);
      message.success('技能已归档');
      return result;
    } catch (error) {
      console.error('Archive skill failed:', error);
      message.error('归档技能失败');
      return null;
    }
  },

  unarchiveSkill: async (namespace, slug) => {
    try {
      const result = await skillHubV2Api.unarchiveSkill(namespace, slug);
      message.success('技能已恢复');
      return result;
    } catch (error) {
      console.error('Unarchive skill failed:', error);
      message.error('恢复技能失败');
      return null;
    }
  },

  confirmPublish: async (namespace, slug, version) => {
    try {
      const result = await skillHubV2Api.confirmPublish(namespace, slug, version);
      message.success('发布确认成功');
      return result;
    } catch (error) {
      console.error('Confirm publish failed:', error);
      message.error('发布确认失败');
      return null;
    }
  },

  withdrawReview: async (namespace, slug, version) => {
    try {
      const result = await skillHubV2Api.withdrawReview(namespace, slug, version);
      message.success('已撤回审核申请');
      return result;
    } catch (error) {
      console.error('Withdraw review failed:', error);
      message.error('撤回审核失败');
      return null;
    }
  },

  yankVersion: async (_namespace, _slug, version, reason) => {
    try {
      await skillHubV2Api.yankVersion(version, reason);
      message.success('版本已下架');
    } catch (error) {
      console.error('Yank version failed:', error);
      message.error('下架版本失败');
      throw error;
    }
  },

  rereleaseVersion: async (namespace, slug, version) => {
    try {
      const result = await skillHubV2Api.rereleaseVersion(namespace, slug, version);
      message.success('版本已重新发布');
      return result;
    } catch (error) {
      console.error('Rerelease version failed:', error);
      message.error('重新发布失败');
      return null;
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

  downloadSkillBundle: async (_namespace, _slug, _version) => {
    try {
      const blob = await skillHubV2Api.downloadBundle(_namespace, _slug, _version);
      return blob;
    } catch (error) {
      console.error('Download skill bundle failed:', error);
      return null;
    }
  },

  installSkillFromHub: async (namespace, slug, skillId, version) => {
    const { installingSkillIds, installedSkillIds } = get();
    if (installingSkillIds.has(skillId) || installedSkillIds.has(skillId)) {
      return false;
    }

    set({ installingSkillIds: new Set([...installingSkillIds, skillId]) });
    try {
      const blob = await skillHubV2Api.downloadBundle(namespace, slug, version);
      if (!blob) {
        message.error('下载技能包失败');
        set({ installingSkillIds: new Set([...get().installingSkillIds].filter(id => id !== skillId)) });
        return false;
      }

      // Parse ZIP to extract metadata
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(blob);

      // Find SKILL.md
      const allFiles = Object.keys(zip.files);
      const skillMdPath = allFiles.find(path => {
        const fileName = path.split('/').pop()?.toLowerCase();
        return fileName === 'skill.md';
      });

      if (!skillMdPath) {
        message.error('技能包中未找到 SKILL.md 文件');
        set({ installingSkillIds: new Set([...get().installingSkillIds].filter(id => id !== skillId)) });
        return false;
      }

      const skillMdFile = zip.file(skillMdPath);
      if (!skillMdFile) {
        message.error('无法读取 SKILL.md 文件');
        set({ installingSkillIds: new Set([...get().installingSkillIds].filter(id => id !== skillId)) });
        return false;
      }

      const content = await skillMdFile.async('string');
      const metadata = parseSkillMd(content);

      if (!metadata.name) {
        message.error('SKILL.md 中未找到技能名称');
        set({ installingSkillIds: new Set([...get().installingSkillIds].filter(id => id !== skillId)) });
        return false;
      }

      // Create local skill via skillApi
      const { skillApi } = await import('@/services');
      await skillApi.create({
        name: metadata.displayName || metadata.name,
        description: metadata.description || metadata.readme || '',
        version: metadata.version || '1.0.0',
        author: metadata.author || namespace,
        category: metadata.category || 'custom',
        tags: metadata.tags || [],
        parameters: metadata.parameters || [],
        timeout: metadata.timeout || 30000,
        enabled: true,
      });

      const currentInstalling = get().installingSkillIds;
      const currentInstalled = get().installedSkillIds;
      set({
        installingSkillIds: new Set([...currentInstalling].filter(id => id !== skillId)),
        installedSkillIds: new Set([...currentInstalled, skillId]),
      });
      message.success(`技能 "${metadata.displayName || metadata.name}" 安装成功`);
      return true;
    } catch (error) {
      console.error('Install skill failed:', error);
      message.error('安装技能失败');
      set({ installingSkillIds: new Set([...get().installingSkillIds].filter(id => id !== skillId)) });
      return false;
    }
  },

  reset: () => set(initialState),
}));

// Parse SKILL.md frontmatter
interface ParsedMetadata {
  name?: string;
  displayName?: string;
  description?: string;
  version?: string;
  author?: string;
  category?: string;
  tags?: string[];
  parameters?: unknown[];
  timeout?: number;
  readme?: string;
}

function parseSkillMd(content: string): ParsedMetadata {
  const lines = content.split('\n');
  const metadata: ParsedMetadata = {};
  let inFrontMatter = false;
  let frontMatterLines: string[] = [];
  let readmeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.trim() === '---') {
      inFrontMatter = true;
      continue;
    }
    if (inFrontMatter && line.trim() === '---') {
      inFrontMatter = false;
      continue;
    }
    if (inFrontMatter) {
      frontMatterLines.push(line);
    } else {
      readmeLines.push(line);
    }
  }

  for (const line of frontMatterLines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (key === 'tags') {
        try {
          metadata[key as keyof ParsedMetadata] = JSON.parse(value);
        } catch {
          // Skip invalid JSON
        }
      } else if (key === 'parameters') {
        try {
          metadata[key as keyof ParsedMetadata] = JSON.parse(value);
        } catch {
          // Skip invalid JSON
        }
      } else if (key === 'timeout') {
        (metadata as Record<string, unknown>)[key] = parseInt(value, 10);
      } else {
        (metadata as Record<string, unknown>)[key] = value;
      }
    }
  }

  metadata.readme = readmeLines.join('\n').trim();
  return metadata;
}
