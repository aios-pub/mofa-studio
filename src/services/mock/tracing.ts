/**
 * Mock Tracing 服务
 */

import type {
  Trace,
  Span,
  TracingFilter,
  TracingStats,
} from "../../types/tracing";

// 生成随机 ID
const generateId = (length: number): string =>
  Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");

// 生成 Mock Span
const generateMockSpan = (
  trace_id: string,
  parent_span_id?: string,
  _depth: number = 0,
): Span => {
  const span_id = generateId(16);
  const now = new Date();
  const startTime = new Date(now.getTime() - Math.random() * 3600000);
  const duration = Math.floor(Math.random() * 5000) + 10;
  const operations = [
    "HTTP GET /api/agents",
    "HTTP POST /api/conversations",
    "model.call.gpt-4",
    "skill.execute.web_search",
    "conversation.process",
    "database.query",
    "cache.get",
    "cache.set",
  ];
  const services = ["AMOS-claw-frontend", "AMOS-claw-api", "AMOS-claw-worker"];
  const hasError = Math.random() < 0.1;
  const status = hasError ? "ERROR" : "OK";
  const resourceService = services[Math.floor(Math.random() * services.length)];
  return {
    id: span_id,
    span_id,
    trace_id,
    parent_span_id,
    name: operations[Math.floor(Math.random() * operations.length)],
    kind: ["INTERNAL", "SERVER", "CLIENT"][
      Math.floor(Math.random() * 3)
    ] as Span["kind"],
    start_time: startTime.toISOString(),
    end_time: new Date(startTime.getTime() + duration).toISOString(),
    duration,
    status,
    attributes: {
      "http.method": "GET",
      "http.url": "/api/agents",
      "http.status_code": hasError ? 500 : 200,
      "service.name": resourceService,
    },
    events: hasError
      ? [
          {
            name: "exception",
            timestamp: new Date(
              startTime.getTime() + duration / 2,
            ).toISOString(),
            attributes: {
              "exception.type": "Error",
              "exception.message": "Internal Server Error",
            },
          },
        ]
      : [],
    resource: {
      service_name: resourceService,
      service_version: "1.0.0",
    },
  };
};
// 生成 Mock Trace
const generateMockTrace = (): Trace => {
  const trace_id = generateId(32);
  const spans: Span[] = [];
  // 生成根 Span
  const rootSpan = generateMockSpan(trace_id);
  spans.push(rootSpan);
  // 生成子 Spans
  const childCount = Math.floor(Math.random() * 5) + 1;
  for (let i = 0; i < childCount; i++) {
    spans.push(generateMockSpan(trace_id, rootSpan.span_id, 1));
  }
  return {
    id: generateId(32),
    trace_id,
    root_span_id: rootSpan.span_id,
    service_name: rootSpan.resource?.service_name || "",
    operation_name: rootSpan.name,
    start_time: rootSpan.start_time,
    end_time: null,
    total_duration: Math.max(...spans.map((s) => s.duration)),
    span_count: spans.length,
    has_error: spans.some((s) => s.status === "ERROR"),
    status: spans.some((s) => s.status === "ERROR") ? "ERROR" : "OK",
    metadata: {},
    spans,
  };
};
// 生成 Mock 数据
const MOCK_TRACES: Trace[] = Array.from({ length: 50 }, generateMockTrace);
// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const tracingApi = {
  /**
   * 获取追踪列表
   * 返回格式与真实 API（apiClient 解包后）一致：直接返回数组
   */
  getTraces: async (filter?: TracingFilter): Promise<{ data: Trace[] }> => {
    await delay(300);
    let filtered = [...MOCK_TRACES];
    if (filter) {
      if (filter.trace_id) {
        filtered = filtered.filter((t) =>
          t.trace_id.includes(filter.trace_id!),
        );
      }
      if (filter.service_name) {
        filtered = filtered.filter((t) =>
          t.service_name.includes(filter.service_name!),
        );
      }
      if (filter.operation_name) {
        filtered = filtered.filter((t) =>
          t.operation_name.includes(filter.operation_name!),
        );
      }
      if (filter.status === "ERROR") {
        filtered = filtered.filter((t) => t.has_error);
      } else if (filter.status === "OK") {
        filtered = filtered.filter((t) => !t.has_error);
      }
      if (filter.min_duration != null) {
        filtered = filtered.filter(
          (t) => t.total_duration >= filter.min_duration!,
        );
      }
      if (filter.max_duration != null) {
        filtered = filtered.filter(
          (t) => t.total_duration <= filter.max_duration!,
        );
      }
    }
    return {
      data: filtered,
    };
  },
  /**
   * 获取单个追踪详情
   */
  getTraceById: async (trace_id: string): Promise<Trace | null> => {
    await delay(200);
    return MOCK_TRACES.find((t) => t.trace_id === trace_id) || null;
  },
  /**
   * 获取追踪统计
   */
  getTracingStats: async (): Promise<TracingStats> => {
    await delay(200);
    const total_traces = MOCK_TRACES.length;
    const error_traces = MOCK_TRACES.filter((t) => t.has_error).length;
    const durations = MOCK_TRACES.map((t) => t.total_duration).sort(
      (a, b) => a - b,
    );
    const traces_by_service: Record<string, number> = {};
    const traces_by_operation: Record<string, number> = {};
    MOCK_TRACES.forEach((t) => {
      traces_by_service[t.service_name] =
        (traces_by_service[t.service_name] || 0) + 1;
      traces_by_operation[t.operation_name] =
        (traces_by_operation[t.operation_name] || 0) + 1;
    });
    return {
      total_traces,
      error_traces,
      avg_duration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50_duration: durations[Math.floor(durations.length * 0.5)] || 0,
      p95_duration: durations[Math.floor(durations.length * 0.95)] || 0,
      p99_duration: durations[Math.floor(durations.length * 0.99)] || 0,
      traces_by_service,
      traces_by_operation,
      error_rate: (error_traces / total_traces) * 100,
    };
  },

  /**
   * 导出追踪数据
   */
  exportTraces: async (
    filter?: TracingFilter,
    format: "json" | "csv" = "json",
  ): Promise<Blob> => {
    await delay(300);
    const { data } = await tracingApi.getTraces(filter);

    if (format === "csv") {
      // 生成 CSV
      const headers = [
        "trace_id",
        "service_name",
        "operation_name",
        "start_time",
        "total_duration",
        "span_count",
        "status",
      ];
      const rows = data.map((t) =>
        [
          t.trace_id,
          t.service_name,
          t.operation_name,
          t.start_time,
          t.total_duration,
          t.span_count,
          t.status,
        ].join(","),
      );
      const csv = [headers.join(","), ...rows].join("\n");
      return new Blob([csv], { type: "text/csv" });
    }

    // 生成 JSON
    return new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
  },

  /**
   * 导出单个追踪数据
   */
  exportTrace: async (
    traceId: string,
    format: "json" | "csv" = "json",
  ): Promise<Blob> => {
    await delay(200);
    const trace = await tracingApi.getTraceById(traceId);

    if (!trace) {
      throw new Error("Trace not found");
    }

    if (format === "csv") {
      const headers = [
        "span_id",
        "name",
        "start_time",
        "duration",
        "status",
        "parent_span_id",
      ];
      const rows = (trace.spans || []).map((s) =>
        [
          s.span_id,
          s.name,
          s.start_time,
          s.duration,
          s.status,
          s.parent_span_id || "",
        ].join(","),
      );
      const csv = [headers.join(","), ...rows].join("\n");
      return new Blob([csv], { type: "text/csv" });
    }

    return new Blob([JSON.stringify(trace, null, 2)], {
      type: "application/json",
    });
  },
};
export default tracingApi;
