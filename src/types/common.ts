/**
 * Common type definitions
 */

/** Pagination parameters */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

/** Pagination response */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/** API response */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** Sort direction */
export type SortOrder = 'asc' | 'desc';

/** Sort parameters */
export interface SortParams {
  field: string;
  order: SortOrder;
}

/** ID type */
export type ID = string;

/** Timestamp type */
export type Timestamp = Date | string | number;

/** Key-value pair */
export interface KeyValuePair<K = string, V = unknown> {
  key: K;
  value: V;
}

/** Theme mode */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Window mode (floating ball related) */
export type WindowMode = 'floating' | 'expanded' | 'full';
