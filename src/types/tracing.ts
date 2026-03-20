/**
 * Tracing 相关类型定义
 * 与后端 API 响应格式保持一致 (snake_case)
 */

export interface SpanEvent {
  name: string;
  timestamp: string;
  attributes?: Record<string, unknown>;
}

export interface Span {
  id: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  kind: string;
  start_time: string;
  end_time?: string;
  duration: number; // milliseconds
  status: string;
  attributes?: Record<string, unknown>;
  events?: SpanEvent[];
  resource?: {
    service_name?: string;
    service_version?: string;
    [key: string]: unknown;
  };
}

export interface Trace {
  id: string;
  trace_id: string;
  root_span_id?: string;
  service_name: string;
  operation_name: string;
  start_time: string;
  end_time?: string | null;
  total_duration: number;
  span_count: number;
  has_error: boolean;
  status: string;
  metadata?: Record<string, unknown>;
  spans?: Span[];
}

export interface TraceDetail extends Trace {
  spans: Span[];
}

export interface TracingFilter {
  trace_id?: string;
  service_name?: string;
  operation_name?: string;
  status?: string;
  min_duration?: number;
  max_duration?: number;
  start_time_from?: string;
  start_time_to?: string;
}

export interface TracingStats {
  total_traces: number;
  error_traces: number;
  avg_duration: number;
  p50_duration: number;
  p95_duration: number;
  p99_duration: number;
  traces_by_service: Record<string, number>;
  traces_by_operation: Record<string, number>;
  error_rate: number;
}

// API 响应包装
export interface TracingListResponse {
  data: Trace[];
  total: number;
}

export interface TraceDetailResponse {
  data: TraceDetail | null;
}

export interface TracingStatsResponse {
  data: TracingStats;
}
