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
  default_value?: unknown;
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
  hub_skill_id?: string;
  installed_version?: string;
  source?: SkillSource;
  created_at: Date;
  updated_at: Date;
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
  tenant_id: string;
  slug: string;
  display_name: string;
  type: NamespaceType;
  description?: string;
  avatar_url?: string;
  status: string;
  member_count?: number;
  skill_count?: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface NamespaceMember {
  id: string;
  namespace_id: string;
  user_id: string;
  role: NamespaceRole;
  created_at: Date;
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
  skill_id: string;
  version: string;
  status: SkillVersionStatus;
  changelog?: string;
  parsed_metadata_json?: Record<string, unknown>;
  manifest_json?: Record<string, unknown>;
  requested_visibility?: SkillVisibility;
  file_count: number;
  total_size: number;
  published_at?: Date;
  bundle_ready: boolean;
  download_ready: boolean;
  yanked_at?: Date;
  yanked_by?: string;
  yank_reason?: string;
  created_by: string;
  created_at: Date;
}

// ===== Hub 技能文件 =====

export interface HubSkillFile {
  id: string;
  version_id: string;
  file_path: string;
  file_size: number;
  content_type?: string;
  sha256: string;
  created_at: Date;
}

// ===== 标签 =====

export interface HubLabel {
  id: string;
  slug: string;
  type: LabelType;
  display_name: string;
  visible_in_filter: boolean;
  sort_order: number;
}

export interface LabelDefinition {
  id: string;
  tenant_id: string;
  slug: string;
  type: LabelType;
  visible_in_filter: boolean;
  sort_order: number;
  translations: LabelTranslation[];
  created_by?: string;
  created_at: Date;
}

export interface LabelTranslation {
  locale: string;
  display_name: string;
}

// ===== 社交 =====

export interface SkillRating {
  skill_id: string;
  user_id: string;
  score: number;
  created_at: Date;
}

export interface SkillRatingStatus {
  score: number;
  has_rated: boolean;
}

// ===== 审核 =====

export interface ReviewTask {
  id: string;
  skill_version_id: string;
  namespace_id: string;
  status: ReviewTaskStatus;
  version: number;
  submitted_by: string;
  reviewed_by?: string;
  review_comment?: string;
  submitted_at: Date;
  reviewed_at?: Date;
}

// ===== 跨命名空间推广 =====

export type PromotionTaskStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PromotionTask {
  id: string;
  source_skill_id: string;
  source_namespace_id: string;
  source_namespace_slug: string;
  source_skill_slug: string;
  source_version_id: string;
  source_version: string;
  target_namespace_id: string;
  target_namespace_slug: string;
  target_skill_id?: string;
  status: PromotionTaskStatus;
  submitted_by: string;
  reviewed_by?: string;
  review_comment?: string;
  submitted_at: Date;
  reviewed_at?: Date;
}

export interface SubmitPromotionRequest {
  source_skill_id: string;
  source_version_id: string;
  target_namespace_id: string;
}

export interface PromotionResult {
  new_skill_id?: string;
  new_version_id: string;
  target_namespace: string;
  target_slug: string;
  target_version: string;
}

// ===== 安全审计 =====

export type SecurityVerdict = "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "BLOCKED";
export type SecurityAuditDisplayState =
  | SecurityVerdict
  | "SCANNING"
  | "SCAN_FAILED";
export type FindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface SecurityFinding {
  rule_id: string;
  severity: FindingSeverity;
  category: string;
  title: string;
  message: string | null;
  file_path: string | null;
  line_number: number | null;
  code_snippet: string | null;
  remediation: string | null;
  analyzer: string | null;
  metadata: Record<string, unknown>;
}

export interface SecurityAuditRecord {
  id: string;
  scan_id: string;
  scanner_type: string;
  verdict: SecurityVerdict;
  is_safe: boolean;
  max_severity: string | null;
  findings_count: number;
  findings: SecurityFinding[];
  scan_duration_seconds: number | null;
  scanned_at: string | null;
  created_at: string;
}

// ===== API Token =====

export interface ApiToken {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

// ===== 举报 =====

export interface SkillReport {
  id: string;
  skill_id: string;
  namespace_id: string;
  reporter_id: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  handled_by?: string;
  handle_comment?: string;
  created_at: Date;
  handled_at?: Date;
}

// ===== Hub 技能（完整） =====

export interface HubSkill {
  id: string;
  tenant_id: string;
  namespace_id: string;
  namespace_slug: string;
  slug: string;
  display_name?: string;
  summary?: string;
  owner_id: string;
  owner_name?: string;
  visibility: SkillVisibility;
  status: SkillStatus;
  latest_version?: HubSkillVersion;
  download_count: number;
  star_count: number;
  rating_avg: number;
  rating_count: number;
  hidden: boolean;
  tags: string[];
  labels: HubLabel[];
  // 权限标志
  can_manage_lifecycle: boolean;
  can_submit_promotion: boolean;
  can_interact: boolean;
  can_report: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

// ===== 兼容旧版 HubSkill =====

export interface HubSkillLegacy {
  hub_id: string;
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
  published_at: Date;
  updated_at: Date;
}

// ===== 本地安装的技能（扩展） =====

export interface InstalledSkill extends Skill {
  source: SkillSource;
  hub_id?: string;
  installed_version?: string;
  latest_version?: string;
  has_update?: boolean;
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
  skill_id: string;
  namespace: string;
  slug: string;
  version: string;
  status: SkillVersionStatus;
  file_count: number;
  total_size: number;
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
  page_size: number;
  facets?: {
    namespaces: Array<{ slug: string; display_name: string; count: number }>;
    labels: Array<{
      id: string;
      slug: string;
      display_name: string;
      count: number;
    }>;
  };
}

// ===== Hub 统计 =====

export interface HubStats {
  total_skills: number;
  total_downloads: number;
  total_namespaces: number;
  total_ratings: number;
}

// ===== 分页响应 =====

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ===== 生命周期响应 =====

export interface SkillLifecycleResponse {
  skill_id: string;
  version_id?: string;
  action: string;
  new_status: string;
}

// ===== 兼容旧版搜索结果 =====

export interface HubSearchResultLegacy {
  skills: HubSkillLegacy[];
  total: number;
  page: number;
  page_size: number;
}
