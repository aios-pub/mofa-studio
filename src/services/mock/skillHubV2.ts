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
  TenantUser,
} from '@/types/skill';

// Mock data
const mockNamespaces: HubNamespace[] = [
  {
    id: '1',
    tenant_id: 'default',
    slug: 'global',
    display_name: 'Global Namespace',
    type: 'GLOBAL' as NamespaceType,
    description: 'Global skill namespace for all users',
    status: 'ACTIVE',
    member_count: 100,
    skill_count: 50,
    created_by: 'system',
    created_at: new Date('2024-01-01'),
    updated_at: new Date(),
  },
  {
    id: '2',
    tenant_id: 'default',
    slug: 'team-a',
    display_name: 'Team A',
    type: 'TEAM' as NamespaceType,
    description: 'Team A namespace',
    status: 'ACTIVE',
    member_count: 10,
    skill_count: 5,
    created_by: 'admin',
    created_at: new Date('2024-02-01'),
    updated_at: new Date(),
  },
];

const mockLabels: HubLabel[] = [
  { id: '1', slug: 'verified', type: 'RECOMMENDED' as LabelType, display_name: '已认证', visible_in_filter: true, sort_order: 1 },
  { id: '2', slug: 'official', type: 'RECOMMENDED' as LabelType, display_name: '官方', visible_in_filter: true, sort_order: 2 },
  { id: '3', slug: 'popular', type: 'RECOMMENDED' as LabelType, display_name: '热门', visible_in_filter: true, sort_order: 3 },
  { id: '4', slug: 'experimental', type: 'PRIVILEGED' as LabelType, display_name: '实验性', visible_in_filter: true, sort_order: 10 },
];

const mockVersions: HubSkillVersion[] = [
  {
    id: 'v1',
    skill_id: '1',
    version: '1.0.0',
    status: 'PUBLISHED',
    changelog: 'Initial release',
    file_count: 5,
    total_size: 10240,
    published_at: new Date('2024-01-01'),
    bundle_ready: true,
    download_ready: true,
    created_by: 'admin',
    created_at: new Date('2024-01-01'),
  },
  {
    id: 'v2',
    skill_id: '1',
    version: '1.1.0',
    status: 'PUBLISHED',
    changelog: 'Added new features',
    file_count: 6,
    total_size: 11264,
    published_at: new Date('2024-02-01'),
    bundle_ready: true,
    download_ready: true,
    created_by: 'admin',
    created_at: new Date('2024-02-01'),
  },
  {
    id: 'v3',
    skill_id: '1',
    version: '2.0.0',
    status: 'DRAFT',
    changelog: 'Major update',
    file_count: 7,
    total_size: 12288,
    bundle_ready: false,
    download_ready: false,
    created_by: 'admin',
    created_at: new Date('2024-03-01'),
  },
];

const mockFiles: HubSkillFile[] = [
  {
    id: 'f1',
    version_id: 'v1',
    file_path: 'src/main.ts',
    file_size: 1024,
    content_type: 'text/typescript',
    sha256: 'abc123',
    created_at: new Date(),
  },
  {
    id: 'f2',
    version_id: 'v1',
    file_path: 'README.md',
    file_size: 512,
    content_type: 'text/markdown',
    sha256: 'def456',
    created_at: new Date(),
  },
  {
    id: 'f3',
    version_id: 'v1',
    file_path: 'package.json',
    file_size: 256,
    content_type: 'application/json',
    sha256: 'ghi789',
    created_at: new Date(),
  },
];

const mockSkills: HubSkill[] = [
  {
    id: '1',
    tenant_id: 'default',
    namespace_id: '1',
    namespace_slug: 'global',
    slug: 'web-search',
    display_name: 'Web Search',
    summary: 'Search the web for information',
    owner_id: 'admin',
    owner_display_name: 'Admin',
    visibility: 'PUBLIC' as SkillVisibility,
    status: 'ACTIVE',
    latest_version: mockVersions[1],
    download_count: 1250,
    star_count: 45,
    rating_avg: 4.5,
    rating_count: 30,
    hidden: false,
    tags: ['search', 'web', 'api'],
    labels: [mockLabels[0], mockLabels[2]],
    can_manage_lifecycle: false,
    can_submit_promotion: false,
    can_interact: true,
    can_report: true,
    created_by: 'admin',
    created_at: new Date('2024-01-01'),
    updated_at: new Date(),
  },
  {
    id: '2',
    tenant_id: 'default',
    namespace_id: '1',
    namespace_slug: 'global',
    slug: 'code-executor',
    display_name: 'Code Executor',
    summary: 'Execute code in a sandboxed environment',
    owner_id: 'admin',
    owner_display_name: 'Admin',
    visibility: 'PUBLIC' as SkillVisibility,
    status: 'ACTIVE',
    latest_version: mockVersions[0],
    download_count: 890,
    star_count: 32,
    rating_avg: 4.2,
    rating_count: 18,
    hidden: false,
    tags: ['code', 'execution', 'sandbox'],
    labels: [mockLabels[1]],
    can_manage_lifecycle: false,
    can_submit_promotion: false,
    can_interact: true,
    can_report: true,
    created_by: 'admin',
    created_at: new Date('2024-01-15'),
    updated_at: new Date(),
  },
  {
    id: '3',
    tenant_id: 'default',
    namespace_id: '2',
    namespace_slug: 'team-a',
    slug: 'data-processor',
    display_name: 'Data Processor',
    summary: 'Process large datasets efficiently',
    owner_id: 'user1',
    owner_display_name: 'User One',
    visibility: 'NAMESPACE_ONLY' as SkillVisibility,
    status: 'ACTIVE',
    download_count: 120,
    star_count: 8,
    rating_avg: 4.8,
    rating_count: 5,
    hidden: false,
    tags: ['data', 'processing', 'etl'],
    labels: [mockLabels[3]],
    can_manage_lifecycle: false,
    can_submit_promotion: false,
    can_interact: true,
    can_report: true,
    created_by: 'user1',
    created_at: new Date('2024-02-01'),
    updated_at: new Date(),
  },
];

const mockReviews: ReviewTask[] = [
  {
    id: 'r1',
    skill_version_id: 'v3',
    namespace_id: '1',
    status: 'PENDING',
    version: 1,
    submit_user_id: 'admin',
    submitted_at: new Date('2024-03-01'),
  },
];

const mockReports: SkillReport[] = [
  {
    id: 'rep1',
    skill_id: '2',
    namespace_id: '1',
    reporter_id: 'user1',
    reason: 'Inappropriate content',
    details: 'The skill contains inappropriate language',
    status: 'PENDING',
    created_at: new Date('2024-03-01'),
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
        s.display_name?.toLowerCase().includes(params.q!.toLowerCase()) ||
        s.summary?.toLowerCase().includes(params.q!.toLowerCase())
      );
    }
    if (params.namespace) {
      filtered = filtered.filter(s => s.namespace_slug === params.namespace);
    }
    if (params.labels?.length) {
      filtered = filtered.filter(s =>
        params.labels!.some(l => s.labels.some(sl => sl.id === l))
      );
    }
    if (params.sort === 'popular') {
      filtered.sort((a, b) => b.download_count - a.download_count);
    } else if (params.sort === 'rating') {
      filtered.sort((a, b) => b.rating_avg - a.rating_avg);
    } else {
      filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    }
    const page = params.page || 0;
    const size = params.size || 20;
    const start = page * size;
    const items = filtered.slice(start, start + size);
    return {
      skills: items,
      total: filtered.length,
      page,
      page_size: size,
    };
  },

  getSkillDetail: async (namespace: string, slug: string): Promise<HubSkill> => {
    const skill = mockSkills.find(s => s.namespace_slug === namespace && s.slug === slug);
    if (!skill) throw new Error('Skill not found');
    return skill;
  },

  listVersions: async (namespace: string, slug: string, page = 0, size = 20): Promise<PageResponse<HubSkillVersion>> => {
    const skill = mockSkills.find(s => s.namespace_slug === namespace && s.slug === slug);
    if (!skill) throw new Error('Skill not found');
    const versions = mockVersions.filter(v => v.skill_id === skill.id);
    const start = page * size;
    const items = versions.slice(start, start + size);
    return { items, total: versions.length, page, page_size: size, total_pages: Math.ceil(versions.length / size) };
  },

  getVersionDetail: async (namespace: string, slug: string, version: string): Promise<HubSkillVersion> => {
    const skill = mockSkills.find(s => s.namespace_slug === namespace && s.slug === slug);
    if (!skill) throw new Error('Skill not found');
    const ver = mockVersions.find(v => v.skill_id === skill.id && v.version === version);
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
    skill_id: 'new-' + Date.now(),
    namespace,
    slug: file.name.replace('.zip', ''),
    version: '1.0.0',
    status: 'DRAFT',
    file_count: 1,
    total_size: file.size,
  }),

  submitReview: async (namespace: string, slug: string, version: string): Promise<SkillLifecycleResponse> => ({
    skill_id: '1',
    version_id: 'v3',
    action: 'submit_review',
    newStatus: 'PENDING_REVIEW',
  }),

  confirmPublish: async (namespace: string, slug: string, version: string): Promise<SkillLifecycleResponse> => ({
    skill_id: '1',
    version_id: 'v3',
    action: 'confirm_publish',
    newStatus: 'PUBLISHED',
  }),

  rereleaseVersion: async (namespace: string, slug: string, version: string): Promise<SkillLifecycleResponse> => ({
    skill_id: '1',
    version_id: 'v3',
    action: 'rerelease',
    newStatus: 'DRAFT',
  }),

  withdrawReview: async (namespace: string, slug: string, version: string): Promise<SkillLifecycleResponse> => ({
    skill_id: '1',
    version_id: 'v3',
    action: 'withdraw_review',
    newStatus: 'UPLOADED',
  }),

  deleteVersion: async (namespace: string, slug: string, version: string): Promise<SkillLifecycleResponse> => ({
    skill_id: '1',
    version_id: 'v3',
    action: 'delete',
    newStatus: 'DELETED',
  }),

  archiveSkill: async (_namespace: string, _slug: string): Promise<SkillLifecycleResponse> => ({
    skill_id: '1',
    action: 'archive',
    new_status: 'ARCHIVED',
  }),

  unarchiveSkill: async (_namespace: string, _slug: string): Promise<SkillLifecycleResponse> => ({
    skill_id: '1',
    action: 'unarchive',
    new_status: 'ACTIVE',
  }),

  // Social
  starSkill: async (skill_id: string): Promise<void> => {
    const skill = mockSkills.find(s => s.id === skill_id);
    if (skill) skill.star_count++;
  },

  unstarSkill: async (skill_id: string): Promise<void> => {
    const skill = mockSkills.find(s => s.id === skill_id);
    if (skill) skill.star_count--;
  },

  checkStarred: async (_skill_id: string): Promise<boolean> => false,

  rateSkill: async (_skill_id: string, _score: number): Promise<void> => {},

  getRating: async (_skill_id: string): Promise<SkillRatingStatus> => ({ score: 0, has_rated: false }),

  // Labels
  getLabels: async (_locale = 'zh-CN'): Promise<HubLabel[]> => mockLabels,

  getSkillLabels: async (_skill_id: string): Promise<HubLabel[]> => {
    // const skill = mockSkills.find(s => s.id === skill_id);
    return [];
  },

  assignLabels: async (_skill_id: string, _labelIds: string[]): Promise<void> => {},

  removeLabel: async (_skill_id: string, _labelId: string): Promise<void> => {},

  createLabel: async (data: { slug: string; type: LabelType; translations: LabelTranslation[] }): Promise<LabelDefinition> => ({
    id: 'new-' + Date.now(),
    tenant_id: 'default',
    slug: data.slug,
    type: data.type,
    visible_in_filter: true,
    sort_order: 0,
    translations: data.translations,
    created_at: new Date(),
  }),

  updateLabel: async (id: string, data: Partial<LabelDefinition>): Promise<LabelDefinition> => ({
    id,
    tenant_id: 'default',
    slug: data.slug || '',
    type: data.type || 'RECOMMENDED',
    visible_in_filter: true,
    sort_order: 0,
    translations: [],
    created_at: new Date(),
  }),

  deleteLabel: async (_id: string): Promise<void> => {},

  // Tags
  getTags: async (_namespace: string, _slug: string): Promise<string[]> => {
    // const skill = mockSkills.find(s => s.namespace_slug === namespace && s.slug === slug);
    return [];
  },

  addTag: async (_namespace: string, _slug: string, _tagName: string): Promise<void> => {},

  removeTag: async (_namespace: string, _slug: string, _tagName: string): Promise<void> => {},

  // Reviews
  submitReviewTask: async (_skill_version_id: string): Promise<ReviewTask> => mockReviews[0],

  listReviews: async (_params: { status?: string; page?: number; size?: number }): Promise<PageResponse<ReviewTask>> => ({
    items: mockReviews,
    total: mockReviews.length,
    page: 0,
    page_size: 20,
    total_pages: 1,
  }),

  listPendingReviews: async (_namespace_id: string, _page = 0, _size = 20): Promise<PageResponse<ReviewTask>> => ({
    items: mockReviews,
    total: mockReviews.length,
    page,
    page_size: size,
    total_pages: 1,
  }),

  listMyReviewSubmissions: async (_page = 0, _size = 20): Promise<PageResponse<ReviewTask>> => ({
    items: [],
    total: 0,
    page,
    page_size: size,
    total_pages: 0,
  }),

  getReviewDetail: async (_id: string): Promise<ReviewTask> => mockReviews[0],

  approveReview: async (_id: string, _comment?: string): Promise<ReviewTask> => ({ ...mockReviews[0], status: 'APPROVED' }),

  rejectReview: async (_id: string, _comment?: string): Promise<ReviewTask> => ({ ...mockReviews[0], status: 'REJECTED' }),

  withdrawReviewTask: async (_id: string): Promise<void> => {},

  // Reports
  submitReport: async (_namespace: string, _slug: string, _data: { reason: string; details?: string }): Promise<void> => {},

  listReports: async (_params: { status?: string; page?: number; size?: number }): Promise<PageResponse<SkillReport>> => ({
    items: mockReports,
    total: mockReports.length,
    page: 0,
    page_size: 20,
    total_pages: 1,
  }),

  resolveReport: async (_id: string, _data: { action: string; comment?: string }): Promise<void> => {},

  // Admin
  hideSkill: async (_skill_id: string, _reason?: string): Promise<void> => {
    // const skill = mockSkills.find(s => s.id === skill_id);
    // if (skill) skill.hidden = true;
  },

  unhideSkill: async (_skill_id: string): Promise<void> => {
    // const skill = mockSkills.find(s => s.id === skill_id);
    // if (skill) skill.hidden = false;
  },

  yankVersion: async (_version_id: string, _reason?: string): Promise<void> => {},

  // Namespaces
  listNamespaces: async (): Promise<HubNamespace[]> => mockNamespaces,

  createNamespace: async (_data: { slug: string; display_name: string; type: NamespaceType }): Promise<HubNamespace> => ({
    id: 'new-' + Date.now(),
    tenant_id: 'default',
    ...data,
    status: 'ACTIVE',
    created_by: 'admin',
    created_at: new Date(),
    updated_at: new Date(),
  }),

  getNamespace: async (_id: string): Promise<HubNamespace> => mockNamespaces[0],

  listMembers: async (_namespace_id: string): Promise<NamespaceMember[]> => [],

  addMember: async (_namespace_id: string, _userId: string, _role: NamespaceRole): Promise<void> => {},

  updateMemberRole: async (_namespace_id: string, _userId: string, _role: NamespaceRole): Promise<void> => {},

  removeMember: async (_namespace_id: string, _userId: string): Promise<void> => {},

  listTenantUsers: async (): Promise<TenantUser[]> => {
    return [
      { id: 'user-1', username: 'admin', email: 'admin@example.com', nickname: '管理员' },
      { id: 'user-2', username: 'developer', email: 'dev@example.com', nickname: '开发者' },
      { id: 'user-3', username: 'tester', email: 'tester@example.com', nickname: '测试员' },
      { id: 'user-4', username: 'reviewer', email: 'reviewer@example.com', nickname: '审核员' },
    ];
  },

  // Stats
  getStats: async (): Promise<HubStats> => ({
    total_skills: mockSkills.length,
    total_downloads: mockSkills.reduce((sum, s) => sum + s.download_count, 0),
    total_namespaces: mockNamespaces.length,
    total_ratings: mockSkills.reduce((sum, s) => sum + s.rating_count, 0),
  }),

  // Promotion
  submitPromotion: async (_data: { source_skill_id: string; source_version_id: string; target_namespace_id: string }): Promise<{ id: string }> => ({
    id: 'promo-' + Date.now(),
  }),

  listPromotions: async (params: { namespace_id?: string; status?: string; page?: number; page_size?: number }): Promise<PageResponse<PromotionTask>> => ({
    items: [],
    total: 0,
    page: params.page || 0,
    page_size: params.page_size || 20,
    total_pages: 0,
  }),

  approvePromotion: async (_id: string, _data?: { comment?: string }): Promise<any> => ({
    new_skill_id: 'new-' + Date.now(),
    new_version_id: 'v-' + Date.now(),
    target_namespace: 'global',
    target_slug: 'promoted-skill',
    target_version: '1.0.0',
  }),

  rejectPromotion: async (_id: string, _data?: { comment?: string }): Promise<void> => {},

  // API Tokens
  getTokens: async (params?: { page?: number; size?: number }): Promise<{ items: any[]; total: number; page: number; size: number }> => ({
    items: [],
    total: 0,
    page: params?.page || 0,
    size: params?.size || 20,
  }),

  createToken: async (_data: { name: string; scopes?: string[]; expirationMode?: string; customExpiresAt?: string }): Promise<{ token: string; id: string; name: string; tokenPrefix: string; created_at: string }> => ({
    token: 'mock-token-' + Date.now() + '-' + Math.random().toString(36).substring(7),
    id: 'token-' + Date.now(),
    name: 'mock-token',
    tokenPrefix: 'mock_' + Math.random().toString(36).substring(2, 10),
    created_at: new Date().toISOString(),
  }),

  deleteToken: async (_id: string): Promise<void> => {},

  updateTokenExpiration: async (_id: string, _expiresAt?: string): Promise<void> => {},
};

export { skillHubV2MockApi };
