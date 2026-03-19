/**
 * Tracing 真实 API
 * 后端端点: /api/tracing/...
 */

import { apiClient } from "../api/apiClient";

const tracingRealApi = {
  getTraces: (params?: { agent_id?: string; conversation_id?: string; start_time?: string; end_time?: string }) =>
    apiClient.get("/api/tracing/traces", { params }),

  getTrace: (traceId: string) =>
    apiClient.get(`/api/tracing/traces/${traceId}`),

  getStats: () =>
    apiClient.get("/api/tracing/stats"),

  // 别名方法
  getTracingStats: () =>
    apiClient.get("/api/tracing/stats"),

  // 兼容旧接口
  getSpans: (traceId: string) =>
    apiClient.get(`/api/tracing/traces/${traceId}`),

  getSpan: (spanId: string) =>
    apiClient.get(`/api/tracing/traces/${spanId}`),

  exportTrace: async (_traceId: string, _format: string = "json"): Promise<unknown> => {
    console.warn("tracingApi.exportTrace: Backend does not support trace export endpoint");
    return null;
  },
};

export default tracingRealApi;
