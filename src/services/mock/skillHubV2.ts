/**
 * Skill Hub V2 Mock API
 * 用于开发环境模拟后端数据
 */

import type {
  HubSkill,
  HubSkillVersion,
  HubSkillFile,
  HubNamespace,
  NamespaceMember,
  HubLabel,
  LabelDefinition,
  ReviewTask,
  SkillReport,
  HubSearchResult,
  PublishSkillResult,
  HubStats,
  PageResponse,
  SkillRatingStatus,
  SkillLifecycleResponse,
  SkillVisibility,
  NamespaceType,
  NamespaceRole,
  LabelType,
  LabelTranslation,
  PromotionTask,
} from '@/types/skill';

// Mock data
const mockNamespaces: HubNamespace[] = [
  {
    id: '1',
    tenantId: 'default',
    slug: 'global',
    displayName: 'Global Namespace',
    type: 'GLOBAL' as NamespaceType,
    description: 'Global skill namespace for all users',
    status: 'ACTIVE',
    memberCount: 100,
    skillCount: 50,
    createdBy: 'system',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  {
    id: '2',
    tenantId: 'default',
    slug: 'team-a',
    displayName: 'Team A',
    type: 'TEAM' as NamespaceType,
    description: 'Team A namespace',
    status: 'ACTIVE',
    memberCount: 10,
    skillCount: 5,
    createdBy: 'admin',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
  },
];

const mockLabels: HubLabel[] = [
  { id: '1', slug: 'verified', type: 'RECOMMENDED' as LabelType, displayName: '已认证', visibleInFilter: true, sortOrder: 1 },
  { id: '2', slug: 'official', type: 'RECOMMENDED' as LabelType, displayName: '官方', visibleInFilter: true, sortOrder: 2 },
  { id: '3', slug: 'popular', type: 'RECOMMENDED' as LabelType, displayName: '热门', visibleInFilter: true, sortOrder: 3 },
  { id: '4', slug: 'experimental', type: 'PRIVILEGED' as LabelType, displayName: '实验性', visibleInFilter: true, sortOrder: 10 },
];

const mockVersions: HubSkillVersion[] = [
  {
    id: 'v1',
    skillId: '1',
    version: '1.0.0',
    status: 'PUBLISHED',
    changelog: 'Initial release',
    fileCount: 5,
    totalSize: 10240,
    publishedAt: new Date('2024-01-01'),
    bundleReady: true,
    downloadReady: true,
    createdBy: 'admin',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'v2',
    skillId: '1',
    version: '1.1.0',
    status: 'PUBLISHED',
    changelog: 'Added new features',
    fileCount: 6,
    totalSize: 11264,
    publishedAt: new Date('2024-02-01'),
    bundleReady: true,
    downloadReady: true,
    createdBy: 'admin',
    createdAt: new Date('2024-02-01'),
  },
  {
    id: 'v3',
    skillId: '1',
    version: '2.0.0',
    status: 'DRAFT',
    changelog: 'Major update',
    fileCount: 7,
    totalSize: 12288,
    bundleReady: false,
    downloadReady: false,
    createdBy: 'admin',
    createdAt: new Date('2024-03-01'),
  },
];

const mockFiles: HubSkillFile[] = [
  {
    id: 'f1',
    versionId: 'v1',
    filePath: 'src/main.ts',
    fileSize: 1024,
    contentType: 'text/typescript',
    sha256: 'abc123',
    createdAt: new Date(),
  },
  {
    id: 'f2',
    versionId: 'v1',
    filePath: 'README.md',
    fileSize: 512,
    contentType: 'text/markdown',
    sha256: 'def456',
    createdAt: new Date(),
  },
  {
    id: 'f3',
    versionId: 'v1',
    filePath: 'package.json',
    fileSize: 256,
    contentType: 'application/json',
    sha256: 'ghi789',
    createdAt: new Date(),
  },
];

const mockSkills: HubSkill[] = [
  {
    id: '1',
    tenantId: 'default',
    namespaceId: '1',
    namespaceSlug: 'global',
    slug: 'web-search',
    displayName: 'Web Search',
    summary: 'Search the web for information',
    ownerId: 'admin',
    ownerDisplayName: 'Admin',
    visibility: 'PUBLIC' as SkillVisibility,
    status: 'ACTIVE',
    latestVersion: mockVersions[1],
    downloadCount: 1250,
    starCount: 45,
    ratingAvg: 4.5,
    ratingCount: 30,
    hidden: false,
    tags: ['search', 'web', 'api'],
    labels: [mockLabels[0], mockLabels[2]],
    canManageLifecycle: false,
    canSubmitPromotion: false,
    canInteract: true,
    canReport: true,
    createdBy: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
  },
  {
    id: '2',
    tenantId: 'default',
    namespaceId: '1',
    namespaceSlug: 'global',
    slug: 'code-executor',
    displayName: 'Code Executor',
    summary: 'Execute code in a sandboxed environment',
    ownerId: 'admin',
    ownerDisplayName: 'Admin',
    visibility: 'PUBLIC' as SkillVisibility,
    status: 'ACTIVE',
    latestVersion: mockVersions[0],
    downloadCount: 890,
    starCount: 32,
    ratingAvg: 4.2,
    ratingCount: 18,
    hidden: false,
    tags: ['code', 'execution', 'sandbox'],
    labels: [mockLabels[1]],
    canManageLifecycle: false,
    canSubmitPromotion: false,
    canInteract: true,
    canReport: true,
    createdBy: 'admin',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
  },
  {
    id: '3',
    tenantId: 'default',
    namespaceId: '2',
    namespaceSlug: 'team-a',
    slug: 'data-processor',
    displayName: 'Data Processor',
    summary: 'Process large datasets efficiently',
    ownerId: 'user1',
    ownerDisplayName: 'User One',
    visibility: 'NAMESPACE_ONLY' as SkillVisibility,
    status: 'ACTIVE',
    downloadCount: 120,
    starCount: 8,
    ratingAvg: 4.8,
    ratingCount: 5,
    hidden: false,
    tags: ['data', 'processing', 'etl'],
    labels: [mockLabels[3]],
    canManageLifecycle: false,
    canSubmitPromotion: false,
    canInteract: true,
    canReport: true,
    createdBy: 'user1',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date(),
  },
];

const mockReviews: ReviewTask[] = [
  {
    id: 'r1',
    skillVersionId: 'v3',
    namespaceId: '1',
    status: 'PENDING',
    version: 1,
    submittedBy: 'admin',
    submittedAt: new Date('2024-03-01'),
  },
];

const mockReports: SkillReport[] = [
  {
    id: 'rep1',
    skillId: '2',
    namespaceId: '1',
    reporterId: 'user1',
    reason: 'Inappropriate content',
    details: 'The skill contains inappropriate language',
    status: 'PENDING',
    createdAt: new Date('2024-03-01'),
  },
];

// Mock API functions
const skillHubV2MockApi = {
  // Search & Browse
  search: async (params: {
    q?: string;
    namespace?: string;
    labels?: string[];
    sort?: 'newest' | 'popular' | 'rating';
    page?: number;
    size?: number;
  }): Promise<HubSearchResult> => {
    let filtered = [...mockSkills];
    if (params.q) {
      filtered = filtered.filter(s =>
        s.displayName?.toLowerCase().includes(params.q!.toLowerCase()) ||
        s.summary?.toLowerCase().includes(params.q!.toLowerCase())
      );
    }
    if (params.namespace) {
      filtered = filtered.filter(s => s.namespaceSlug === params.namespace);
    }
    if (params.labels?.length) {
      filtered = filtered.filter(s =>
        params.labels!.some(l => s.labels.some(sl => sl.id === l))
      );
    }
    if (params.sort === 'popular') {
      filtered.sort((a, b) => b.downloadCount - a.downloadCount);
    } else if (params.sort === 'rating') {
      filtered.sort((a, b) => b.ratingAvg - a.ratingAvg);
    } else {
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    const page = params.page || 0;
    const size = params.size || 20;
    const start = page * size;
    const items = filtered.slice(start, start + size);
    return {
      skills: items,
      total: filtered.length,
      page,
      pageSize: size,
    };
  },

  getSkillDetail: async (namespace: string, slug: string): Promise<HubSkill> => {
    const skill = mockSkills.find(s => s.namespaceSlug === namespace && s.slug === slug);
    if (!skill) throw new Error('Skill not found');
    return skill;
  },

  listVersions: async (namespace: string, slug: string, page = 0, size = 20): Promise<PageResponse<HubSkillVersion>> => {
    const skill = mockSkills.find(s => s.namespaceSlug === namespace && s.slug === slug);
    if (!skill) throw new Error('Skill not found');
    const versions = mockVersions.filter(v => v.skillId === skill.id);
    const start = page * size;
    const items = versions.slice(start, start + size);
    return { items, total: versions.length, page, pageSize: size, totalPages: Math.ceil(versions.length / size) };
  },

  getVersionDetail: async (namespace: string, slug: string, version: string): Promise<HubSkillVersion> => {
    const skill = mockSkills.find(s => s.namespaceSlug === namespace && s.slug === slug);
    if (!skill) throw new Error('Skill not found');
    const ver = mockVersions.find(v => v.skillId === skill.id && v.version === version);
    if (!ver) throw new Error('Version not found');
    return ver;
  },

  listFiles: async (namespace: string, slug: string, version: string): Promise<HubSkillFile[]> => {
    return mockFiles;
  },

  getFileContent: async (namespace: string, slug: string, version: string, path: string): Promise<Blob> => {
    return new Blob(['mock file content'], { type: 'text/plain' });
  },

  downloadBundle: async (namespace: string, slug: string, version?: string): Promise<Blob> => {
    return new Blob(['mock bundle content'], { type: 'application/zip' });
  },

  // Publishing & Lifecycle
  publish: async (namespace: string, file: File, visibility: SkillVisibility): Promise<PublishSkillResult> => ({
    skillId: 'new-' + Date.now(),
    namespace,
    slug: file.name.replace('.zip', ''),
    version: '1.0.0',
    status: 'DRAFT',
    fileCount: 1,
    totalSize: file.size,
  }),

  submitReview: async (namespace: string, slug: string, version: string): Promise<SkillLifecycleResponse> => ({
    skillId: '1',
    versionId: 'v3',
    action: 'submit_review',
    newStatus: 'PENDING_REVIEW',
  }),

  confirmPublish: async (namespace: string, slug: string, version: string): Promise<SkillLifecycleResponse> => ({
    skillId: '1',
    versionId: 'v3',
    action: 'confirm_publish',
    newStatus: 'PUBLISHED',
  }),

  rereleaseVersion: async (namespace: string, slug: string, version: string): Promise<SkillLifecycleResponse> => ({
    skillId: '1',
    versionId: 'v3',
    action: 'rerelease',
    newStatus: 'DRAFT',
  }),

  withdrawReview: async (namespace: string, slug: string, version: string): Promise<SkillLifecycleResponse> => ({
    skillId: '1',
    versionId: 'v3',
    action: 'withdraw_review',
    newStatus: 'UPLOADED',
  }),

  deleteVersion: async (namespace: string, slug: string, version: string): Promise<SkillLifecycleResponse> => ({
    skillId: '1',
    versionId: 'v3',
    action: 'delete',
    newStatus: 'DELETED',
  }),

  archiveSkill: async (namespace: string, slug: string): Promise<SkillLifecycleResponse> => ({
    skillId: '1',
    action: 'archive',
    newStatus: 'ARCHIVED',
  }),

  unarchiveSkill: async (namespace: string, slug: string): Promise<SkillLifecycleResponse> => ({
    skillId: '1',
    action: 'unarchive',
    newStatus: 'ACTIVE',
  }),

  // Social
  starSkill: async (skillId: string): Promise<void> => {
    const skill = mockSkills.find(s => s.id === skillId);
    if (skill) skill.starCount++;
  },

  unstarSkill: async (skillId: string): Promise<void> => {
    const skill = mockSkills.find(s => s.id === skillId);
    if (skill) skill.starCount--;
  },

  checkStarred: async (skillId: string): Promise<boolean> => false,

  rateSkill: async (skillId: string, score: number): Promise<void> => {},

  getRating: async (skillId: string): Promise<SkillRatingStatus> => ({ score: 0, hasRated: false }),

  // Labels
  getLabels: async (locale = 'zh-CN'): Promise<HubLabel[]> => mockLabels,

  getSkillLabels: async (skillId: string): Promise<HubLabel[]> => {
    const skill = mockSkills.find(s => s.id === skillId);
    return skill?.labels || [];
  },

  assignLabels: async (skillId: string, labelIds: string[]): Promise<void> => {},

  removeLabel: async (skillId: string, labelId: string): Promise<void> => {},

  createLabel: async (data: { slug: string; type: LabelType; translations: LabelTranslation[] }): Promise<LabelDefinition> => ({
    id: 'new-' + Date.now(),
    tenantId: 'default',
    slug: data.slug,
    type: data.type,
    visibleInFilter: true,
    sortOrder: 0,
    translations: data.translations,
    createdAt: new Date(),
  }),

  updateLabel: async (id: string, data: Partial<LabelDefinition>): Promise<LabelDefinition> => ({
    id,
    tenantId: 'default',
    slug: data.slug || '',
    type: data.type || 'RECOMMENDED',
    visibleInFilter: true,
    sortOrder: 0,
    translations: [],
    createdAt: new Date(),
  }),

  deleteLabel: async (id: string): Promise<void> => {},

  // Tags
  getTags: async (namespace: string, slug: string): Promise<string[]> => {
    const skill = mockSkills.find(s => s.namespaceSlug === namespace && s.slug === slug);
    return skill?.tags || [];
  },

  addTag: async (namespace: string, slug: string, tagName: string): Promise<void> => {},

  removeTag: async (namespace: string, slug: string, tagName: string): Promise<void> => {},

  // Reviews
  submitReviewTask: async (skillVersionId: string): Promise<ReviewTask> => mockReviews[0],

  listReviews: async (params: { status?: string; page?: number; size?: number }): Promise<PageResponse<ReviewTask>> => ({
    items: mockReviews,
    total: mockReviews.length,
    page: 0,
    pageSize: 20,
    totalPages: 1,
  }),

  listPendingReviews: async (namespaceId: string, page = 0, size = 20): Promise<PageResponse<ReviewTask>> => ({
    items: mockReviews,
    total: mockReviews.length,
    page,
    pageSize: size,
    totalPages: 1,
  }),

  listMyReviewSubmissions: async (page = 0, size = 20): Promise<PageResponse<ReviewTask>> => ({
    items: [],
    total: 0,
    page,
    pageSize: size,
    totalPages: 0,
  }),

  getReviewDetail: async (id: string): Promise<ReviewTask> => mockReviews[0],

  approveReview: async (id: string, comment?: string): Promise<ReviewTask> => ({ ...mockReviews[0], status: 'APPROVED' }),

  rejectReview: async (id: string, comment?: string): Promise<ReviewTask> => ({ ...mockReviews[0], status: 'REJECTED' }),

  withdrawReviewTask: async (id: string): Promise<void> => {},

  // Reports
  submitReport: async (namespace: string, slug: string, data: { reason: string; details?: string }): Promise<void> => {},

  listReports: async (params: { status?: string; page?: number; size?: number }): Promise<PageResponse<SkillReport>> => ({
    items: mockReports,
    total: mockReports.length,
    page: 0,
    pageSize: 20,
    totalPages: 1,
  }),

  resolveReport: async (id: string, data: { action: string; comment?: string }): Promise<void> => {},

  // Admin
  hideSkill: async (skillId: string, reason?: string): Promise<void> => {
    const skill = mockSkills.find(s => s.id === skillId);
    if (skill) skill.hidden = true;
  },

  unhideSkill: async (skillId: string): Promise<void> => {
    const skill = mockSkills.find(s => s.id === skillId);
    if (skill) skill.hidden = false;
  },

  yankVersion: async (versionId: string, reason?: string): Promise<void> => {},

  // Namespaces
  listNamespaces: async (): Promise<HubNamespace[]> => mockNamespaces,

  createNamespace: async (data: { slug: string; displayName: string; type: NamespaceType }): Promise<HubNamespace> => ({
    id: 'new-' + Date.now(),
    tenantId: 'default',
    ...data,
    status: 'ACTIVE',
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  getNamespace: async (id: string): Promise<HubNamespace> => mockNamespaces[0],

  listMembers: async (namespaceId: string): Promise<NamespaceMember[]> => [],

  addMember: async (namespaceId: string, userId: string, role: NamespaceRole): Promise<void> => {},

  updateMemberRole: async (namespaceId: string, userId: string, role: NamespaceRole): Promise<void> => {},

  removeMember: async (namespaceId: string, userId: string): Promise<void> => {},

  // Stats
  getStats: async (): Promise<HubStats> => ({
    totalSkills: mockSkills.length,
    totalDownloads: mockSkills.reduce((sum, s) => sum + s.downloadCount, 0),
    totalNamespaces: mockNamespaces.length,
    totalRatings: mockSkills.reduce((sum, s) => sum + s.ratingCount, 0),
  }),

  // Promotion
  submitPromotion: async (data: { sourceSkillId: string; sourceVersionId: string; targetNamespaceId: string }): Promise<{ id: string }> => ({
    id: 'promo-' + Date.now(),
  }),

  listPromotions: async (params: { namespaceId?: string; status?: string; page?: number; pageSize?: number }): Promise<PageResponse<PromotionTask>> => ({
    items: [],
    total: 0,
    page: params.page || 0,
    pageSize: params.pageSize || 20,
    totalPages: 0,
  }),

  approvePromotion: async (id: string, data?: { comment?: string }): Promise<any> => ({
    newSkillId: 'new-' + Date.now(),
    newVersionId: 'v-' + Date.now(),
    targetNamespace: 'global',
    targetSlug: 'promoted-skill',
    targetVersion: '1.0.0',
  }),

  rejectPromotion: async (id: string, data?: { comment?: string }): Promise<void> => {},

  // API Tokens
  getTokens: async (params?: { page?: number; size?: number }): Promise<{ items: any[]; total: number; page: number; size: number }> => ({
    items: [],
    total: 0,
    page: params?.page || 0,
    size: params?.size || 20,
  }),

  createToken: async (data: { name: string; scopes?: string[]; expirationMode?: string; customExpiresAt?: string }): Promise<{ token: string; id: string; name: string; tokenPrefix: string; createdAt: string }> => ({
    token: 'mock-token-' + Date.now() + '-' + Math.random().toString(36).substring(7),
    id: 'token-' + Date.now(),
    name: data.name,
    tokenPrefix: 'mock_' + Math.random().toString(36).substring(2, 10),
    createdAt: new Date().toISOString(),
  }),

  deleteToken: async (id: string): Promise<void> => {},

  updateTokenExpiration: async (id: string, expiresAt?: string): Promise<void> => {},
};

export { skillHubV2MockApi };
