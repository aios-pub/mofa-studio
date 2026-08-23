/**
 * Octos configuration adapter
 * Convert between channel config (channel_ids) and the backend channels format
 */

import type {
  OctosProfileConfig,
  OctosChannelCredentials,
} from "@/types/octos";
import type { Channel } from "@/types/channel";
import { channelApi } from "@/services";

/**
 * Map channel configuration to Octos format
 * Convert channel config to flat Octos format (fields directly on the object)
 * Additionally save channel_id for echo matching
 */
function channelToOctosFormat(channel: Channel): OctosChannelCredentials {
  const octosChannel: any = { type: channel.type };

  // Save channel_id for exact match when echoing values
  octosChannel._channel_id = channel.id;

  // Map configuration to the Octos-expected format by channel type
  switch (channel.type) {
    case "feishu":
      // Feishu channel: pass both the environment variable name and the actual credential value
      octosChannel.app_id_env = "FEISHU_APP_ID";
      octosChannel.app_secret_env = "FEISHU_APP_SECRET";
      // Pass actual app_id and app_secret values to the backend
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
      // Generic handling: convert all config values to xxx_env format
      for (const [key, value] of Object.entries(channel.config || {})) {
        octosChannel[`${key}_env`] = value;
      }
  }

  return octosChannel;
}

/**
 * Convert frontend config to backend format
 */
export async function toBackendFormat(
  frontendConfig: OctosProfileConfig,
): Promise<OctosProfileConfig> {
  const backendConfig: OctosProfileConfig = { ...frontendConfig };

  // Convert channel config: channel_ids -> channels (with credentials)
  if (frontendConfig.channel_ids && frontendConfig.channel_ids.length > 0) {
    try {
      const channels = await channelApi.getAll();
      const selectedChannels = channels.filter((c: Channel) =>
        frontendConfig.channel_ids?.includes(c.id),
      );

      backendConfig.channels = selectedChannels.map(channelToOctosFormat);
      // Keep the new config for echoing values
      backendConfig.channel_ids = frontendConfig.channel_ids;
    } catch (error) {
      console.error("Failed to resolve channels for backend format:", error);
    }
  }

  return backendConfig;
}

/**
 * Convert backend config to frontend format
 * - channels → channel_ids
 */
export async function toFrontendFormat(
  backendConfig: OctosProfileConfig,
): Promise<OctosProfileConfig> {
  const frontendConfig: OctosProfileConfig = { ...backendConfig };

  // Convert channel config: channels -> channel_ids
  // If the backend already has channel_ids, use it directly
  if (backendConfig.channel_ids && backendConfig.channel_ids.length > 0) {
    frontendConfig.channel_ids = backendConfig.channel_ids;
  } else if (backendConfig.channels && backendConfig.channels.length > 0) {
    // Convert backend channels to channel_ids
    try {
      const channels = await channelApi.getAll();
      const matchedChannelIds: string[] = [];

      for (const backendChannel of backendConfig.channels) {
        // Prefer exact match by _channel_id (if present)
        if (backendChannel._channel_id) {
          const channel = channels.find(
            (c: any) => c.id === backendChannel._channel_id,
          );
          if (channel) {
            matchedChannelIds.push(channel.id);
            continue;
          }
        }

        // Try exact match: by channel type and configuration value
        let matchedChannel = channels.find((c: any) => {
          if (c.type !== backendChannel.type) return false;

          // More precise matching by channel type
          switch (backendChannel.type) {
            case "feishu":
              // Match by app_id (actual value)
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

        // If exact match fails, fall back to fuzzy matching: first enabled channel by channel type
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
 * Initialize config: convert backend data to frontend format
 */
export async function initConfig(
  config: OctosProfileConfig,
): Promise<OctosProfileConfig> {
  return toFrontendFormat(config);
}

/**
 * Prepare config for saving: convert frontend data to backend format
 */
export async function prepareConfigForSave(
  config: OctosProfileConfig,
): Promise<OctosProfileConfig> {
  return toBackendFormat(config);
}
