/**
 * Conversation-related type definitions
 */

/** Message role */
export type MessageRole = 'user' | 'assistant' | 'system';

/** Message status */
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'error';

/** Tool call result */
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

/** Web search citation (CHAT-03). */
export interface WebSource {
  index?: number;
  title: string;
  url: string;
  snippet: string;
}

/** Message attachments */
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
  sources?: WebSource[];
  toolCalls?: ToolCall[];
  tokens?: {
    input: number;
    output: number;
  };
  createdAt: Date;
}

/** Conversation */
export interface Conversation {
  id: string;
  agentId: string;
  title: string;
  messages: Message[];
  totalTokens: number;
  createdAt: Date;
  updatedAt: Date;
  /** CHAT-13: pinned conversations float to the top of the list. */
  pinned?: boolean;
  /** CHAT-13: archived conversations hide unless explicitly shown. */
  archived?: boolean;
}

/** Conversation groups */
export interface ConversationGroup {
  id: string;
  name: string;
  icon?: string;
  conversations: Conversation[];
}
