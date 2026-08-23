/**
 * Octos LLM provider configuration - reuses provider management
 * Select from configured providers instead of reconfiguring
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
import type {
  OctosProfileConfig,
  LlmModelSelectionConfig,
} from "@/types/octos";
import { providerApi } from "@/services";

const { Text } = Typography;

// ==================== Helpers: handle old/new structures ====================

/**
 * Get primary model configuration, preferring llm.primary.route.route_id
 */
function getPrimaryProviderId(config: OctosProfileConfig): string | null {
  if (config.llm?.primary?.route?.route_id) {
    return config.llm.primary.route.route_id;
  }
  return config.provider_id || null;
}

/**
 * Get primary model ID, preferring llm.primary.model_id
 */
function getPrimaryModelId(config: OctosProfileConfig): string | null {
  if (config.llm?.primary?.model_id) {
    return config.llm.primary.model_id;
  }
  return config.model_id || null;
}

/**
 * Get the primary model's database ID (for the Select value)
 * Need to look up the id in providers by model_id (name)
 */
function getPrimaryModelDbId(
  config: OctosProfileConfig,
  providers: ProviderWithModels[],
): string | null {
  const modelName = getPrimaryModelId(config);
  const providerId = getPrimaryProviderId(config);
  if (!modelName || !providerId) return null;

  const provider = providers.find((p) => p.id === providerId);
  if (!provider) return null;

  const model = provider.models.find((m) => m.name === modelName);
  return model?.id || null;
}

/**
 * Get fallback configuration list, preferring llm.fallbacks
 */
function getFallbackConfigs(
  config: OctosProfileConfig,
): LlmModelSelectionConfig[] {
  if (config.llm?.fallbacks) {
    return config.llm.fallbacks;
  }
  // Convert from the old structure
  if (config.fallback_configs) {
    return config.fallback_configs.map((fb) => ({
      route: {
        route_id: fb.provider_id || undefined,
      },
      model_id: fb.model_id || undefined,
    }));
  }
  return [];
}

/**
 * Get family_id from the provider object (i.e. provider.type)
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
  const [testResult, setTestResult] = useState<TestState>({
    state: "idle",
    error: "",
  });
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderWithModels | null>(null);

  // Load providers list
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

      // Get current configuration
      const currentProviderId = getPrimaryProviderId(config);

      // If provider_id is configured, set the selected provider
      if (currentProviderId) {
        const current = providersWithModels.find(
          (p) => p.id === currentProviderId,
        );
        setSelectedProvider(current || null);
      } else if (config.provider && config.base_url) {
        // Try matching a provider from legacy configuration
        const matched = providersWithModels.find(
          (p) =>
            p.type === config.provider &&
            data.find((d: any) => d.id === p.id)?.baseUrl === config.base_url,
        );
        if (matched) {
          const matchedModel = matched.models.find(
            (m) => m.name === config.model,
          );
          if (matchedModel) {
            // Auto-migrate to the new config (using the llm object)
            onChange({
              ...config,
              llm: {
                primary: {
                  family_id: matched.type,
                  model_id: matchedModel.name,
                  route: {
                    route_id: matched.id,
                  },
                },
                fallbacks: [],
              },
            });
            setSelectedProvider(matched);
          }
        }
      }

      // Try migrating fallback model configuration
      if (
        config.fallback_models &&
        config.fallback_models.length > 0 &&
        !config.llm?.fallbacks
      ) {
        const fallbacks: LlmModelSelectionConfig[] = [];
        for (const fb of config.fallback_models) {
          const matchedProvider = providersWithModels.find(
            (p) =>
              p.type === fb.provider &&
              data.find((d: any) => d.id === p.id)?.baseUrl === fb.base_url,
          );
          if (matchedProvider) {
            const matchedModel = matchedProvider.models.find(
              (m) => m.name === fb.model,
            );
            fallbacks.push({
              family_id: matchedProvider.type,
              model_id: matchedModel?.name,
              route: {
                route_id: matchedProvider.id,
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

  // Select provider
  const handleProviderChange = (providerId: string | null) => {
    if (!providerId) {
      setSelectedProvider(null);
      // Clear configuration
      onChange({
        ...config,
        llm: {
          ...config.llm,
          primary: null,
        },
      });
      return;
    }

    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    setSelectedProvider(provider);

    // Select the first enabled model by default
    const firstEnabledModel = provider.models.find((m) => m.enabled);

    // Build the new llm config directly
    onChange({
      ...config,
      llm: {
        ...config.llm,
        primary: {
          family_id: provider.type,
          model_id: firstEnabledModel?.name,
          route: {
            route_id: providerId,
          },
        },
      },
    });
  };

  // Select model
  const handleModelChange = (modelId: string | null) => {
    const providerId = getPrimaryProviderId(config);
    const provider = providerId
      ? providers.find((p) => p.id === providerId)
      : null;

    // Find the model by modelId (id), then save model.name
    const model = provider?.models.find((m) => m.id === modelId);

    onChange({
      ...config,
      llm: {
        ...config.llm,
        primary: provider
          ? {
              family_id: getFamilyId(provider),
              model_id: model?.name,
              route: {
                route_id: providerId || undefined,
              },
            }
          : null,
      },
    });
  };

  // Test connection
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
        title="从已配置的 Providers 中选择，无需重新配置 API Key"
        className="text-xs"
      />

      {/* Provider selection */}
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
                    <Tag color="blue" className="text-xs">
                      {p.type}
                    </Tag>
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
                const text =
                  typeof label === "object" && label?.props?.children?.[0]
                    ? label.props.children[0]
                    : "";
                return String(text).toLowerCase().includes(input.toLowerCase());
              }}
            />
          </div>

          {/* Model selection */}
          {selectedProvider && (
            <div>
              <Text type="secondary" className="block mb-2">
                选择模型 <Text type="danger">*</Text>
              </Text>
              <Select
                className="w-full"
                value={getPrimaryModelDbId(config, providers) || undefined}
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
                  (option?.label as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
              <Text type="secondary" className="text-xs mt-1 block">
                {selectedProvider.models.filter((m) => m.enabled).length}{" "}
                个可用模型
              </Text>
            </div>
          )}

          {/* Test connection */}
          {getPrimaryProviderId(config) && (
            <div className="flex items-start gap-4 pt-2 border-t border-(--color-border)">
              <Space orientation="vertical" size={4} className="flex-1">
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

      {/* Fallback models */}
      <Divider titlePlacement="left" className="text-xs">
        回退模型
      </Divider>
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        title="回退模型配置"
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
            const fbProviderId = fb.route?.route_id;
            const fbProvider = fbProviderId
              ? providers.find((p) => p.id === fbProviderId)
              : null;
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
                      const newFallbacks = currentFallbacks.filter(
                        (_, i) => i !== idx,
                      );
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
                      const provider = providers.find(
                        (p) => p.id === providerId,
                      );
                      const currentFallbacks = getFallbackConfigs(config);
                      const newFallbacks = [...currentFallbacks];
                      newFallbacks[idx] = {
                        family_id: provider ? getFamilyId(provider) : undefined,
                        model_id: provider?.models.find((m) => m.enabled)?.name,
                        route: providerId
                          ? { route_id: providerId }
                          : undefined,
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
                          <Tag color="blue" className="text-xs">
                            {p.type}
                          </Tag>
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
                      value={
                        fb.model_id
                          ? fbProvider.models.find((m) => m.name === fb.model_id)
                              ?.id
                          : undefined
                      }
                      placeholder="选择模型..."
                      onChange={(modelDbId) => {
                        // Find the model by modelDbId, then save model.name
                        const model = fbProvider.models.find(
                          (m) => m.id === modelDbId,
                        );
                        const currentFallbacks = getFallbackConfigs(config);
                        const newFallbacks = [...currentFallbacks];
                        newFallbacks[idx] = {
                          ...newFallbacks[idx],
                          model_id: model?.name,
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
          const newFallbacks = [
            ...currentFallbacks,
            { route: { route_id: undefined }, model_id: undefined },
          ];
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
