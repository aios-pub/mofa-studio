/**
 * Tracing 真实 API
 * 后端端点: /api/tracing/...
 */

import { apiClient } from "../api/apiClient";
import type { Trace, TraceDetail, TracingStats, TracingFilter } from "@/types/tracing";

const tracingRealApi = {
  /**
   * 获取追踪列表
   * apiClient 会自动解包 { code, msg, data } 响应，返回 data 字段
   * 后端返回 { code: 0, msg: "OK", data: Trace[] }，解包后为 Trace[]
   * 包装为 { data: Trace[] } 以保持与 mock API 一致
   */
  getTraces: async (params?: TracingFilter): Promise<{ data: Trace[] }> => {
    const traces = await apiClient.get<Trace[]>("/api/tracing/traces", { params });
    return { data: traces };
  },

  /**
   * 获取单个追踪详情
   */
  getTrace: (traceId: string) =>
    apiClient.get<TraceDetail | null>(`/api/tracing/traces/${traceId}`),

  /**
   * 获取追踪统计
   */
  getStats: () =>
    apiClient.get<TracingStats>("/api/tracing/stats"),

  /**
   * 导出所有追踪数据
   */
  exportTraces: async (params?: TracingFilter, format: 'json' | 'csv' = 'json'): Promise<Blob> => {
    const queryParams = params ? '&' + new URLSearchParams(params as Record<string, string>).toString() : '';
    const response = await fetch(
      `${apiClient.getBaseUrl()}/api/tracing/traces/export?format=${format}${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${apiClient.getToken()}`,
        },
      }
    );
    return response.blob();
  },

  /**
   * 导出单个追踪数据
   */
  exportTrace: async (traceId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> => {
    const response = await fetch(
      `${apiClient.getBaseUrl()}/api/tracing/traces/${traceId}/export?format=${format}`,
      {
        headers: {
          'Authorization': `Bearer ${apiClient.getToken()}`,
        },
      }
    );
    return response.blob();
  },

  // 别名方法 (保持向后兼容)
  getTracingStats: () =>
    apiClient.get<TracingStats>("/api/tracing/stats"),

  // 兼容旧接口
  getSpans: (traceId: string) =>
    apiClient.get<TraceDetail | null>(`/api/tracing/traces/${traceId}`),

  getSpan: (spanId: string) =>
    apiClient.get<TraceDetail | null>(`/api/tracing/traces/${spanId}`),
};

export { tracingRealApi };
