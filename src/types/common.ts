/**
 * 通用类型定义
 */

/** 分页参数 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/** API 响应 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** 排序方向 */
export type SortOrder = 'asc' | 'desc';

/** 排序参数 */
export interface SortParams {
  field: string;
  order: SortOrder;
}

/** ID 类型 */
export type ID = string;

/** 时间戳类型 */
export type Timestamp = Date | string | number;

/** 键值对 */
export interface KeyValuePair<K = string, V = unknown> {
  key: K;
  value: V;
}

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 窗口模式 (悬浮球相关) */
export type WindowMode = 'floating' | 'expanded' | 'full';
