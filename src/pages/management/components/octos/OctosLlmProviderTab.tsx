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
import type { OctosProfileConfig, LlmProfileConfig, LlmModelSelectionConfig, LlmFallbackConfig } from "@/types/octos";
import { providerApi } from "@/services";

const { Text } = Typography;

// ==================== 辅助函数：处理新旧结构 ====================

/**
 * 获取主模型配置，优先从 llm.primary.route.provider_id 获取
 */
function getPrimaryProviderId(config: OctosProfileConfig): string | null {
  if (config.llm?.primary?.route?.provider_id) {
    return config.llm.primary.route.provider_id;
  }
  return config.provider_id || null;
}

/**
 * 获取主模型 ID，优先从 llm.primary.model_id 获取
 */
function getPrimaryModelId(config: OctosProfileConfig): string | null {
  if (config.llm?.primary?.model_id) {
    return config.llm.primary.model_id;
  }
  return config.model_id || null;
}

/**
 * 获取回退配置列表，优先从 llm.fallbacks 获取
 */
function getFallbackConfigs(config: OctosProfileConfig): LlmModelSelectionConfig[] {
  if (config.llm?.fallbacks) {
    return config.llm.fallbacks;
  }
  // 从旧结构转换
  if (config.fallback_configs) {
    return config.fallback_configs.map(fb => ({
      route: {
        provider_id: fb.provider_id || undefined,
      },
      model_id: fb.model_id || undefined,
    }));
  }
  return [];
}

/**
 * 检查是否使用旧模式配置
 */
function isLegacyLlmConfig(config: OctosProfileConfig): boolean {
  // 如果有 llm 对象且包含 primary，说明是新版
  if (config.llm?.primary) {
    return false;
  }
  // 如果有 provider 字段但没有 provider_id，说明是旧版
  return !config.provider_id && !!config.provider;
}

/**
 * 从 provider 对象获取 family_id (即 provider.type)
 */
function getFamilyId(provider: ProviderWithModels): string {
  return provider.type;
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

      // 获取当前配置
      const currentProviderId = getPrimaryProviderId(config);

      // 如果当前配置了 provider_id，则设置选中的 provider
      if (currentProviderId) {
        const current = providersWithModels.find((p) => p.id === currentProviderId);
        setSelectedProvider(current || null);
      } else if (config.provider && config.base_url) {
        // 尝试从旧版配置匹配到 Provider
        const matched = providersWithModels.find(
          (p) => p.type === config.provider && data.find((d: any) => d.id === p.id)?.baseUrl === config.base_url
        );
        if (matched) {
          const matchedModel = matched.models.find((m) => m.name === config.model);
          if (matchedModel) {
            // 自动迁移到新版配置（使用 llm 对象）
            onChange({
              ...config,
              llm: {
                primary: {
                  family_id: matched.type,
                  model_id: matchedModel.id,
                  route: {
                    provider_id: matched.id,
                  },
                },
                fallbacks: [],
              },
            });
            setSelectedProvider(matched);
          }
        }
      }

      // 尝试迁移回退模型配置
      if (config.fallback_models && config.fallback_models.length > 0 && !config.llm?.fallbacks) {
        const fallbacks: LlmModelSelectionConfig[] = [];
        for (const fb of config.fallback_models) {
          const matchedProvider = providersWithModels.find(
            (p) => p.type === fb.provider && data.find((d: any) => d.id === p.id)?.baseUrl === fb.base_url
          );
          if (matchedProvider) {
            const matchedModel = matchedProvider.models.find((m) => m.name === fb.model);
            fallbacks.push({
              family_id: matchedProvider.type,
              model_id: matchedModel?.id,
              route: {
                provider_id: matchedProvider.id,
              },
            });
          }
        }
        if (fallbacks.length > 0) {
          onChange({
            ...config,
            llm: {
              ...config.llm,
              fallbacks,
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
    // 处理 LLM 配置更新
    const llmKeys = ["provider_id", "model_id", "provider", "model", "base_url", "api_key_env", "fallback_configs", "fallback_models"];
    const hasLlmKey = Object.keys(patch).some(key => llmKeys.includes(key));

    if (hasLlmKey) {
      // 更新 llm 对象
      const currentLlm = config.llm || { primary: null, fallbacks: [] };
      const newLlm: LlmProfileConfig = { ...currentLlm };

      // 处理主模型配置更新
      if ("provider_id" in patch || "model_id" in patch) {
        const providerId = patch.provider_id !== undefined ? patch.provider_id : getPrimaryProviderId(config);
        const modelId = patch.model_id !== undefined ? patch.model_id : getPrimaryModelId(config);
        const provider = providerId ? providers.find((p) => p.id === providerId) : null;

        newLlm.primary = providerId && modelId ? {
          family_id: provider ? getFamilyId(provider) : undefined,
          model_id: modelId || undefined,
          route: providerId ? { provider_id: providerId } : undefined,
        } : null;
      }

      // 处理回退配置更新
      if ("fallback_configs" in patch) {
        newLlm.fallbacks = (patch.fallback_configs || []).map((fb: LlmFallbackConfig) => {
          const provider = fb.provider_id ? providers.find((p) => p.id === fb.provider_id) : null;
          return {
            family_id: provider ? getFamilyId(provider) : undefined,
            model_id: fb.model_id || undefined,
            route: fb.provider_id ? { provider_id: fb.provider_id } : undefined,
          };
        });
      }

      onChange({
        ...config,
        llm: newLlm,
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
    const providerId = getPrimaryProviderId(config);
    const modelId = getPrimaryModelId(config);

    if (!providerId || !modelId) {
      message.warning("请先选择 Provider 和模型");
      return;
    }

    setTestResult({ state: "testing", error: "" });
    try {
      const result = await providerApi.validateApiKey(providerId);
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
              value={getPrimaryProviderId(config) || undefined}
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
                value={getPrimaryModelId(config) || undefined}
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
          {(getPrimaryProviderId(config) || isLegacyMode) && (
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
                <Text>{config.provider || "-"}</Text>
              </div>
              <div>
                <Text type="secondary" className="block mb-1">Model</Text>
                <Text>{config.model || "-"}</Text>
              </div>
              <div>
                <Text type="secondary" className="block mb-1">Base URL</Text>
                <Text code className="text-xs">{config.base_url || "-"}</Text>
              </div>
              <div>
                <Text type="secondary" className="block mb-1">API Key Env</Text>
                <Text code className="text-xs">{config.api_key_env || "-"}</Text>
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
      {getFallbackConfigs(config).length === 0 ? (
        <div className="text-center py-4">
          <Text type="secondary" className="text-xs">
            未配置回退模型。如果主 Provider 失败，网关将重试同一 Provider。
          </Text>
        </div>
      ) : (
        <div className="space-y-3">
          {getFallbackConfigs(config).map((fb, idx) => {
            const fbProviderId = fb.route?.provider_id;
            const fbProvider = fbProviderId ? providers.find((p) => p.id === fbProviderId) : null;
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
                      const currentFallbacks = getFallbackConfigs(config);
                      const newFallbacks = currentFallbacks.filter((_, i) => i !== idx);
                      onChange({
                        ...config,
                        llm: {
                          ...config.llm,
                          fallbacks: newFallbacks,
                        },
                      });
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
                    value={fbProviderId || undefined}
                    placeholder="选择 Provider..."
                    onChange={(providerId) => {
                      const provider = providers.find((p) => p.id === providerId);
                      const currentFallbacks = getFallbackConfigs(config);
                      const newFallbacks = [...currentFallbacks];
                      newFallbacks[idx] = {
                        family_id: provider ? getFamilyId(provider) : undefined,
                        model_id: provider?.models.find((m) => m.enabled)?.id,
                        route: providerId ? { provider_id: providerId } : undefined,
                      };
                      onChange({
                        ...config,
                        llm: {
                          ...config.llm,
                          fallbacks: newFallbacks,
                        },
                      });
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
                        const currentFallbacks = getFallbackConfigs(config);
                        const newFallbacks = [...currentFallbacks];
                        newFallbacks[idx] = {
                          ...newFallbacks[idx],
                          model_id: modelId,
                        };
                        onChange({
                          ...config,
                          llm: {
                            ...config.llm,
                            fallbacks: newFallbacks,
                          },
                        });
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
          const currentFallbacks = getFallbackConfigs(config);
          const newFallbacks = [...currentFallbacks, { route: { provider_id: undefined }, model_id: undefined }];
          onChange({
            ...config,
            llm: {
              ...config.llm,
              fallbacks: newFallbacks,
            },
          });
        }}
      >
        添加回退模型
      </Button>
    </div>
  );
}
