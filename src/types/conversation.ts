/**
 * 对话相关类型定义
 */

/** Messages角色 */
export type MessageRole = 'user' | 'assistant' | 'system';

/** Message status */
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'error';

/** Tool call结果 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
}

/** Thinking process */
export interface ThinkingProcess {
  content: string;
  duration?: number;
}

/** Messages附件 */
export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  file?: File;
}

/** Messages */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  attachments?: MessageAttachment[];
  status: MessageStatus;
  thinking?: ThinkingProcess;
  toolCalls?: ToolCall[];
  tokens?: {
    input: number;
    output: number;
  };
  createdAt: Date;
}

/** 会话 */
export interface Conversation {
  id: string;
  agentId: string;
  title: string;
  messages: Message[];
  totalTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

/** 会话分组 */
export interface ConversationGroup {
  id: string;
  name: string;
  icon?: string;
  conversations: Conversation[];
}
