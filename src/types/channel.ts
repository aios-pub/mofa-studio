/**
 * Channel 渠道连接器类型定义
 */

/** 渠道类型 */
export type ChannelType =
  | 'wechat'      // 微信
  | 'wechat_work' // 企业微信
  | 'dingtalk'    // 钉钉
  | 'feishu'      // 飞书
  | 'slack'       // Slack
  | 'telegram'    // Telegram
  | 'discord'     // Discord
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
  appId: string;
  appSecret: string;
  token: string;
  encodingAESKey?: string;
}

/** 企业微信配置 */
export interface WechatWorkConfig {
  corpId: string;
  agentId: string;
  secret: string;
  token: string;
  encodingAESKey?: string;
}

/** 钉钉配置 */
export interface DingtalkConfig {
  appKey: string;
  appSecret: string;
  agentId?: string;
}

/** 飞书配置 */
export interface FeishuConfig {
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
}

/** Slack 配置 */
export interface SlackConfig {
  botToken: string;
  appToken?: string;
  signingSecret: string;
  clientId?: string;
  clientSecret?: string;
}

/** Telegram 配置 */
export interface TelegramConfig {
  botToken: string;
  webhookUrl?: string;
}

/** Discord 配置 */
export interface DiscordConfig {
  botToken: string;
  applicationId: string;
  publicKey?: string;
}

/** Webhook 配置 */
export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  secret?: string;
}

/** 邮件配置 */
export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromAddress: string;
  fromName?: string;
  useTLS: boolean;
}

/** 短信配置 */
export interface SmsConfig {
  provider: 'aliyun' | 'tencent' | 'twilio';
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode?: string;
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
    apiKey?: string;
    apiKeyHeader?: string;
  };
  requestTemplate?: string;
  responseMapping?: string;
}

/** 渠道配置联合类型 */
export type ChannelConfig =
  | { type: 'wechat'; config: WechatConfig }
  | { type: 'wechat_work'; config: WechatWorkConfig }
  | { type: 'dingtalk'; config: DingtalkConfig }
  | { type: 'feishu'; config: FeishuConfig }
  | { type: 'slack'; config: SlackConfig }
  | { type: 'telegram'; config: TelegramConfig }
  | { type: 'discord'; config: DiscordConfig }
  | { type: 'webhook'; config: WebhookConfig }
  | { type: 'email'; config: EmailConfig }
  | { type: 'sms'; config: SmsConfig }
  | { type: 'custom'; config: CustomChannelConfig };

/** 渠道基本信息 */
export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  status: ChannelStatus;
  config: ChannelConfig;
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
