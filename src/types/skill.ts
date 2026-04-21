/**
 * Skill Hub 类型定义
 */

// ===== 基础类型 =====

export interface SkillParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  default?: unknown;
  defaultValue?: unknown;
}

// ===== 本地技能 =====

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  parameters: SkillParameter[];
  enabled: boolean;
  installed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Skill 来源类型 =====

export type SkillSource = "local" | "hub" | "installed";

// ===== Hub 枚举类型 =====

export type SkillVersionStatus =
  | "DRAFT"
  | "SCANNING"
  | "SCAN_FAILED"
  | "UPLOADED"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "YANKED";

export type SkillStatus = "ACTIVE" | "HIDDEN" | "ARCHIVED";
export type SkillVisibility = "PUBLIC" | "NAMESPACE_ONLY" | "PRIVATE";
export type ReviewTaskStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";
export type ReportStatus = "PENDING" | "DISMISSED" | "RESOLVED";
export type LabelType = "RECOMMENDED" | "PRIVILEGED";
export type NamespaceType = "GLOBAL" | "TEAM";
export type NamespaceRole = "OWNER" | "ADMIN" | "MEMBER";

// ===== 命名空间 =====

export interface HubNamespace {
  id: string;
  tenantId: string;
  slug: string;
  display_name: string;
  type: NamespaceType;
  description?: string;
  avatarUrl?: string;
  status: string;
  memberCount?: number;
  skillCount?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NamespaceMember {
  id: string;
  namespaceId: string;
  userId: string;
  role: NamespaceRole;
  createdAt: Date;
}

// ===== 租户用户 =====

export interface TenantUser {
  id: string;
  username: string;
  email?: string;
  nickname: string;
  avatar?: string;
}

// ===== Hub 技能版本 =====

export interface HubSkillVersion {
  id: string;
  skillId: string;
  version: string;
  status: SkillVersionStatus;
  changelog?: string;
  parsedMetadataJson?: Record<string, unknown>;
  manifestJson?: Record<string, unknown>;
  requestedVisibility?: SkillVisibility;
  fileCount: number;
  totalSize: number;
  publishedAt?: Date;
  bundleReady: boolean;
  downloadReady: boolean;
  yankedAt?: Date;
  yankedBy?: string;
  yankReason?: string;
  createdBy: string;
  createdAt: Date;
}

// ===== Hub 技能文件 =====

export interface HubSkillFile {
  id: string;
  versionId: string;
  filePath: string;
  fileSize: number;
  contentType?: string;
  sha256: string;
  createdAt: Date;
}

// ===== 标签 =====

export interface HubLabel {
  id: string;
  slug: string;
  type: LabelType;
  displayName: string;
  visibleInFilter: boolean;
  sortOrder: number;
}

export interface LabelDefinition {
  id: string;
  tenantId: string;
  slug: string;
  type: LabelType;
  visibleInFilter: boolean;
  sortOrder: number;
  translations: LabelTranslation[];
  createdBy?: string;
  createdAt: Date;
}

export interface LabelTranslation {
  locale: string;
  displayName: string;
}

// ===== 社交 =====

export interface SkillRating {
  skillId: string;
  userId: string;
  score: number;
  createdAt: Date;
}

export interface SkillRatingStatus {
  score: number;
  hasRated: boolean;
}

// ===== 审核 =====

export interface ReviewTask {
  id: string;
  skillVersionId: string;
  namespaceId: string;
  status: ReviewTaskStatus;
  version: number;
  submittedBy: string;
  reviewedBy?: string;
  reviewComment?: string;
  submittedAt: Date;
  reviewedAt?: Date;
}

// ===== 跨命名空间推广 =====

export type PromotionTaskStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PromotionTask {
  id: string;
  sourceSkillId: string;
  sourceNamespaceId: string;
  sourceNamespaceSlug: string;
  sourceSkillSlug: string;
  sourceVersionId: string;
  sourceVersion: string;
  targetNamespaceId: string;
  targetNamespaceSlug: string;
  targetSkillId?: string;
  status: PromotionTaskStatus;
  submittedBy: string;
  reviewedBy?: string;
  reviewComment?: string;
  submittedAt: Date;
  reviewedAt?: Date;
}

export interface SubmitPromotionRequest {
  sourceSkillId: string;
  sourceVersionId: string;
  targetNamespaceId: string;
}

export interface PromotionResult {
  newSkillId?: string;
  newVersionId: string;
  targetNamespace: string;
  targetSlug: string;
  targetVersion: string;
}

// ===== 安全审计 =====

export type SecurityVerdict = "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "BLOCKED";
export type SecurityAuditDisplayState =
  | SecurityVerdict
  | "SCANNING"
  | "SCAN_FAILED";
export type FindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface SecurityFinding {
  ruleId: string;
  severity: FindingSeverity;
  category: string;
  title: string;
  message: string | null;
  filePath: string | null;
  lineNumber: number | null;
  codeSnippet: string | null;
  remediation: string | null;
  analyzer: string | null;
  metadata: Record<string, unknown>;
}

export interface SecurityAuditRecord {
  id: string;
  scanId: string;
  scannerType: string;
  verdict: SecurityVerdict;
  isSafe: boolean;
  maxSeverity: string | null;
  findingsCount: number;
  findings: SecurityFinding[];
  scanDurationSeconds: number | null;
  scannedAt: string | null;
  createdAt: string;
}

// ===== API Token =====

export interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

// ===== 举报 =====

export interface SkillReport {
  id: string;
  skillId: string;
  namespaceId: string;
  reporterId: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  handledBy?: string;
  handleComment?: string;
  createdAt: Date;
  handledAt?: Date;
}

// ===== Hub 技能（完整） =====

export interface HubSkill {
  id: string;
  tenantId: string;
  namespaceId: string;
  namespaceSlug: string;
  slug: string;
  displayName?: string;
  summary?: string;
  ownerId: string;
  ownerDisplayName?: string;
  visibility: SkillVisibility;
  status: SkillStatus;
  latestVersion?: HubSkillVersion;
  downloadCount: number;
  starCount: number;
  ratingAvg: number;
  ratingCount: number;
  hidden: boolean;
  tags: string[];
  labels: HubLabel[];
  // 权限标志
  canManageLifecycle: boolean;
  canSubmitPromotion: boolean;
  canInteract: boolean;
  canReport: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== 兼容旧版 HubSkill =====

export interface HubSkillLegacy {
  hubId: string;
  name: string;
  description: string;
  type: "builtin" | "custom" | "api";
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

// ===== 本地安装的技能（扩展） =====

export interface InstalledSkill extends Skill {
  source: SkillSource;
  hubId?: string;
  installedVersion?: string;
  latestVersion?: string;
  hasUpdate?: boolean;
}

// ===== 发布请求 =====

export interface PublishSkillRequest {
  name: string;
  description: string;
  type: "builtin" | "custom" | "api";
  category: string;
  parameters: SkillParameter[];
  timeout: number;
  tags: string[];
  readme?: string;
}

// ===== 发布结果 =====

export interface PublishSkillResult {
  skillId: string;
  namespace: string;
  slug: string;
  version: string;
  status: SkillVersionStatus;
  fileCount: number;
  totalSize: number;
}

// ===== Hub 分类 =====

export interface HubCategory {
  id: string;
  name: string;
  icon?: string;
  count: number;
}

// ===== Hub 搜索结果 =====

export interface HubSearchResult {
  skills: HubSkill[];
  total: number;
  page: number;
  pageSize: number;
  facets?: {
    namespaces: Array<{ slug: string; displayName: string; count: number }>;
    labels: Array<{
      id: string;
      slug: string;
      displayName: string;
      count: number;
    }>;
  };
}

// ===== Hub 统计 =====

export interface HubStats {
  totalSkills: number;
  totalDownloads: number;
  totalNamespaces: number;
  totalRatings: number;
}

// ===== 分页响应 =====

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===== 生命周期响应 =====

export interface SkillLifecycleResponse {
  skillId: string;
  versionId?: string;
  action: string;
  newStatus: string;
}

// ===== 兼容旧版搜索结果 =====

export interface HubSearchResultLegacy {
  skills: HubSkillLegacy[];
  total: number;
  page: number;
  pageSize: number;
}
