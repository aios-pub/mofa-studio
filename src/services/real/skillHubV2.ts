/**
 * Skill Hub V2 真实 API
 * 后端端点: /api/skill-hub/...
 */

import { apiClient } from "../api/apiClient";
import type {
  HubSkill,
  HubSkillVersion,
  HubSkillFile,
  HubNamespace,
  NamespaceMember,
  HubLabel,
  LabelDefinition,
  LabelTranslation,
  SkillRating,
  SkillRatingStatus,
  ReviewTask,
  SkillReport,
  HubSearchResult,
  PublishSkillResult,
  HubStats,
  PageResponse,
  SkillLifecycleResponse,
  SkillVisibility,
  NamespaceType,
  NamespaceRole,
  LabelType,
  PromotionTask,
  ApiToken,
  TenantUser,
} from "@/types/skill";

// ===== Search & Browse =====
const search = async (params: {
  q?: string;
  namespace?: string;
  labels?: string[];
  sort?: "newest" | "popular" | "rating";
  page?: number;
  size?: number;
}): Promise<HubSearchResult> => {
  const { labels, ...rest } = params;
  return apiClient.get<HubSearchResult>("/api/skill-hub/search", {
    params: {
      ...rest,
      label: labels,
      page_size: params.size,
    },
  });
};

const getSkillDetail = async (
  namespace: string,
  slug: string,
): Promise<HubSkill> => {
  return apiClient.get<HubSkill>(`/api/skill-hub/${namespace}/${slug}`);
};

const listVersions = async (
  namespace: string,
  slug: string,
  page = 0,
  size = 20,
): Promise<PageResponse<HubSkillVersion>> => {
  return apiClient.get<PageResponse<HubSkillVersion>>(
    `/api/skill-hub/${namespace}/${slug}/versions`,
    { params: { page, page_size: size } },
  );
};

const getVersionDetail = async (
  namespace: string,
  slug: string,
  version: string,
): Promise<HubSkillVersion> => {
  return apiClient.get<HubSkillVersion>(
    `/api/skill-hub/${namespace}/${slug}/versions/${version}`,
  );
};

const listFiles = async (
  namespace: string,
  slug: string,
  version: string,
): Promise<HubSkillFile[]> => {
  return apiClient.get<HubSkillFile[]>(
    `/api/skill-hub/${namespace}/${slug}/versions/${version}/files`,
  );
};

const getFileContent = async (
  namespace: string,
  slug: string,
  version: string,
  path: string,
): Promise<Blob> => {
  return apiClient.get<Blob>(
    `/api/skill-hub/${namespace}/${slug}/versions/${version}/file`,
    {
      params: { path },
      responseType: "blob",
    },
  );
};

const downloadBundle = async (
  namespace: string,
  slug: string,
  version?: string,
): Promise<Blob> => {
  const url = version
    ? `/api/skill-hub/${namespace}/${slug}/versions/${version}/download`
    : `/api/skill-hub/${namespace}/${slug}/download`;
  return apiClient.get<Blob>(url, { responseType: "blob" });
};

// ===== Publishing & Lifecycle =====
const publish = async (
  namespace: string,
  file: File,
  visibility: SkillVisibility,
  confirmWarnings = false,
): Promise<PublishSkillResult> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("visibility", visibility);
  formData.append("confirm_warnings", String(confirmWarnings));

  console.log('[skillHubV2] Publishing skill:', {
    namespace,
    fileName: file.name,
    fileSize: file.size,
    fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
    visibility,
    confirmWarnings,
  });

  // Debug: Check FormData content
  console.log('[skillHubV2] FormData entries:', Array.from(formData.entries()).map(([key, value]) => {
    if (value instanceof File) {
      return [key, `File: ${value.name}, size: ${value.size}, type: ${value.type}`];
    }
    return [key, value];
  }));

  return apiClient.post<PublishSkillResult>(
    `/api/skill-hub/${namespace}/publish`,
    formData,
  );
};

const submitReview = async (
  namespace: string,
  slug: string,
  version: string,
  targetVisibility?: SkillVisibility,
): Promise<SkillLifecycleResponse> => {
  return apiClient.post<SkillLifecycleResponse>(
    `/api/skill-hub/${namespace}/${slug}/submit-review`,
    { version, target_visibility: targetVisibility },
  );
};

const confirmPublish = async (
  namespace: string,
  slug: string,
  version: string,
): Promise<SkillLifecycleResponse> => {
  return apiClient.post<SkillLifecycleResponse>(
    `/api/skill-hub/${namespace}/${slug}/confirm-publish`,
    { version },
  );
};

const rereleaseVersion = async (
  namespace: string,
  slug: string,
  version: string,
  data?: { changelog?: string; visibility?: SkillVisibility },
): Promise<SkillLifecycleResponse> => {
  return apiClient.post<SkillLifecycleResponse>(
    `/api/skill-hub/${namespace}/${slug}/versions/${version}/rerelease`,
    data,
  );
};

const withdrawReview = async (
  namespace: string,
  slug: string,
  version: string,
): Promise<SkillLifecycleResponse> => {
  return apiClient.post<SkillLifecycleResponse>(
    `/api/skill-hub/${namespace}/${slug}/versions/${version}/withdraw-review`,
  );
};

const deleteVersion = async (
  namespace: string,
  slug: string,
  version: string,
): Promise<SkillLifecycleResponse> => {
  return apiClient.delete<SkillLifecycleResponse>(
    `/api/skill-hub/${namespace}/${slug}/versions/${version}`,
  );
};

const archiveSkill = async (
  namespace: string,
  slug: string,
): Promise<SkillLifecycleResponse> => {
  return apiClient.post<SkillLifecycleResponse>(
    `/api/skill-hub/${namespace}/${slug}/archive`,
  );
};

const unarchiveSkill = async (
  namespace: string,
  slug: string,
): Promise<SkillLifecycleResponse> => {
  return apiClient.post<SkillLifecycleResponse>(
    `/api/skill-hub/${namespace}/${slug}/unarchive`,
  );
};

// ===== Social =====
const starSkill = async (skillId: string): Promise<void> => {
  return apiClient.put<void>(`/api/skill-hub/skills/${skillId}/star`);
};

const unstarSkill = async (skillId: string): Promise<void> => {
  return apiClient.delete<void>(`/api/skill-hub/skills/${skillId}/star`);
};

const checkStarred = async (skillId: string): Promise<boolean> => {
  return apiClient.get<boolean>(`/api/skill-hub/skills/${skillId}/star`);
};

const rateSkill = async (skillId: string, score: number): Promise<void> => {
  return apiClient.put<void>(`/api/skill-hub/skills/${skillId}/rating`, {
    score,
  });
};

const getRating = async (skillId: string): Promise<SkillRatingStatus> => {
  return apiClient.get<SkillRatingStatus>(
    `/api/skill-hub/skills/${skillId}/rating`,
  );
};

// ===== Labels =====
const getLabels = async (locale = "zh-CN"): Promise<HubLabel[]> => {
  return apiClient.get<HubLabel[]>("/api/skill-hub/labels", {
    params: { locale },
  });
};

const getSkillLabels = async (skillId: string): Promise<HubLabel[]> => {
  return apiClient.get<HubLabel[]>(`/api/skill-hub/skills/${skillId}/labels`);
};

const assignLabels = async (
  skillId: string,
  labelIds: string[],
): Promise<void> => {
  return apiClient.post<void>(`/api/skill-hub/skills/${skillId}/labels`, {
    label_ids: labelIds,
  });
};

const removeLabel = async (skillId: string, labelId: string): Promise<void> => {
  return apiClient.delete<void>(
    `/api/skill-hub/skills/${skillId}/labels/${labelId}`,
  );
};

// Admin label management
const createLabel = async (data: {
  slug: string;
  type: LabelType;
  translations: LabelTranslation[];
}): Promise<LabelDefinition> => {
  return apiClient.post<LabelDefinition>("/api/skill-hub/admin/labels", data);
};

const updateLabel = async (
  id: string,
  data: Partial<LabelDefinition>,
): Promise<LabelDefinition> => {
  return apiClient.put<LabelDefinition>(
    `/api/skill-hub/admin/labels/${id}`,
    data,
  );
};

const deleteLabel = async (id: string): Promise<void> => {
  return apiClient.delete<void>(`/api/skill-hub/admin/labels/${id}`);
};

// ===== Tags =====
const getTags = async (namespace: string, slug: string): Promise<string[]> => {
  return apiClient.get<string[]>(`/api/skill-hub/${namespace}/${slug}/tags`);
};

const addTag = async (
  namespace: string,
  slug: string,
  tagName: string,
): Promise<void> => {
  return apiClient.post<void>(`/api/skill-hub/${namespace}/${slug}/tags`, {
    tag_name: tagName,
  });
};

const removeTag = async (
  namespace: string,
  slug: string,
  tagName: string,
): Promise<void> => {
  return apiClient.delete<void>(
    `/api/skill-hub/${namespace}/${slug}/tags/${tagName}`,
  );
};

// ===== Reviews =====
const submitReviewTask = async (
  skillVersionId: string,
): Promise<ReviewTask> => {
  return apiClient.post<ReviewTask>("/api/skill-hub/reviews", {
    skill_version_id: skillVersionId,
  });
};

const listReviews = async (params: {
  status?: string;
  namespaceId?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<ReviewTask>> => {
  return apiClient.get<PageResponse<ReviewTask>>("/api/skill-hub/reviews", {
    params: {
      status: params.status,
      namespace_id: params.namespaceId,
      page: params.page,
      page_size: params.size,
    },
  });
};

const listPendingReviews = async (
  namespaceId: string,
  page = 0,
  size = 20,
): Promise<PageResponse<ReviewTask>> => {
  return apiClient.get<PageResponse<ReviewTask>>(
    "/api/skill-hub/reviews/pending",
    {
      params: { namespace_id: namespaceId, page, page_size: size },
    },
  );
};

const listMyReviewSubmissions = async (
  page = 0,
  size = 20,
): Promise<PageResponse<ReviewTask>> => {
  return apiClient.get<PageResponse<ReviewTask>>(
    "/api/skill-hub/reviews/my-submissions",
    {
      params: { page, page_size: size },
    },
  );
};

const getReviewDetail = async (id: string): Promise<ReviewTask> => {
  return apiClient.get<ReviewTask>(`/api/skill-hub/reviews/${id}`);
};

const approveReview = async (
  id: string,
  comment?: string,
): Promise<ReviewTask> => {
  return apiClient.post<ReviewTask>(`/api/skill-hub/reviews/${id}/approve`, {
    comment,
  });
};

const rejectReview = async (
  id: string,
  comment?: string,
): Promise<ReviewTask> => {
  return apiClient.post<ReviewTask>(`/api/skill-hub/reviews/${id}/reject`, {
    comment,
  });
};

const withdrawReviewTask = async (id: string): Promise<void> => {
  return apiClient.post<void>(`/api/skill-hub/reviews/${id}/withdraw`);
};

// ===== Reports =====
const submitReport = async (
  namespace: string,
  slug: string,
  data: { reason: string; details?: string },
): Promise<void> => {
  return apiClient.post<void>(
    `/api/skill-hub/${namespace}/${slug}/reports`,
    data,
  );
};

const listReports = async (params: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<SkillReport>> => {
  return apiClient.get<PageResponse<SkillReport>>(
    "/api/skill-hub/admin/reports",
    {
      params: {
        status: params.status,
        page: params.page,
        page_size: params.size,
      },
    },
  );
};

const resolveReport = async (
  id: string,
  data: {
    action: string;
    comment?: string;
  },
): Promise<void> => {
  return apiClient.post<void>(
    `/api/skill-hub/admin/reports/${id}/resolve`,
    data,
  );
};

// ===== Admin =====
const hideSkill = async (skillId: string, reason?: string): Promise<void> => {
  return apiClient.post<void>(`/api/skill-hub/admin/skills/${skillId}/hide`, {
    reason,
  });
};

const unhideSkill = async (skillId: string): Promise<void> => {
  return apiClient.post<void>(`/api/skill-hub/admin/skills/${skillId}/unhide`);
};

const yankVersion = async (
  versionId: string,
  reason?: string,
): Promise<void> => {
  return apiClient.post<void>(
    `/api/skill-hub/admin/skills/versions/${versionId}/yank`,
    { reason },
  );
};

// ===== Namespaces =====
const listNamespaces = async (): Promise<HubNamespace[]> => {
  return apiClient.get<HubNamespace[]>("/api/skill-hub/namespaces");
};

const createNamespace = async (data: {
  slug: string;
  displayName: string;
  type: NamespaceType;
}): Promise<HubNamespace> => {
  return apiClient.post<HubNamespace>("/api/skill-hub/namespaces", {
    slug: data.slug,
    display_name: data.displayName,
    type: data.type,
  });
};

const getNamespace = async (id: string): Promise<HubNamespace> => {
  return apiClient.get<HubNamespace>(`/api/skill-hub/namespaces/${id}`);
};

const listMembers = async (namespaceId: string): Promise<NamespaceMember[]> => {
  return apiClient.get<NamespaceMember[]>(
    `/api/skill-hub/namespaces/${namespaceId}/members`,
  );
};

const addMember = async (
  namespaceId: string,
  userId: string,
  role: NamespaceRole,
): Promise<void> => {
  return apiClient.post<void>(
    `/api/skill-hub/namespaces/${namespaceId}/members`,
    { user_id: userId, role },
  );
};

const updateMemberRole = async (
  namespaceId: string,
  userId: string,
  role: NamespaceRole,
): Promise<void> => {
  return apiClient.put<void>(
    `/api/skill-hub/namespaces/${namespaceId}/members/${userId}`,
    { role },
  );
};

const removeMember = async (
  namespaceId: string,
  userId: string,
): Promise<void> => {
  return apiClient.delete<void>(
    `/api/skill-hub/namespaces/${namespaceId}/members/${userId}`,
  );
};

const listTenantUsers = async (): Promise<TenantUser[]> => {
  return apiClient.get<TenantUser[]>("/api/skill-hub/users/tenant");
};

// ===== Promotion =====
const submitPromotion = async (data: {
  sourceSkillId: string;
  sourceVersionId: string;
  targetNamespaceId: string;
}): Promise<{ id: string }> => {
  return apiClient.post<{ id: string }>("/api/skill-hub/promotions", {
    source_skill_id: data.sourceSkillId,
    source_version_id: data.sourceVersionId,
    target_namespace_id: data.targetNamespaceId,
  });
};

const listPromotions = async (params: {
  namespaceId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PageResponse<PromotionTask>> => {
  return apiClient.get<PageResponse<PromotionTask>>(
    "/api/skill-hub/promotions",
    {
      params: {
        namespace_id: params.namespaceId,
        status: params.status,
        page: params.page,
        page_size: params.pageSize,
      },
    },
  );
};

const approvePromotion = async (
  id: string,
  data?: {
    comment?: string;
  },
): Promise<{
  new_skill_id?: string;
  new_version_id: string;
  target_namespace: string;
  target_slug: string;
  target_version: string;
}> => {
  return apiClient.post<{
    new_skill_id?: string;
    new_version_id: string;
    target_namespace: string;
    target_slug: string;
    target_version: string;
  }>(`/api/skill-hub/promotions/${id}/approve`, data);
};

const rejectPromotion = async (
  id: string,
  data?: {
    comment?: string;
  },
): Promise<void> => {
  return apiClient.post<void>(`/api/skill-hub/promotions/${id}/reject`, data);
};

// ===== API Tokens =====
const getTokens = async (params?: {
  page?: number;
  size?: number;
}): Promise<{
  items: ApiToken[];
  total: number;
  page: number;
  size: number;
}> => {
  return apiClient.get("/api/skill-hub/tokens", {
    params: {
      page: params?.page,
      page_size: params?.size,
    },
  });
};

const createToken = async (data: {
  name: string;
  scopes?: string[];
  expirationMode?: "never" | "30d" | "90d" | "180d" | "365d" | "custom";
  customExpiresAt?: string;
}): Promise<{
  token: string;
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
}> => {
  return apiClient.post("/api/skill-hub/tokens", {
    name: data.name,
    scopes: data.scopes,
    expiration_mode: data.expirationMode,
    custom_expires_at: data.customExpiresAt,
  });
};

const deleteToken = async (id: string): Promise<void> => {
  return apiClient.delete<void>(`/api/skill-hub/tokens/${id}`);
};

const updateTokenExpiration = async (
  id: string,
  expiresAt?: string,
): Promise<void> => {
  return apiClient.put<void>(`/api/skill-hub/tokens/${id}/expiration`, {
    expires_at: expiresAt,
  });
};

// ===== Stats =====
const getStats = async (): Promise<HubStats> => {
  return apiClient.get<HubStats>("/api/skill-hub/stats");
};

// Export the API
export const skillHubV2RealApi = {
  // Search & Browse
  search,
  getSkillDetail,
  listVersions,
  getVersionDetail,
  listFiles,
  getFileContent,
  downloadBundle,

  // Publishing & Lifecycle
  publish,
  submitReview,
  confirmPublish,
  rereleaseVersion,
  withdrawReview,
  deleteVersion,
  archiveSkill,
  unarchiveSkill,

  // Social
  starSkill,
  unstarSkill,
  checkStarred,
  rateSkill,
  getRating,

  // Labels
  getLabels,
  getSkillLabels,
  assignLabels,
  removeLabel,
  createLabel,
  updateLabel,
  deleteLabel,

  // Tags
  getTags,
  addTag,
  removeTag,

  // Reviews
  submitReviewTask,
  listReviews,
  listPendingReviews,
  listMyReviewSubmissions,
  getReviewDetail,
  approveReview,
  rejectReview,
  withdrawReviewTask,

  // Reports
  submitReport,
  listReports,
  resolveReport,

  // Admin
  hideSkill,
  unhideSkill,
  yankVersion,

  // Namespaces
  listNamespaces,
  createNamespace,
  getNamespace,
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
  listTenantUsers,

  // Promotion
  submitPromotion,
  listPromotions,
  approvePromotion,
  rejectPromotion,

  // API Tokens
  getTokens,
  createToken,
  deleteToken,
  updateTokenExpiration,

  // Stats
  getStats,
};

// Export types
export type {
  HubSkill,
  HubSkillVersion,
  HubSkillFile,
  HubNamespace,
  NamespaceMember,
  HubLabel,
  LabelDefinition,
  LabelTranslation,
  SkillRating,
  SkillRatingStatus,
  ReviewTask,
  SkillReport,
  HubSearchResult,
  PublishSkillResult,
  HubStats,
  PageResponse,
  SkillLifecycleResponse,
  SkillVisibility,
  NamespaceType,
  NamespaceRole,
  LabelType,
  TenantUser,
};
