/**
 * Octos LLM Provider 配置 — 复用 Provider 管理
 * 从已配置的 Providers 中选择，而不是重新配置
 */

import { useState, useMemo, useCallback, useEffect } from "react";
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
  ReloadOutlined,
  CloudServerOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { OctosProfileConfig } from "@/types/octos";
import { providerApi } from "@/services";

const { Text } = Typography;

interface TestState {
  state: "idle" | "testing" | "success" | "error";
  error: string;
}

interface ProviderWithModels {
  id: string;
  name: string;
  type: string;
  models: { id: string; name: string; enabled: boolean }[];
}

interface Props {
  config: OctosProfileConfig;
  onChange: (config: OctosProfileConfig) => void;
  profileId?: string;
}

export default function OctosLlmProviderTab({ config, onChange, profileId }: Props) {
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
      const providersWithModels: ProviderWithModels[] = data.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        models: (p.models || []).map((m) => ({
          id: m.id,
          name: m.name,
          enabled: m.enabled ?? true,
        })),
      }));
      setProviders(providersWithModels);

      // 如果当前配置了 provider_id，则设置选中的 provider
      if (config.provider_id) {
        const current = providersWithModels.find((p) => p.id === config.provider_id);
        setSelectedProvider(current || null);
      }
    } catch (error) {
      console.error("Failed to load providers:", error);
      message.error("加载 Provider 列表失败");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (patch: Partial<OctosProfileConfig>) => {
    onChange({ ...config, ...patch });
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
    if (!config.provider_id || !config.model_id) {
      message.warning("请先选择 Provider 和模型");
      return;
    }

    setTestResult({ state: "testing", error: "" });
    try {
      const result = await providerApi.validateApiKey(config.provider_id);
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
  const isLegacyMode = !config.provider_id && config.provider;

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
              value={config.provider_id || undefined}
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
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
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
                value={config.model_id || undefined}
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
          {(config.provider_id || isLegacyMode) && (
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

      {/* 回退模型 - 暂时保留，未来也可以改为复用 Provider */}
      <Divider orientation="left" className="text-xs">
        回退模型
      </Divider>
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="回退模型配置"
        description="当前版本回退模型仍使用旧版配置方式，未来版本将支持从 Provider 管理中选择"
        className="text-xs"
      />
      {(!config.fallback_models || config.fallback_models.length === 0) ? (
        <Text type="secondary" className="text-xs italic">
          未配置回退模型。如果主 Provider 失败，网关将重试同一 Provider。
        </Text>
      ) : (
        <div className="space-y-2">
          {config.fallback_models.map((fb, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            >
              <Space>
                <Tag>回退 #{idx + 1}</Tag>
                <Text>{fb.provider}</Text>
                <Text type="secondary">{fb.model || "默认模型"}</Text>
              </Space>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
