/**
 * Octos LLM Provider 配置 — 移植自 Octos LlmProviderTab
 * 使用 Ant Design 组件替代 Tailwind 原生组件
 */

import { useState, useMemo } from "react";
import {
  Select,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Tag,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import type { OctosProfileConfig, OctosFallbackModel } from "@/types/octos";
import { OCTOS_PROVIDER_CATALOG, OCTOS_PROVIDER_NAMES } from "@/services";
import type { OctosApiClient } from "@/services/real/octos";

const { Text } = Typography;

const CUSTOM_PROVIDER = "__custom__";

interface ModelEndpoint {
  id: string;
  label: string;
  base_url?: string;
  api_key_env?: string;
}

interface ModelEntry {
  id: string;
  input: number;
  output: number;
  max_output: number;
  endpoints?: ModelEndpoint[];
}

type TestState = "idle" | "testing" | "success" | "error";
interface TestResult {
  state: TestState;
  error: string;
  pricing: ModelEntry | null;
}

interface Props {
  config: OctosProfileConfig;
  onChange: (config: OctosProfileConfig) => void;
  profileId?: string;
  apiClient: OctosApiClient;
}

function isKnownProvider(provider: string | null | undefined): boolean {
  return !!provider && OCTOS_PROVIDER_NAMES.includes(provider);
}

function getApiKeyEnvName(provider: string | null | undefined): string {
  const entry = OCTOS_PROVIDER_CATALOG[provider || ""];
  return entry?.env || `${(provider || "ANTHROPIC").toUpperCase()}_API_KEY`;
}

function findModelEntry(provider: string | null | undefined, modelId: string | null | undefined): ModelEntry | undefined {
  if (!provider || !modelId) return undefined;
  return (OCTOS_PROVIDER_CATALOG[provider]?.models || []).find((m: any) => m.id === modelId) as ModelEntry | undefined;
}

function getModelIds(provider: string, fetched?: Record<string, string[]>): string[] {
  const staticIds = (OCTOS_PROVIDER_CATALOG[provider]?.models || []).map((m: any) => m.id);
  const dynamicIds = fetched?.[provider] || [];
  const seen = new Set(staticIds);
  const merged = [...staticIds];
  for (const id of dynamicIds) {
    if (!seen.has(id)) {
      merged.push(id);
      seen.add(id);
    }
  }
  return merged;
}

function formatPrice(p: ModelEntry): string {
  if (p.input === 0 && p.output === 0) return "Free (local)";
  return `$${p.input}/M in, $${p.output}/M out`;
}

function getFallbackEnvName(provider: string, index: number, allFallbacks: OctosFallbackModel[], primaryEnv: string): string {
  const baseEnv = getApiKeyEnvName(provider);
  if (!baseEnv) return `FALLBACK_${index}_API_KEY`;
  const usedByPrimary = primaryEnv === baseEnv;
  const usedByEarlierFallback = allFallbacks.some(
    (fb, i) => i < index && (fb.api_key_env || getApiKeyEnvName(fb.provider)) === baseEnv,
  );
  if (!usedByPrimary && !usedByEarlierFallback) return baseEnv;
  if (usedByPrimary && !usedByEarlierFallback) return baseEnv;
  return `${baseEnv}_${index + 1}`;
}

export default function OctosLlmProviderTab({ config, onChange, apiClient }: Props) {
  const primaryEnv = config.api_key_env || getApiKeyEnvName(config.provider);
  const fallbacks = config.fallback_models || [];
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});
  const [fetchedModels, setFetchedModels] = useState<Record<string, string[]>>({});

  const updateConfig = (patch: Partial<OctosProfileConfig>) => {
    onChange({ ...config, ...patch });
  };

  const changePrimaryProvider = (provider: string | null) => {
    const modelId = getModelIds(provider || "", fetchedModels)[0] || null;
    const modelEntry = findModelEntry(provider, modelId);
    const ep = modelEntry?.endpoints?.[0];
    const envName = ep?.api_key_env || getApiKeyEnvName(provider);
    updateConfig({
      provider,
      model: modelId,
      api_key_env: envName,
      base_url: ep?.base_url ?? (isKnownProvider(provider) ? null : config.base_url ?? null),
    });
  };

  const changePrimaryModel = (modelId: string) => {
    const modelEntry = findModelEntry(config.provider, modelId);
    const ep = modelEntry?.endpoints?.[0];
    const envName = ep?.api_key_env || getApiKeyEnvName(config.provider);
    updateConfig({
      model: modelId,
      api_key_env: envName,
      base_url: ep?.base_url ?? null,
    });
  };

  const changePrimaryKey = (value: string) => {
    const newEnvVars = { ...config.env_vars };
    if (value) {
      newEnvVars[primaryEnv] = value;
    } else {
      delete newEnvVars[primaryEnv];
    }
    updateConfig({ api_key_env: primaryEnv, env_vars: newEnvVars });
  };

  const addFallback = () => {
    const provider = "deepseek";
    const models = getModelIds(provider, fetchedModels);
    const env = getFallbackEnvName(provider, 0, fallbacks, primaryEnv);
    updateConfig({
      fallback_models: [{ provider, model: models[0] || null, api_key_env: env }, ...fallbacks],
    });
  };

  const updateFallback = (idx: number, patch: Partial<OctosFallbackModel>) => {
    const updated = fallbacks.map((fb, i) => (i === idx ? { ...fb, ...patch } : fb));
    updateConfig({ fallback_models: updated });
  };

  const removeFallback = (idx: number) => {
    updateConfig({ fallback_models: fallbacks.filter((_, i) => i !== idx) });
  };

  const moveFallback = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= fallbacks.length) return;
    const updated = [...fallbacks];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    updateConfig({ fallback_models: updated });
  };

  const changeFallbackProvider = (idx: number, provider: string) => {
    const modelId = getModelIds(provider, fetchedModels)[0] || null;
    const modelEntry = findModelEntry(provider, modelId);
    const ep = modelEntry?.endpoints?.[0];
    const envName = ep?.api_key_env || getFallbackEnvName(provider, idx, fallbacks, primaryEnv);
    updateFallback(idx, {
      provider,
      model: modelId,
      api_key_env: envName,
      base_url: ep?.base_url ?? null,
    });
  };

  const updateFallbackEnvVar = (idx: number, fbEnv: string, value: string) => {
    const newEnvVars = { ...config.env_vars };
    if (value) {
      newEnvVars[fbEnv] = value;
    } else {
      delete newEnvVars[fbEnv];
    }
    const updated = fallbacks.map((fb, i) => (i === idx ? { ...fb, api_key_env: fbEnv } : fb));
    updateConfig({ env_vars: newEnvVars, fallback_models: updated });
  };

  const doTest = async (key: number, provider: string, model: string, apiKeyEnv: string, baseUrl?: string | null) => {
    const apiKey = config.env_vars[apiKeyEnv] || "";
    if (!apiKey) {
      setTestResults((s) => ({ ...s, [key]: { state: "error", error: "未配置 API Key", pricing: null } }));
      return;
    }
    if (!model) {
      setTestResults((s) => ({ ...s, [key]: { state: "error", error: "未选择模型", pricing: null } }));
      return;
    }
    setTestResults((s) => ({ ...s, [key]: { state: "testing", error: "", pricing: null } }));
    try {
      const isMasked = apiKey.includes("***");
      const res = await apiClient.testProvider({
        provider,
        model,
        api_key: isMasked ? undefined : apiKey,
        api_key_env: isMasked ? apiKeyEnv : undefined,
        base_url: baseUrl || undefined,
      });
      const pricing = findModelEntry(provider, model) || null;
      if (res.ok) {
        setTestResults((s) => ({ ...s, [key]: { state: "success", error: "", pricing } }));
        if (res.models && res.models.length > 0) {
          setFetchedModels((s) => ({ ...s, [provider]: res.models! }));
        }
      } else {
        setTestResults((s) => ({ ...s, [key]: { state: "error", error: res.error || "未知错误", pricing: null } }));
      }
    } catch (e: unknown) {
      setTestResults((s) => ({
        ...s,
        [key]: { state: "error", error: e instanceof Error ? e.message : "请求失败", pricing: null },
      }));
    }
  };

  // Provider select value
  const known = isKnownProvider(config.provider);
  const isFullyCustom = !!config.provider && !known;
  const providerSelectValue = !config.provider ? undefined : known ? config.provider : CUSTOM_PROVIDER;

  // Model list for primary provider
  const providerModels = useMemo(() => {
    const staticModels = OCTOS_PROVIDER_CATALOG[config.provider || ""]?.models || [];
    const staticIds = staticModels.map((m: any) => m.id);
    const dynamicIds = (fetchedModels[config.provider || ""] || []).filter((id) => !staticIds.includes(id));
    return [...staticModels, ...dynamicIds.map((id) => ({ id, input: 0, output: 0, max_output: 0 }))];
  }, [config.provider, fetchedModels]);

  const modelSelectValue = config.model || undefined;

  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        message="配置 LLM Provider 以启动网关。可配置回退模型实现自动故障切换。"
        className="text-xs"
      />

      {/* Primary Provider */}
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] space-y-3">
        <Text strong>主 Provider</Text>

        <div>
          <Text type="secondary" className="block mb-1">Provider</Text>
          <Select
            className="w-full"
            value={providerSelectValue}
            placeholder="选择 Provider..."
            onChange={(v) => {
              if (v === CUSTOM_PROVIDER) {
                changePrimaryProvider("");
              } else {
                changePrimaryProvider(v || null);
              }
            }}
            options={[
              ...OCTOS_PROVIDER_NAMES.map((p) => ({ label: p, value: p })),
              { label: isFullyCustom ? `自定义: ${config.provider}` : "自定义 API...", value: CUSTOM_PROVIDER },
            ]}
          />
        </div>

        {isFullyCustom && (
          <>
            <div>
              <Text type="secondary" className="block mb-1">自定义 Provider 名称</Text>
              <Input
                value={config.provider || ""}
                onChange={(e) => changePrimaryProvider(e.target.value)}
                placeholder="my-endpoint"
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Text type="secondary" className="block mb-1">Base URL</Text>
              <Input
                value={config.base_url || ""}
                onChange={(e) => updateConfig({ base_url: e.target.value || null })}
                placeholder="https://example.com/v1"
                className="font-mono text-xs"
              />
            </div>
          </>
        )}

        <div>
          <Text type="secondary" className="block mb-1">模型</Text>
          <Select
            className="w-full"
            showSearch
            value={modelSelectValue}
            placeholder="选择模型..."
            onChange={changePrimaryModel}
            options={providerModels.map((m: any) => ({
              label: m.input === 0 && m.output === 0
                ? m.id
                : `${m.id} — $${m.input}/$${m.output} per 1M tokens`,
              value: m.id,
            }))}
          />
        </div>

        <div>
          <Text type="secondary" className="block mb-1">
            API Key <Text className="text-xs">({primaryEnv})</Text>
          </Text>
          <Input.Password
            value={config.env_vars[primaryEnv] || ""}
            onChange={(e) => changePrimaryKey(e.target.value)}
            placeholder={`粘贴 ${config.provider || "provider"} API Key`}
            className="font-mono text-xs"
          />
        </div>

        <TestButton
          result={testResults[-1] || null}
          onTest={() => doTest(-1, config.provider || "anthropic", config.model || "", primaryEnv, config.base_url)}
        />
      </div>

      {/* Fallback Models */}
      <Divider orientation="left" className="text-xs">
        回退模型
      </Divider>

      <div className="flex justify-end">
        <Button size="small" icon={<PlusOutlined />} onClick={addFallback}>
          添加回退
        </Button>
      </div>

      {fallbacks.length === 0 && (
        <Text type="secondary" className="text-xs italic">
          未配置回退模型。如果主 Provider 失败，网关将重试同一 Provider。
        </Text>
      )}

      {fallbacks.map((fb, idx) => {
        const fbEnv = fb.api_key_env || getApiKeyEnvName(fb.provider);
        const fbModels = getModelIds(fb.provider, fetchedModels);
        return (
          <div
            key={idx}
            className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <Space>
                <Tag>回退 #{idx + 1}</Tag>
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowUpOutlined />}
                  disabled={idx === 0}
                  onClick={() => moveFallback(idx, -1)}
                />
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowDownOutlined />}
                  disabled={idx === fallbacks.length - 1}
                  onClick={() => moveFallback(idx, 1)}
                />
              </Space>
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeFallback(idx)}
              />
            </div>

            <div>
              <Text type="secondary" className="block mb-1">Provider</Text>
              <Select
                className="w-full"
                value={fb.provider || undefined}
                onChange={(v) => changeFallbackProvider(idx, v)}
                options={OCTOS_PROVIDER_NAMES.map((p) => ({ label: p, value: p }))}
              />
            </div>

            <div>
              <Text type="secondary" className="block mb-1">模型</Text>
              <Select
                className="w-full"
                showSearch
                value={fb.model || undefined}
                onChange={(v) => updateFallback(idx, { model: v })}
                options={fbModels.map((id) => ({ label: id, value: id }))}
              />
            </div>

            <div>
              <Text type="secondary" className="block mb-1">
                API Key <Text className="text-xs">({fbEnv})</Text>
              </Text>
              <Input.Password
                value={config.env_vars[fbEnv] || ""}
                onChange={(e) => updateFallbackEnvVar(idx, fbEnv, e.target.value)}
                placeholder={`粘贴 ${fb.provider} API Key`}
                className="font-mono text-xs"
              />
            </div>

            <TestButton
              result={testResults[idx] || null}
              onTest={() => doTest(idx, fb.provider, fb.model || "", fbEnv, fb.base_url)}
            />
          </div>
        );
      })}
    </div>
  );
}

function TestButton({ result, onTest }: { result: TestResult | null; onTest: () => void }) {
  const state = result?.state || "idle";
  return (
    <Space direction="vertical" size={4}>
      <Button
        size="small"
        icon={
          state === "testing" ? (
            <LoadingOutlined />
          ) : state === "success" ? (
            <CheckCircleOutlined />
          ) : state === "error" ? (
            <CloseCircleOutlined />
          ) : (
            <ExperimentOutlined />
          )
        }
        loading={state === "testing"}
        onClick={onTest}
        danger={state === "error"}
        type={state === "success" ? "primary" : "default"}
        ghost={state === "success"}
      >
        {state === "testing"
          ? "测试中..."
          : state === "success"
            ? "连接成功"
            : state === "error"
              ? "失败 — 重试"
              : "测试连接"}
      </Button>
      {state === "success" && result?.pricing && (
        <Text type="success" className="text-xs">
          {formatPrice(result.pricing)}
        </Text>
      )}
      {state === "error" && result?.error && (
        <Text type="danger" className="text-xs">{result.error}</Text>
      )}
    </Space>
  );
}
