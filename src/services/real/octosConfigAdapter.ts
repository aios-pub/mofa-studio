/**
 * Octos 配置适配器
 * 处理前端（使用 provider_id/model_id）与后端（使用 provider/model/base_url/api_key_env）之间的数据转换
 * 处理渠道配置（使用 channel_ids）与后端 channels 格式之间的转换
 */

import type { OctosProfileConfig, OctosFallbackConfig, OctosFallbackModel, OctosChannelCredentials } from "@/types/octos";
import { providerApi, channelApi } from "@/services";

/**
 * Provider 类型到 API Key 环境变量的映射
 */
const PROVIDER_ENV_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  groq: "GROQ_API_KEY",
  moonshot: "MOONSHOT_API_KEY",
  dashscope: "DASHSCOPE_API_KEY",
  minimax: "MINIMAX_API_KEY",
  zhipu: "ZHIPU_API_KEY",
  zai: "ZAI_API_KEY",
  nvidia: "NVIDIA_API_KEY",
  r9s: "R9S_API_KEY",
  ollama: "",
  vllm: "VLLM_API_KEY",
};

/**
 * 根据 provider type 获取对应的 API Key 环境变量名
 */
function getApiKeyEnv(providerType: string): string {
  return PROVIDER_ENV_MAP[providerType] || "";
}

/**
 * 渠道配置映射到 Octos 格式
 * 将渠道的 config 转换为扁平的 Octos 格式（字段直接在对象上）
 * 额外保存 channel_id 用于回显时的匹配
 */
function channelToOctosFormat(channel: any): OctosChannelCredentials {
  const octosChannel: any = { type: channel.type };

  // 保存 channel_id 用于回显时的精确匹配
  octosChannel._channel_id = channel.id;

  // 根据渠道类型映射配置到 Octos 期望的格式
  switch (channel.type) {
    case 'feishu':
      octosChannel.app_id_env = channel.config.app_id;
      octosChannel.app_secret_env = channel.config.app_secret;
      if (channel.config.encrypt_key) {
        octosChannel.encrypt_key_env = channel.config.encrypt_key;
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

    case 'telegram':
      octosChannel.bot_token_env = channel.config.bot_token;
      if (channel.config.webhook_url) {
        octosChannel.webhook_url = channel.config.webhook_url;
      }
      break;

    case 'discord':
      octosChannel.bot_token_env = channel.config.bot_token;
      octosChannel.application_id_env = channel.config.application_id;
      if (channel.config.public_key) {
        octosChannel.public_key_env = channel.config.public_key;
      }
      break;

    case 'slack':
      octosChannel.bot_token_env = channel.config.bot_token;
      octosChannel.signing_secret_env = channel.config.signing_secret;
      if (channel.config.app_token) {
        octosChannel.app_token_env = channel.config.app_token;
      }
      break;

    case 'whatsapp':
      octosChannel.phone_number_id_env = channel.config.phone_number_id;
      octosChannel.access_token_env = channel.config.access_token;
      if (channel.config.business_account_id) {
        octosChannel.business_account_id = channel.config.business_account_id;
      }
      break;

    case 'email':
      octosChannel.smtp_host = channel.config.smtp_host;
      octosChannel.smtp_port = channel.config.smtp_port;
      octosChannel.username_env = channel.config.smtp_user;
      octosChannel.password_env = channel.config.smtp_password;
      octosChannel.from_address = channel.config.from_address;
      break;

    case 'wechat_work':
    case 'wecom_bot':
      octosChannel.type = 'wecom_bot';
      octosChannel.corp_id_env = channel.config.corp_id;
      octosChannel.agent_id_env = channel.config.agent_id;
      octosChannel.secret_env = channel.config.secret;
      if (channel.config.token) {
        octosChannel.token = channel.config.token;
      }
      break;

    case 'qq_bot':
      octosChannel.bot_token_env = channel.config.bot_token || channel.config.access_token;
      break;

    case 'wechat':
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
 * - provider_id + model_id → provider + model + base_url + api_key_env
 * - fallback_configs → fallback_models
 * - channel_ids → channels (带完整凭据)
 */
export async function toBackendFormat(frontendConfig: OctosProfileConfig): Promise<OctosProfileConfig> {
  const backendConfig: OctosProfileConfig = { ...frontendConfig };

  // 如果使用新版配置（provider_id + model_id），转换为后端格式
  if (frontendConfig.provider_id) {
    try {
      const provider = await providerApi.getById(frontendConfig.provider_id);
      const model = provider.models.find((m: any) => m.id === frontendConfig.model_id);

      backendConfig.provider = provider.type;
      backendConfig.model = model?.name || null;
      backendConfig.base_url = provider.baseUrl;
      backendConfig.api_key_env = getApiKeyEnv(provider.type);

      // 保留新版配置用于回显
      backendConfig.provider_id = frontendConfig.provider_id;
      backendConfig.model_id = frontendConfig.model_id;
    } catch (error) {
      console.error("Failed to resolve provider for backend format:", error);
      // 如果无法解析，保留原值
    }
  }

  // 转换回退配置
  if (frontendConfig.fallback_configs && frontendConfig.fallback_configs.length > 0) {
    const fallbackModels: OctosFallbackModel[] = [];
    for (const fb of frontendConfig.fallback_configs) {
      if (fb.provider_id) {
        try {
          const provider = await providerApi.getById(fb.provider_id);
          const model = provider.models.find((m: any) => m.id === fb.model_id);
          fallbackModels.push({
            provider: provider.type,
            model: model?.name || null,
            base_url: provider.baseUrl,
            api_key_env: getApiKeyEnv(provider.type),
            api_type: provider.type,
          });
        } catch (error) {
          console.error(`Failed to resolve fallback provider ${fb.provider_id}:`, error);
        }
      }
    }
    backendConfig.fallback_models = fallbackModels;
    // 保留新版配置用于回显
    backendConfig.fallback_configs = frontendConfig.fallback_configs;
  }

  // 转换渠道配置：channel_ids → channels (带凭据)
  if (frontendConfig.channel_ids && frontendConfig.channel_ids.length > 0) {
    try {
      const channels = await channelApi.getAll();
      const selectedChannels = channels.filter((c: any) =>
        frontendConfig.channel_ids?.includes(c.id)
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
 * - 尝试将 provider + model 匹配到 provider_id + model_id
 * - 如果无法匹配，保留旧版配置
 */
export async function toFrontendFormat(backendConfig: OctosProfileConfig): Promise<OctosProfileConfig> {
  const frontendConfig: OctosProfileConfig = { ...backendConfig };

  // 如果已经有新版配置，直接返回
  if (backendConfig.provider_id && backendConfig.model_id) {
    return frontendConfig;
  }

  // 尝试将旧版配置匹配到新版
  if (backendConfig.provider && backendConfig.model) {
    try {
      const providers = await providerApi.getAll();
      // 查找匹配的 provider（通过 type 和 baseUrl）
      const matchedProvider = providers.find(
        (p: any) => p.type === backendConfig.provider && p.baseUrl === backendConfig.base_url
      );

      if (matchedProvider) {
        // 查找匹配的模型（通过 name）
        const matchedModel = matchedProvider.models.find(
          (m: any) => m.name === backendConfig.model && m.enabled
        );

        if (matchedModel) {
          frontendConfig.provider_id = matchedProvider.id;
          frontendConfig.model_id = matchedModel.id;
        }
      }
    } catch (error) {
      console.error("Failed to match backend config to frontend format:", error);
    }
  }

  // 尝试转换回退模型
  if (backendConfig.fallback_models && backendConfig.fallback_models.length > 0) {
    const fallbackConfigs: OctosFallbackConfig[] = [];
    try {
      const providers = await providerApi.getAll();

      for (const fb of backendConfig.fallback_models) {
        // 查找匹配的 provider
        const matchedProvider = providers.find(
          (p: any) => p.type === fb.provider && p.baseUrl === fb.base_url
        );

        if (matchedProvider) {
          // 查找匹配的模型
          const matchedModel = matchedProvider.models.find(
            (m: any) => m.name === fb.model && m.enabled
          );

          fallbackConfigs.push({
            provider_id: matchedProvider.id,
            model_id: matchedModel?.id || null,
          });
        }
      }

      if (fallbackConfigs.length > 0) {
        frontendConfig.fallback_configs = fallbackConfigs;
      }
    } catch (error) {
      console.error("Failed to match fallback configs:", error);
    }
  }

  // 转换渠道配置：channels → channel_ids
  // 如果后端已经有 channel_ids，直接使用
  if (backendConfig.channel_ids && backendConfig.channel_ids.length > 0) {
    frontendConfig.channel_ids = backendConfig.channel_ids;
  } else if (backendConfig.channels && backendConfig.channels.length > 0) {
    // 将旧格式的 channels 转换为 channel_ids
    try {
      const channels = await channelApi.getAll();
      const matchedChannelIds: string[] = [];

      for (const backendChannel of backendConfig.channels) {
        // 优先使用 _channel_id 进行精确匹配（如果存在）
        if (backendChannel._channel_id) {
          const channel = channels.find((c: any) => c.id === backendChannel._channel_id);
          if (channel) {
            matchedChannelIds.push(channel.id);
            continue;
          }
        }

        // 尝试精确匹配：通过渠道类型和配置值匹配
        // 注意：后端返回的 channels 格式是扁平的，字段直接在对象上
        let matchedChannel = channels.find((c: any) => {
          if (c.type !== backendChannel.type) return false;

          // 根据渠道类型进行更精确的匹配
          switch (backendChannel.type) {
            case 'feishu':
              // 尝试通过 app_id 精确匹配（如果后端存储的是实际值）
              return c.config.app_id && backendChannel.app_id_env &&
                     c.config.app_id === backendChannel.app_id_env;

            case 'telegram':
              return c.config.bot_token === backendChannel.bot_token_env;

            case 'discord':
              return c.config.bot_token === backendChannel.bot_token_env &&
                     c.config.application_id === backendChannel.application_id_env;

            case 'slack':
              return c.config.bot_token === backendChannel.bot_token_env;

            case 'whatsapp':
              return c.config.phone_number_id === backendChannel.phone_number_id_env;

            case 'email':
              return c.config.smtp_host === backendChannel.smtp_host &&
                     c.config.from_address === backendChannel.from_address;

            case 'wecom_bot':
              return c.config.corp_id === backendChannel.corp_id_env;

            case 'qq_bot':
              return c.config.bot_token === backendChannel.bot_token_env ||
                     c.config.access_token === backendChannel.bot_token_env;

            case 'wechat':
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
export async function initConfig(config: OctosProfileConfig): Promise<OctosProfileConfig> {
  return toFrontendFormat(config);
}

/**
 * 准备保存配置：将前端数据转换为后端格式
 */
export async function prepareConfigForSave(config: OctosProfileConfig): Promise<OctosProfileConfig> {
  return toBackendFormat(config);
}
