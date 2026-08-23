/**
 * Channel connector type definitions
 */

/** Channel type */
export type ChannelType =
  | 'wechat'      // WeChat
  | 'wechat_work' // WeCom
  | 'dingtalk'    // DingTalk
  | 'feishu'      // Feishu/Lark
  | 'slack'       // Slack
  | 'telegram'    // Telegram
  | 'discord'     // Discord
  | 'whatsapp'    // WhatsApp
  | 'line'        // Line
  | 'messenger'   // Facebook Messenger
  | 'instagram'   // Instagram
  | 'teams'       // Microsoft Teams
  | 'webhook'     // Webhook
  | 'email'       // email
  | 'sms'         // SMS
  | 'custom';     // Custom

/** Channel status */
export type ChannelStatus =
  | 'active'      // active
  | 'inactive'    // inactive
  | 'connecting'  // connecting
  | 'error'       // error
  | 'disabled';   // disabled

/** Channel statistics */
export interface ChannelStats {
  totalMessages: number;       // total message count
  successMessages: number;     // success message count
  failedMessages: number;      // failed message count
  successRate: number;         // success rate (0-100)
  avgResponseTime: number;     // average response time (ms)
  lastMessageAt?: Date;        // last message time
}

/** WeChat configuration */
export interface WechatConfig {
  app_id: string;
  app_secret: string;
  token: string;
  encoding_aes_key?: string;
}

/** WeCom configuration */
export interface WechatWorkConfig {
  corp_id: string;
  agent_id: string;
  secret: string;
  token: string;
  encoding_aes_key?: string;
}

/** DingTalk configuration */
export interface DingtalkConfig {
  client_id: string;
  client_secret: string;
  agent_id?: string;
}

/** Feishu configuration */
export interface FeishuConfig {
  app_id: string;
  app_secret: string;
  encrypt_key?: string;
  verification_token?: string;
}

/** Slack configuration */
export interface SlackConfig {
  bot_token: string;
  app_token?: string;
  signing_secret: string;
  client_id?: string;
  client_secret?: string;
}

/** Telegram configuration */
export interface TelegramConfig {
  bot_token: string;
  webhook_url?: string;
}

/** Discord configuration */
export interface DiscordConfig {
  bot_token: string;
  application_id: string;
  public_key?: string;
}

/** WhatsApp configuration */
export interface WhatsAppConfig {
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  webhook_verify_token?: string;
  app_id?: string;
  app_secret?: string;
}

/** Line configuration */
export interface LineConfig {
  channel_id: string;
  channel_secret: string;
  channel_access_token: string;
}

/** Facebook Messenger configuration */
export interface MessengerConfig {
  page_id: string;
  page_access_token: string;
  app_id: string;
  app_secret: string;
  verify_token?: string;
}

/** Instagram configuration */
export interface InstagramConfig {
  account_id: string;
  access_token: string;
  app_id: string;
  app_secret: string;
}

/** Microsoft Teams configuration */
export interface TeamsConfig {
  tenant_id: string;
  client_id: string;
  client_secret: string;
  bot_id?: string;
  bot_password?: string;
}

/** Webhook configuration */
export interface WebhookConfig {
  webhook_key?: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  secret?: string;
}

/** Email configuration */
export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_address: string;
  from_name?: string;
  use_tls: boolean;
}

/** SMS configuration */
export interface SmsConfig {
  provider: 'aliyun' | 'tencent' | 'twilio';
  access_key_id: string;
  access_key_secret: string;
  sign_name: string;
  template_code?: string;
  region?: string;
}

/** Custom channel configuration */
export interface CustomChannelConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    api_key?: string;
    api_key_header?: string;
  };
  request_template?: string;
  response_mapping?: string;
}

/** Channel configuration union type */
export type ChannelConfig =
  | WechatConfig
  | WechatWorkConfig
  | DingtalkConfig
  | FeishuConfig
  | SlackConfig
  | TelegramConfig
  | DiscordConfig
  | WhatsAppConfig
  | LineConfig
  | MessengerConfig
  | InstagramConfig
  | TeamsConfig
  | WebhookConfig
  | EmailConfig
  | SmsConfig
  | CustomChannelConfig;

/** Channel basic information */
export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  status: ChannelStatus;
  config: Record<string, unknown>;
  stats: ChannelStats;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
  errorMessage?: string;
}

/** Agent-channel association */
export interface AgentChannel {
  id: string;
  agentId: string;
  channelId: string;
  enabled: boolean;
  priority: number;           // higher number means higher priority
  config?: {
    welcomeMessage?: string;
    fallbackMessage?: string;
    timeout?: number;
    maxRetries?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/** Channel type info */
export interface ChannelTypeInfo {
  type: ChannelType;
  name: string;
  icon: string;
  description: string;
  features: string[];
}

/** Channel test results */
export interface ChannelTestResult {
  success: boolean;
  message: string;
  latency?: number;
  details?: Record<string, unknown>;
  error?: string;
}

/** Channel message records */
export interface ChannelMessage {
  id: string;
  channelId: string;
  agentId?: string;
  direction: 'inbound' | 'outbound';
  content: string;
  contentType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'custom';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
}
