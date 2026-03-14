/**
 * Mock Tracing 服务
 */

import type { Trace, Span, TracingFilter, TracingStats } from '../../types/tracing';

// 生成随机 ID
const generateId = (length: number): string =>
  Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');

// 生成 Mock Span
const generateMockSpan = (
  traceId: string,
  parentSpanId?: string,
  _depth: number = 0
): Span => {
  const spanId = generateId(16);
  const now = new Date();
  const startTime = new Date(now.getTime() - Math.random() * 3600000);
  const duration = Math.floor(Math.random() * 5000) + 10;

  const operations = [
    'HTTP GET /api/agents',
    'HTTP POST /api/conversations',
    'model.call.gpt-4',
    'skill.execute.web_search',
    'conversation.process',
    'database.query',
    'cache.get',
    'cache.set',
  ];

  const services = ['amos-claw-frontend', 'amos-claw-api', 'amos-claw-worker'];

  const hasError = Math.random() < 0.1;

  return {
    traceId,
    spanId,
    parentSpanId,
    name: operations[Math.floor(Math.random() * operations.length)],
    kind: ['INTERNAL', 'SERVER', 'CLIENT'][Math.floor(Math.random() * 3)] as Span['kind'],
    startTime: startTime.toISOString(),
    endTime: new Date(startTime.getTime() + duration).toISOString(),
    duration,
    status: hasError ? 'ERROR' : 'OK',
    attributes: {
      'http.method': 'GET',
      'http.url': '/api/agents',
      'http.status_code': hasError ? 500 : 200,
      'service.name': services[Math.floor(Math.random() * services.length)],
    },
    events: hasError
      ? [
          {
            name: 'exception',
            timestamp: new Date(startTime.getTime() + duration / 2).toISOString(),
            attributes: {
              'exception.type': 'Error',
              'exception.message': 'Internal Server Error',
            },
          },
        ]
      : [],
    resource: {
      serviceName: services[Math.floor(Math.random() * services.length)],
      serviceVersion: '1.0.0',
    },
  };
};

// 生成 Mock Trace
const generateMockTrace = (): Trace => {
  const traceId = generateId(32);
  const spans: Span[] = [];

  // 生成根 Span
  const rootSpan = generateMockSpan(traceId);
  spans.push(rootSpan);

  // 生成子 Spans
  const childCount = Math.floor(Math.random() * 5) + 1;
  for (let i = 0; i < childCount; i++) {
    spans.push(generateMockSpan(traceId, rootSpan.spanId, 1));
  }

  return {
    traceId,
    rootSpan,
    spans,
    totalDuration: Math.max(...spans.map((s) => s.duration)),
    spanCount: spans.length,
    hasError: spans.some((s) => s.status === 'ERROR'),
    serviceName: rootSpan.resource.serviceName,
    operationName: rootSpan.name,
    startTime: rootSpan.startTime,
  };
};

// 生成 Mock 数据
const MOCK_TRACES: Trace[] = Array.from({ length: 50 }, generateMockTrace);

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const tracingApi = {
  /**
   * 获取追踪列表
   */
  getTraces: async (filter?: TracingFilter): Promise<{ data: Trace[]; total: number }> => {
    await delay(300);

    let filtered = [...MOCK_TRACES];

    if (filter) {
      if (filter.traceId) {
        filtered = filtered.filter((t) => t.traceId.includes(filter.traceId!));
      }
      if (filter.serviceName) {
        filtered = filtered.filter((t) => t.serviceName.includes(filter.serviceName!));
      }
      if (filter.operationName) {
        filtered = filtered.filter((t) => t.operationName.includes(filter.operationName!));
      }
      if (filter.status === 'ERROR') {
        filtered = filtered.filter((t) => t.hasError);
      } else if (filter.status === 'OK') {
        filtered = filtered.filter((t) => !t.hasError);
      }
      if (filter.minDuration) {
        filtered = filtered.filter((t) => t.totalDuration >= filter.minDuration!);
      }
      if (filter.maxDuration) {
        filtered = filtered.filter((t) => t.totalDuration <= filter.maxDuration!);
      }
    }

    return {
      data: filtered,
      total: filtered.length,
    };
  },

  /**
   * 获取单个追踪详情
   */
  getTraceById: async (traceId: string): Promise<Trace | null> => {
    await delay(200);
    return MOCK_TRACES.find((t) => t.traceId === traceId) || null;
  },

  /**
   * 获取追踪统计
   */
  getTracingStats: async (): Promise<TracingStats> => {
    await delay(200);

    const totalTraces = MOCK_TRACES.length;
    const errorTraces = MOCK_TRACES.filter((t) => t.hasError).length;
    const durations = MOCK_TRACES.map((t) => t.totalDuration).sort((a, b) => a - b);

    const tracesByService: Record<string, number> = {};
    const tracesByOperation: Record<string, number> = {};

    MOCK_TRACES.forEach((t) => {
      tracesByService[t.serviceName] = (tracesByService[t.serviceName] || 0) + 1;
      tracesByOperation[t.operationName] = (tracesByOperation[t.operationName] || 0) + 1;
    });

    return {
      totalTraces,
      errorTraces,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50Duration: durations[Math.floor(durations.length * 0.5)],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
      tracesByService,
      tracesByOperation,
      errorRate: (errorTraces / totalTraces) * 100,
    };
  },
};

export default tracingApi;
