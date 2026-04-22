/**
 * Octos LLM Provider 配置 — 复用 Provider 管理
 * 从已配置的 Providers 中选择，而不是重新配置
 */

import { useState, useEffect } from "react";
import {
  Select,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Tag,
  message,
  Card,
  Spin,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  PlusOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  CloudServerOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { OctosProfileConfig, LlmProfileConfig, LlmFallbackConfig } from "@/types/octos";
import { providerApi } from "@/services";

const { Text } = Typography;

// ==================== 辅助函数：处理新旧结构 ====================

/**
 * 获取 LLM 配置，优先从 llm 对象获取，回退到旧结构
 */
function getLlmConfig(config: OctosProfileConfig): LlmProfileConfig {
  if (config.llm) {
    return config.llm;
  }
  // 从旧结构构建 LlmConfig
  return {
    provider_id: config.provider_id,
    model_id: config.model_id,
    provider: config.provider,
    model: config.model,
    base_url: config.base_url,
    api_key_env: config.api_key_env,
    api_type: config.api_type,
    fallback_configs: config.fallback_configs,
    fallback_models: config.fallback_models,
  };
}

/**
 * 检查是否使用旧模式配置（直接在 config 上有字段，或者 llm 中使用旧字段）
 */
function isLegacyLlmConfig(config: OctosProfileConfig): boolean {
  const llmConfig = getLlmConfig(config);
  return !llmConfig.provider_id && !!llmConfig.provider;
}

interface TestState {
  state: "idle" | "testing" | "success" | "error";
  error: string;
}

interface ProviderWithModels {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  models: { id: string; name: string; enabled: boolean }[];
}

interface Props {
  config: OctosProfileConfig;
  onChange: (config: OctosProfileConfig) => void;
}

export default function OctosLlmProviderTab({ config, onChange }: Props) {
  const [providers, setProviders] = useState<ProviderWithModels[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<TestState>({ state: "idle", error: "" });
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithModels | null>(null);

  // 加载 Providers 列表
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await providerApi.getAll();
      const providersWithModels: ProviderWithModels[] = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        baseUrl: p.baseUrl,
        models: (p.models || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          enabled: m.enabled ?? true,
        })),
      }));
      setProviders(providersWithModels);

      // 获取 LLM 配置
      const llmConfig = getLlmConfig(config);

      // 如果当前配置了 provider_id，则设置选中的 provider
      if (llmConfig.provider_id) {
        const current = providersWithModels.find((p) => p.id === llmConfig.provider_id);
        setSelectedProvider(current || null);
      } else if (llmConfig.provider && llmConfig.base_url) {
        // 尝试从旧版配置匹配到 Provider
        const matched = providersWithModels.find(
          (p) => p.type === llmConfig.provider && data.find((d: any) => d.id === p.id)?.baseUrl === llmConfig.base_url
        );
        if (matched) {
          const matchedModel = matched.models.find((m) => m.name === llmConfig.model);
          if (matchedModel) {
            // 自动迁移到新版配置（使用 llm 对象）
            onChange({
              ...config,
              llm: {
                ...llmConfig,
                provider_id: matched.id,
                model_id: matchedModel.id,
              },
            });
            setSelectedProvider(matched);
          }
        }
      }

      // 尝试迁移回退模型配置
      const fallbackModels = llmConfig.fallback_models;
      if (fallbackModels && fallbackModels.length > 0 && !llmConfig.fallback_configs) {
        const fallbackConfigs: LlmFallbackConfig[] = [];
        for (const fb of fallbackModels) {
          const matchedProvider = providersWithModels.find(
            (p) => p.type === fb.provider && data.find((d: any) => d.id === p.id)?.baseUrl === fb.base_url
          );
          if (matchedProvider) {
            const matchedModel = matchedProvider.models.find((m) => m.name === fb.model);
            fallbackConfigs.push({
              provider_id: matchedProvider.id,
              model_id: matchedModel?.id || null,
            });
          }
        }
        if (fallbackConfigs.length > 0) {
          onChange({
            ...config,
            llm: {
              ...llmConfig,
              fallback_configs: fallbackConfigs,
            },
          });
        }
      }
    } catch (error) {
      console.error("Failed to load providers:", error);
      message.error("加载 Provider 列表失败");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (patch: Partial<OctosProfileConfig>) => {
    // 如果更新的字段是 LLM 相关的，需要更新 llm 对象
    const llmKeys = ["provider_id", "model_id", "provider", "model", "base_url", "api_key_env", "fallback_configs", "fallback_models"];
    const hasLlmKey = Object.keys(patch).some(key => llmKeys.includes(key));

    if (hasLlmKey) {
      // 合并到 llm 对象中
      const currentLlm = getLlmConfig(config);
      const llmPatch: Partial<LlmProfileConfig> = {};
      for (const key of llmKeys) {
        if (key in patch) {
          (llmPatch as any)[key] = (patch as any)[key];
          delete (patch as any)[key];
        }
      }
      onChange({
        ...config,
        ...patch,
        llm: {
          ...currentLlm,
          ...llmPatch,
        },
      });
    } else {
      onChange({ ...config, ...patch });
    }
  };

  // 选择 Provider
  const handleProviderChange = (providerId: string | null) => {
    if (!providerId) {
      setSelectedProvider(null);
      updateConfig({ provider_id: null, model_id: null });
      return;
    }

    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    setSelectedProvider(provider);

    // 默认选择第一个启用的模型
    const firstEnabledModel = provider.models.find((m) => m.enabled);
    updateConfig({
      provider_id: providerId,
      model_id: firstEnabledModel?.id || null,
      // 清除旧模式的配置
      provider: null,
      model: null,
      base_url: null,
      api_key_env: null,
    });
  };

  // 选择模型
  const handleModelChange = (modelId: string | null) => {
    updateConfig({ model_id: modelId });
  };

  // 测试连接
  const handleTest = async () => {
    const llmConfig = getLlmConfig(config);
    if (!llmConfig.provider_id || !llmConfig.model_id) {
      message.warning("请先选择 Provider 和模型");
      return;
    }

    setTestResult({ state: "testing", error: "" });
    try {
      const result = await providerApi.validateApiKey(llmConfig.provider_id);
      if (result.valid) {
        setTestResult({ state: "success", error: "" });
        message.success("连接测试成功");
      } else {
        setTestResult({ state: "error", error: result.message || "连接失败" });
        message.error(result.message || "连接测试失败");
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "请求失败";
      setTestResult({ state: "error", error: errorMsg });
      message.error(errorMsg);
    }
  };

  // 检查是否使用旧模式配置
  const isLegacyMode = isLegacyLlmConfig(config);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Space>
          <Spin />
          <Text type="secondary">加载 Provider 列表...</Text>
        </Space>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <CloudServerOutlined className="text-5xl text-[var(--color-text-tertiary)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
          暂无可用 Provider
        </h3>
        <Text type="secondary" className="text-center">
          请先在 Provider 管理页面添加 Provider
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        message="从已配置的 Providers 中选择，无需重新配置 API Key"
        className="text-xs"
      />

      {/* 旧模式提示 */}
      {isLegacyMode && (
        <Alert
          type="warning"
          showIcon
          message="此 Profile 使用旧版配置方式"
          description="建议重新选择 Provider 以使用新版配置，旧版配置方式可能在未来版本中移除"
          className="text-xs"
          closable
        />
      )}

      {/* Provider 选择 */}
      <Card size="small" className="bg-[var(--color-bg-secondary)]">
        <div className="space-y-4">
          <div>
            <Text type="secondary" className="block mb-2">
              选择 Provider <Text type="danger">*</Text>
            </Text>
            <Select
              className="w-full"
              value={getLlmConfig(config).provider_id || undefined}
              placeholder="请选择 Provider..."
              onChange={handleProviderChange}
              options={providers.map((p) => ({
                label: (
                  <Space>
                    <span>{p.name}</span>
                    <Tag color="blue" className="text-xs">{p.type}</Tag>
                    <Text type="secondary" className="text-xs">
                      {p.models.filter((m) => m.enabled).length} 个可用模型
                    </Text>
                  </Space>
                ),
                value: p.id,
              }))}
              showSearch
              filterOption={(input, option) => {
                const label = option?.label as any;
                const text = typeof label === 'object' && label?.props?.children?.[0] ? label.props.children[0] : '';
                return String(text).toLowerCase().includes(input.toLowerCase());
              }}
            />
          </div>

          {/* 模型选择 */}
          {selectedProvider && (
            <div>
              <Text type="secondary" className="block mb-2">
                选择模型 <Text type="danger">*</Text>
              </Text>
              <Select
                className="w-full"
                value={getLlmConfig(config).model_id || undefined}
                placeholder="请选择模型..."
                onChange={handleModelChange}
                options={selectedProvider.models
                  .filter((m) => m.enabled)
                  .map((m) => ({
                    label: m.name,
                    value: m.id,
                  }))}
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
              <Text type="secondary" className="text-xs mt-1 block">
                {selectedProvider.models.filter((m) => m.enabled).length} 个可用模型
              </Text>
            </div>
          )}

          {/* 测试连接 */}
          {(getLlmConfig(config).provider_id || isLegacyMode) && (
            <div className="flex items-start gap-4 pt-2 border-t border-[var(--color-border)]">
              <Space direction="vertical" size={4} className="flex-1">
                <Button
                  size="small"
                  icon={
                    testResult.state === "testing" ? (
                      <LoadingOutlined />
                    ) : testResult.state === "success" ? (
                      <CheckCircleOutlined />
                    ) : testResult.state === "error" ? (
                      <CloseCircleOutlined />
                    ) : (
                      <ExperimentOutlined />
                    )
                  }
                  loading={testResult.state === "testing"}
                  onClick={handleTest}
                  danger={testResult.state === "error"}
                  type={testResult.state === "success" ? "primary" : "default"}
                  ghost={testResult.state === "success"}
                >
                  {testResult.state === "testing"
                    ? "测试中..."
                    : testResult.state === "success"
                      ? "连接成功"
                      : testResult.state === "error"
                        ? "失败 — 重试"
                        : "测试连接"}
                </Button>
                {testResult.state === "error" && testResult.error && (
                  <Text type="danger" className="text-xs">
                    {testResult.error}
                  </Text>
                )}
              </Space>
            </div>
          )}
        </div>
      </Card>

      {/* 旧模式配置显示 (只读) */}
      {isLegacyMode && (
        <>
          <Divider orientation="left" className="text-xs">
            旧版配置 (只读)
          </Divider>
          <Card size="small" className="bg-[var(--color-bg-tertiary)]">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Text type="secondary" className="block mb-1">Provider</Text>
                <Text>{getLlmConfig(config).provider || "-"}</Text>
              </div>
              <div>
                <Text type="secondary" className="block mb-1">Model</Text>
                <Text>{getLlmConfig(config).model || "-"}</Text>
              </div>
              <div>
                <Text type="secondary" className="block mb-1">Base URL</Text>
                <Text code className="text-xs">{getLlmConfig(config).base_url || "-"}</Text>
              </div>
              <div>
                <Text type="secondary" className="block mb-1">API Key Env</Text>
                <Text code className="text-xs">{getLlmConfig(config).api_key_env || "-"}</Text>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* 回退模型 */}
      <Divider orientation="left" className="text-xs">
        回退模型
      </Divider>
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="回退模型配置"
        description="当主 Provider 失败时，网关将按顺序尝试回退模型"
        className="text-xs"
      />
      {(!getLlmConfig(config).fallback_configs || getLlmConfig(config).fallback_configs!.length === 0) ? (
        <div className="text-center py-4">
          <Text type="secondary" className="text-xs">
            未配置回退模型。如果主 Provider 失败，网关将重试同一 Provider。
          </Text>
        </div>
      ) : (
        <div className="space-y-3">
          {getLlmConfig(config).fallback_configs!.map((fb, idx) => {
            const fbProvider = providers.find((p) => p.id === fb.provider_id);
            return (
              <Card
                key={idx}
                size="small"
                className="bg-[var(--color-bg-secondary)]"
                extra={
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      const currentFallbacks = getLlmConfig(config).fallback_configs || [];
                      const newFallbacks = currentFallbacks.filter((_, i) => i !== idx);
                      updateConfig({ fallback_configs: newFallbacks });
                    }}
                  />
                }
              >
                <div className="flex items-center gap-2 mb-2">
                  <Tag color="orange">回退 #{idx + 1}</Tag>
                </div>
                <div className="space-y-2">
                  <Select
                    className="w-full"
                    value={fb.provider_id || undefined}
                    placeholder="选择 Provider..."
                    onChange={(providerId) => {
                      const provider = providers.find((p) => p.id === providerId);
                      const currentFallbacks = getLlmConfig(config).fallback_configs || [];
                      const newFallbacks = [...currentFallbacks];
                      newFallbacks[idx] = {
                        provider_id: providerId,
                        model_id: provider?.models.find((m) => m.enabled)?.id || null,
                      };
                      updateConfig({ fallback_configs: newFallbacks });
                    }}
                    options={providers.map((p) => ({
                      label: (
                        <Space>
                          <span>{p.name}</span>
                          <Tag color="blue" className="text-xs">{p.type}</Tag>
                        </Space>
                      ),
                      value: p.id,
                    }))}
                    showSearch
                    size="small"
                  />
                  {fbProvider && (
                    <Select
                      className="w-full"
                      value={fb.model_id || undefined}
                      placeholder="选择模型..."
                      onChange={(modelId) => {
                        const currentFallbacks = getLlmConfig(config).fallback_configs || [];
                        const newFallbacks = [...currentFallbacks];
                        newFallbacks[idx] = {
                          ...newFallbacks[idx],
                          model_id: modelId,
                        };
                        updateConfig({ fallback_configs: newFallbacks });
                      }}
                      options={fbProvider.models
                        .filter((m) => m.enabled)
                        .map((m) => ({
                          label: m.name,
                          value: m.id,
                        }))}
                      showSearch
                      size="small"
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Button
        size="small"
        icon={<PlusOutlined />}
        onClick={() => {
          const currentFallbacks = getLlmConfig(config).fallback_configs || [];
          const newFallbacks = [...currentFallbacks, { provider_id: null, model_id: null }];
          updateConfig({ fallback_configs: newFallbacks });
        }}
      >
        添加回退模型
      </Button>
    </div>
  );
}
