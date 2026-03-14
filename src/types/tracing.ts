/**
 * Tracing 相关类型定义
 */

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: 'INTERNAL' | 'SERVER' | 'CLIENT' | 'PRODUCER' | 'CONSUMER';
  startTime: string;
  endTime: string;
  duration: number; // milliseconds
  status: 'OK' | 'ERROR' | 'UNSET';
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  resource: {
    serviceName: string;
    serviceVersion?: string;
    [key: string]: string | undefined;
  };
}

export interface SpanEvent {
  name: string;
  timestamp: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface Trace {
  traceId: string;
  rootSpan: Span;
  spans: Span[];
  totalDuration: number;
  spanCount: number;
  hasError: boolean;
  serviceName: string;
  operationName: string;
  startTime: string;
}

export interface TracingFilter {
  traceId?: string;
  serviceName?: string;
  operationName?: string;
  status?: 'OK' | 'ERROR' | 'ALL';
  minDuration?: number;
  maxDuration?: number;
  startTimeFrom?: string;
  startTimeTo?: string;
}

export interface TracingStats {
  totalTraces: number;
  errorTraces: number;
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  tracesByService: Record<string, number>;
  tracesByOperation: Record<string, number>;
  errorRate: number;
}
