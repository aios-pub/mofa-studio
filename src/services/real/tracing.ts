/**
 * Tracing real API
 * Backend endpoints: /api/tracing/...
 *
 * Note: Trace types already follow backend snake_case; no conversion needed
 */

import { apiClient } from "../api/apiClient";
import type { Trace, TraceDetail, TracingStats, TracingFilter } from "@/types/tracing";

// ==================== API methods ====================

const tracingRealApi = {
  async getTraces(params?: TracingFilter): Promise<{ data: Trace[] }> {
    const traces = await apiClient.get<Trace[]>("/api/tracing/traces", { params });
    return { data: Array.isArray(traces) ? traces : [] };
  },

  async getTrace(traceId: string): Promise<TraceDetail | null> {
    return apiClient.get<TraceDetail | null>(`/api/tracing/traces/${traceId}`);
  },

  getStats: (): Promise<TracingStats> =>
    apiClient.get<TracingStats>("/api/tracing/stats"),

  async exportTraces(params?: TracingFilter, format: 'json' | 'csv' = 'json'): Promise<Blob> {
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

  async exportTrace(traceId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> {
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

  // Alias
  getTracingStats: (): Promise<TracingStats> => tracingRealApi.getStats(),

  getSpans: (traceId: string): Promise<TraceDetail | null> => tracingRealApi.getTrace(traceId),

  getSpan: (spanId: string): Promise<TraceDetail | null> => tracingRealApi.getTrace(spanId),
};

export { tracingRealApi };
