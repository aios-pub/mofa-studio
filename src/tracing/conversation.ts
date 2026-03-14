/**
 * 对话追踪功能
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

// 存储活跃的对话追踪
const activeConversationTraces = new Map<string, Span>();

/**
 * 开始追踪对话
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
 * 追踪消息
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
 * 追踪 Token 使用
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
 * 追踪模型调用
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
      'parent.span_id': parentSpan?.spanId || '',
    }
  );
}

/**
 * 追踪技能执行
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
 * 结束追踪对话
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
 * 获取活跃的对话追踪
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
