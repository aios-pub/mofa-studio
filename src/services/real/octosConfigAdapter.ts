/**
 * Octos 配置适配器
 * 处理前端（使用 provider_id/model_id）与后端（使用 provider/model/base_url/api_key_env）之间的数据转换
 */

import type { OctosProfileConfig, OctosFallbackConfig, OctosFallbackModel } from "@/types/octos";
import { providerApi } from "@/services";

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
 * 将前端配置转换为后端格式
 * - provider_id + model_id → provider + model + base_url + api_key_env
 * - fallback_configs → fallback_models
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
