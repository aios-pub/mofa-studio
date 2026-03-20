/**
 * Tracing 工具函数
 */

import { getTracingConfig, isTracingInitialized } from './config';
import type { Span } from '../types/tracing';

// 生成唯一的 Trace ID
export function generateTraceId(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// 生成唯一的 Span ID
export function generateSpanId(): string {
  return Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// 活跃的 Span 栈
const activeSpans: Span[] = [];

/**
 * 获取当前活跃的 Span
 */
export function getActiveSpan(): Span | undefined {
  return activeSpans[activeSpans.length - 1];
}

/**
 * 创建一个新的 Span
 */
export function startSpan(
  name: string,
  attributes: Record<string, string | number | boolean> = {},
  kind: Span['kind'] = 'INTERNAL'
): Span {
  const parentSpan = getActiveSpan();
  const now = new Date();

  const span: Span = {
    id: generateSpanId(),
    span_id: generateSpanId(),
    trace_id: parentSpan?.trace_id || generateTraceId(),
    parent_span_id: parentSpan?.span_id,
    name,
    kind,
    start_time: now.toISOString(),
    end_time: undefined,
    duration: 0,
    status: 'UNSET',
    attributes: {
      'service.name': getTracingConfig().serviceName,
      ...attributes,
    },
    events: [],
    resource: {
      service_name: getTracingConfig().serviceName,
    },
  };

  activeSpans.push(span);
  return span;
}

/**
 * 结束 Span
 */
export function endSpan(span: Span, status: Span['status'] = 'OK'): void {
  const now = new Date();
  span.end_time = now.toISOString();
  span.duration = now.getTime() - new Date(span.start_time).getTime();
  span.status = status;

  // 从活跃栈中移除
  const index = activeSpans.indexOf(span);
  if (index > -1) {
    activeSpans.splice(index, 1);
  }

  // 如果追踪已初始化，发送 span
  if (isTracingInitialized()) {
    console.log('[Tracing] Span ended:', span.name, {
      trace_id: span.trace_id,
      span_id: span.span_id,
      duration: span.duration,
      status: span.status,
    });
  }
}

/**
 * 添加事件到 Span
 */
export function addEvent(
  span: Span,
  name: string,
  attributes: Record<string, string | number | boolean> = {}
): void {
  if (!span.events) {
    span.events = [];
  }
  span.events.push({
    name,
    timestamp: new Date().toISOString(),
    attributes,
  });
}

/**
 * 设置 Span 属性
 */
export function setAttribute(
  span: Span,
  key: string,
  value: string | number | boolean
): void {
  if (!span.attributes) {
    span.attributes = {};
  }
  span.attributes[key] = value;
}

/**
 * 追踪异步函数
 */
export async function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes: Record<string, string | number | boolean> = {}
): Promise<T> {
  const span = startSpan(name, attributes);

  try {
    const result = await fn();
    endSpan(span, 'OK');
    return result;
  } catch (error) {
    setAttribute(span, 'error', true);
    setAttribute(span, 'error.message', error instanceof Error ? error.message : String(error));
    endSpan(span, 'ERROR');
    throw error;
  }
}

/**
 * 追踪同步函数
 */
export function traceSync<T>(
  name: string,
  fn: () => T,
  attributes: Record<string, string | number | boolean> = {}
): T {
  const span = startSpan(name, attributes);

  try {
    const result = fn();
    endSpan(span, 'OK');
    return result;
  } catch (error) {
    setAttribute(span, 'error', true);
    setAttribute(span, 'error.message', error instanceof Error ? error.message : String(error));
    endSpan(span, 'ERROR');
    throw error;
  }
}

/**
 * 创建追踪装饰器
 */
export function traced(
  name?: string,
  attributes: Record<string, string | number | boolean> = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const spanName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return traceAsync(spanName, () => originalMethod.apply(this, args), attributes);
    };

    return descriptor;
  };
}

export default {
  generateTraceId,
  generateSpanId,
  getActiveSpan,
  startSpan,
  endSpan,
  addEvent,
  setAttribute,
  traceAsync,
  traceSync,
  traced,
};
