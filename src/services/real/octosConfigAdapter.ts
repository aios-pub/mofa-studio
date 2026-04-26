/**
 * Octos 配置适配器
 * 处理渠道配置（使用 channel_ids）与后端 channels 格式之间的转换
 */

import type {
  OctosProfileConfig,
  OctosChannelCredentials,
} from "@/types/octos";
import type { Channel } from "@/types/channel";
import { channelApi } from "@/services";

/**
 * 渠道配置映射到 Octos 格式
 * 将渠道的 config 转换为扁平的 Octos 格式（字段直接在对象上）
 * 额外保存 channel_id 用于回显时的匹配
 */
function channelToOctosFormat(channel: Channel): OctosChannelCredentials {
  const octosChannel: any = { type: channel.type };

  // 保存 channel_id 用于回显时的精确匹配
  octosChannel._channel_id = channel.id;

  // 根据渠道类型映射配置到 Octos 期望的格式
  switch (channel.type) {
    case "feishu":
      // 飞书渠道：同时传递环境变量名和实际凭据值
      octosChannel.app_id_env = "FEISHU_APP_ID";
      octosChannel.app_secret_env = "FEISHU_APP_SECRET";
      // 传递实际的 app_id 和 app_secret 值给后端
      octosChannel.app_id = channel.config.app_id;
      octosChannel.app_secret = channel.config.app_secret;
      if (channel.config.encrypt_key) {
        octosChannel.encrypt_key_env = "FEISHU_ENCRYPT_KEY";
        octosChannel.encrypt_key = channel.config.encrypt_key;
      }
      if (channel.config.verification_token) {
        octosChannel.verification_token_env = channel.config.verification_token;
      }
      if (channel.config.mode) {
        octosChannel.mode = channel.config.mode;
      }
      if (channel.config.region) {
        octosChannel.region = channel.config.region;
      }
      if (channel.config.webhook_port !== undefined) {
        octosChannel.webhook_port = channel.config.webhook_port;
      }
      break;

    case "telegram":
      octosChannel.bot_token_env = channel.config.bot_token;
      if (channel.config.webhook_url) {
        octosChannel.webhook_url = channel.config.webhook_url;
      }
      break;

    case "discord":
      octosChannel.bot_token_env = channel.config.bot_token;
      octosChannel.application_id_env = channel.config.application_id;
      if (channel.config.public_key) {
        octosChannel.public_key_env = channel.config.public_key;
      }
      break;

    case "slack":
      octosChannel.bot_token_env = channel.config.bot_token;
      octosChannel.signing_secret_env = channel.config.signing_secret;
      if (channel.config.app_token) {
        octosChannel.app_token_env = channel.config.app_token;
      }
      break;

    case "whatsapp":
      octosChannel.phone_number_id_env = channel.config.phone_number_id;
      octosChannel.access_token_env = channel.config.access_token;
      if (channel.config.business_account_id) {
        octosChannel.business_account_id = channel.config.business_account_id;
      }
      break;

    case "email":
      octosChannel.smtp_host = channel.config.smtp_host;
      octosChannel.smtp_port = channel.config.smtp_port;
      octosChannel.username_env = channel.config.smtp_user;
      octosChannel.password_env = channel.config.smtp_password;
      octosChannel.from_address = channel.config.from_address;
      break;

    case "wechat_work":
      octosChannel.type = "wecom_bot" as const;
      octosChannel.corp_id_env = channel.config.corp_id;
      octosChannel.agent_id_env = channel.config.agent_id;
      octosChannel.secret_env = channel.config.secret;
      if (channel.config.token) {
        octosChannel.token = channel.config.token;
      }
      break;

    // @ts-expect-error - qq_bot is supported by Octos but not defined in ChannelType yet
    case "qq_bot":
      octosChannel.bot_token_env =
        channel.config.bot_token || channel.config.access_token;
      break;

    case "wechat":
      octosChannel.app_id_env = channel.config.app_id;
      octosChannel.app_secret_env = channel.config.app_secret;
      octosChannel.token_env = channel.config.token;
      if (channel.config.encoding_aes_key) {
        octosChannel.encoding_aes_key_env = channel.config.encoding_aes_key;
      }
      break;

    default:
      // 通用处理：将所有 config 值转为 xxx_env 格式
      for (const [key, value] of Object.entries(channel.config || {})) {
        octosChannel[`${key}_env`] = value;
      }
  }

  return octosChannel;
}

/**
 * 将前端配置转换为后端格式
 */
export async function toBackendFormat(
  frontendConfig: OctosProfileConfig,
): Promise<OctosProfileConfig> {
  const backendConfig: OctosProfileConfig = { ...frontendConfig };

  // 转换渠道配置：channel_ids → channels (带凭据)
  if (frontendConfig.channel_ids && frontendConfig.channel_ids.length > 0) {
    try {
      const channels = await channelApi.getAll();
      const selectedChannels = channels.filter((c: Channel) =>
        frontendConfig.channel_ids?.includes(c.id),
      );

      backendConfig.channels = selectedChannels.map(channelToOctosFormat);
      // 保留新版配置用于回显
      backendConfig.channel_ids = frontendConfig.channel_ids;
    } catch (error) {
      console.error("Failed to resolve channels for backend format:", error);
    }
  }

  return backendConfig;
}

/**
 * 将后端配置转换为前端格式
 * - channels → channel_ids
 */
export async function toFrontendFormat(
  backendConfig: OctosProfileConfig,
): Promise<OctosProfileConfig> {
  const frontendConfig: OctosProfileConfig = { ...backendConfig };

  // 转换渠道配置：channels → channel_ids
  // 如果后端已经有 channel_ids，直接使用
  if (backendConfig.channel_ids && backendConfig.channel_ids.length > 0) {
    frontendConfig.channel_ids = backendConfig.channel_ids;
  } else if (backendConfig.channels && backendConfig.channels.length > 0) {
    // 将后端的 channels 转换为 channel_ids
    try {
      const channels = await channelApi.getAll();
      const matchedChannelIds: string[] = [];

      for (const backendChannel of backendConfig.channels) {
        // 优先使用 _channel_id 进行精确匹配（如果存在）
        if (backendChannel._channel_id) {
          const channel = channels.find(
            (c: any) => c.id === backendChannel._channel_id,
          );
          if (channel) {
            matchedChannelIds.push(channel.id);
            continue;
          }
        }

        // 尝试精确匹配：通过渠道类型和配置值匹配
        let matchedChannel = channels.find((c: any) => {
          if (c.type !== backendChannel.type) return false;

          // 根据渠道类型进行更精确的匹配
          switch (backendChannel.type) {
            case "feishu":
              // 通过 app_id（实际值）进行匹配
              return (
                c.config.app_id &&
                backendChannel.app_id &&
                c.config.app_id === backendChannel.app_id
              );

            case "telegram":
              return c.config.bot_token === backendChannel.bot_token_env;

            case "discord":
              return (
                c.config.bot_token === backendChannel.bot_token_env &&
                c.config.application_id === backendChannel.application_id_env
              );

            case "slack":
              return c.config.bot_token === backendChannel.bot_token_env;

            case "whatsapp":
              return (
                c.config.phone_number_id === backendChannel.phone_number_id_env
              );

            case "email":
              return (
                c.config.smtp_host === backendChannel.smtp_host &&
                c.config.from_address === backendChannel.from_address
              );

            case "wecom_bot":
              return c.config.corp_id === backendChannel.corp_id_env;

            case "qq_bot":
              return (
                c.config.bot_token === backendChannel.bot_token_env ||
                c.config.access_token === backendChannel.bot_token_env
              );

            case "wechat":
              return c.config.app_id === backendChannel.app_id_env;

            default:
              return false;
          }
        });

        // 如果精确匹配失败，使用模糊匹配：通过渠道类型匹配第一个启用的渠道
        if (!matchedChannel) {
          matchedChannel = channels.find((c: any) => {
            return c.type === backendChannel.type && c.enabled;
          });
        }

        if (matchedChannel) {
          matchedChannelIds.push(matchedChannel.id);
        }
      }

      if (matchedChannelIds.length > 0) {
        frontendConfig.channel_ids = matchedChannelIds;
      }
    } catch (error) {
      console.error("Failed to match channels to frontend format:", error);
    }
  }

  return frontendConfig;
}

/**
 * 初始化配置：将后端数据转换为前端格式
 */
export async function initConfig(
  config: OctosProfileConfig,
): Promise<OctosProfileConfig> {
  return toFrontendFormat(config);
}

/**
 * 准备保存配置：将前端数据转换为后端格式
 */
export async function prepareConfigForSave(
  config: OctosProfileConfig,
): Promise<OctosProfileConfig> {
  return toBackendFormat(config);
}
