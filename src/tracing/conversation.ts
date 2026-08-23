/**
 * Conversation tracing functionality
 */

import { startSpan, endSpan, setAttribute, addEvent, traceAsync } from './utils';
import type { Span } from '../types/tracing';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface ConversationTraceContext {
  conversationId: string;
  agentId: string;
  userId?: string;
  parentSpan?: Span;
}

// Store active conversation traces
const activeConversationTraces = new Map<string, Span>();

/**
 * Start tracing conversation
 */
export function startConversationTrace(context: ConversationTraceContext): Span {
  const span = startSpan(
    `conversation.${context.conversationId}`,
    {
      'conversation.id': context.conversationId,
      'agent.id': context.agentId,
      'user.id': context.userId || 'anonymous',
    },
    'SERVER'
  );

  activeConversationTraces.set(context.conversationId, span);
  return span;
}

/**
 * Trace message
 */
export function traceMessage(
  conversationId: string,
  message: ConversationMessage
): void {
  const span = activeConversationTraces.get(conversationId);
  if (!span) return;

  addEvent(span, `message.${message.role}`, {
    'message.role': message.role,
    'message.length': message.content.length,
    'message.timestamp': message.timestamp?.toISOString() || new Date().toISOString(),
  });
}

/**
 * Trace token usage
 */
export function traceTokenUsage(
  conversationId: string,
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }
): void {
  const span = activeConversationTraces.get(conversationId);
  if (!span) return;

  setAttribute(span, 'token.prompt', usage.promptTokens);
  setAttribute(span, 'token.completion', usage.completionTokens);
  setAttribute(span, 'token.total', usage.totalTokens);
}

/**
 * Trace model invocation
 */
export async function traceModelCall<T>(
  conversationId: string,
  model: string,
  fn: () => Promise<T>
): Promise<T> {
  const parentSpan = activeConversationTraces.get(conversationId);

  return traceAsync(
    `model.call.${model}`,
    fn,
    {
      'model.name': model,
      'conversation.id': conversationId,
      'parent.span_id': parentSpan?.span_id || '',
    }
  );
}

/**
 * Trace skill execution
 */
export async function traceSkillExecution<T>(
  conversationId: string,
  skillName: string,
  fn: () => Promise<T>
): Promise<T> {
  return traceAsync(
    `skill.execute.${skillName}`,
    fn,
    {
      'skill.name': skillName,
      'conversation.id': conversationId,
    }
  );
}

/**
 * End tracing conversation
 */
export function endConversationTrace(
  conversationId: string,
  status: 'OK' | 'ERROR' = 'OK'
): void {
  const span = activeConversationTraces.get(conversationId);
  if (!span) return;

  endSpan(span, status);
  activeConversationTraces.delete(conversationId);
}

/**
 * Get active conversation trace
 */
export function getActiveConversationTrace(conversationId: string): Span | undefined {
  return activeConversationTraces.get(conversationId);
}

export default {
  startConversationTrace,
  traceMessage,
  traceTokenUsage,
  traceModelCall,
  traceSkillExecution,
  endConversationTrace,
  getActiveConversationTrace,
};
