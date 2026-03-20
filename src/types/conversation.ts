/**
 * 对话相关类型定义
 */

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system';

/** 消息状态 */
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'error';

/** 工具调用结果 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
}

/** 思考过程 */
export interface ThinkingProcess {
  content: string;
  duration?: number;
}

/** 消息附件 */
export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  file?: File;
}

/** 消息 */
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
