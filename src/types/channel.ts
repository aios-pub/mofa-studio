/**
 * Channel 渠道连接器类型定义
 */

/** 渠道类型 */
export type ChannelType =
  | 'wechat'      // 微信
  | 'wechat_work' // 企业微信
  | 'dingtalk'    // 钉钉
  | 'feishu'      // 飞书/Lark
  | 'slack'       // Slack
  | 'telegram'    // Telegram
  | 'discord'     // Discord
  | 'whatsapp'    // WhatsApp
  | 'line'        // Line
  | 'messenger'   // Facebook Messenger
  | 'instagram'   // Instagram
  | 'teams'       // Microsoft Teams
  | 'webhook'     // Webhook
  | 'email'       // 邮件
  | 'sms'         // 短信
  | 'custom';     // 自定义

/** 渠道状态 */
export type ChannelStatus =
  | 'active'      // 活跃
  | 'inactive'    // 未激活
  | 'connecting'  // 连接中
  | 'error'       // 错误
  | 'disabled';   // 已禁用

/** 渠道统计信息 */
export interface ChannelStats {
  totalMessages: number;       // 总消息数
  successMessages: number;     // 成功消息数
  failedMessages: number;      // 失败消息数
  successRate: number;         // 成功率 (0-100)
  avgResponseTime: number;     // 平均响应时间 (ms)
  lastMessageAt?: Date;        // 最后消息时间
}

/** 微信配置 */
export interface WechatConfig {
  app_id: string;
  app_secret: string;
  token: string;
  encoding_aes_key?: string;
}

/** 企业微信配置 */
export interface WechatWorkConfig {
  corp_id: string;
  agent_id: string;
  secret: string;
  token: string;
  encoding_aes_key?: string;
}

/** 钉钉配置 */
export interface DingtalkConfig {
  client_id: string;
  client_secret: string;
  agent_id?: string;
}

/** 飞书配置 */
export interface FeishuConfig {
  app_id: string;
  app_secret: string;
  encrypt_key?: string;
  verification_token?: string;
}

/** Slack 配置 */
export interface SlackConfig {
  bot_token: string;
  app_token?: string;
  signing_secret: string;
  client_id?: string;
  client_secret?: string;
}

/** Telegram 配置 */
export interface TelegramConfig {
  bot_token: string;
  webhook_url?: string;
}

/** Discord 配置 */
export interface DiscordConfig {
  bot_token: string;
  application_id: string;
  public_key?: string;
}

/** WhatsApp 配置 */
export interface WhatsAppConfig {
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  webhook_verify_token?: string;
  app_id?: string;
  app_secret?: string;
}

/** Line 配置 */
export interface LineConfig {
  channel_id: string;
  channel_secret: string;
  channel_access_token: string;
}

/** Facebook Messenger 配置 */
export interface MessengerConfig {
  page_id: string;
  page_access_token: string;
  app_id: string;
  app_secret: string;
  verify_token?: string;
}

/** Instagram 配置 */
export interface InstagramConfig {
  account_id: string;
  access_token: string;
  app_id: string;
  app_secret: string;
}

/** Microsoft Teams 配置 */
export interface TeamsConfig {
  tenant_id: string;
  client_id: string;
  client_secret: string;
  bot_id?: string;
  bot_password?: string;
}

/** Webhook 配置 */
export interface WebhookConfig {
  webhook_key?: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  secret?: string;
}

/** 邮件配置 */
export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_address: string;
  from_name?: string;
  use_tls: boolean;
}

/** 短信配置 */
export interface SmsConfig {
  provider: 'aliyun' | 'tencent' | 'twilio';
  access_key_id: string;
  access_key_secret: string;
  sign_name: string;
  template_code?: string;
  region?: string;
}

/** 自定义渠道配置 */
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

/** 渠道配置联合类型 */
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

/** 渠道基本信息 */
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

/** Agent 与 Channel 的关联关系 */
export interface AgentChannel {
  id: string;
  agentId: string;
  channelId: string;
  enabled: boolean;
  priority: number;           // 优先级，数字越大优先级越高
  config?: {
    welcomeMessage?: string;
    fallbackMessage?: string;
    timeout?: number;
    maxRetries?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/** 渠道类型信息 */
export interface ChannelTypeInfo {
  type: ChannelType;
  name: string;
  icon: string;
  description: string;
  features: string[];
}

/** 渠道测试结果 */
export interface ChannelTestResult {
  success: boolean;
  message: string;
  latency?: number;
  details?: Record<string, unknown>;
  error?: string;
}

/** 渠道消息记录 */
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
