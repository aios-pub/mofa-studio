/**
 * Tracing utility functions
 */

import { getTracingConfig, isTracingInitialized } from './config';
import type { Span } from '../types/tracing';

// Generate unique Trace ID
export function generateTraceId(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Generate unique Span ID
export function generateSpanId(): string {
  return Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Active Span stack
const activeSpans: Span[] = [];

/**
 * Get current active Span
 */
export function getActiveSpan(): Span | undefined {
  return activeSpans[activeSpans.length - 1];
}

/**
 * Create a new Span
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
 * End Span
 */
export function endSpan(span: Span, status: Span['status'] = 'OK'): void {
  const now = new Date();
  span.end_time = now.toISOString();
  span.duration = now.getTime() - new Date(span.start_time).getTime();
  span.status = status;

  // Remove from active stack
  const index = activeSpans.indexOf(span);
  if (index > -1) {
    activeSpans.splice(index, 1);
  }

  // If tracing is initialized, send span
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
 * Add event to Span
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
 * Set Span attributes
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
 * Trace async function
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
 * Trace sync function
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
 * Create trace decorator
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
