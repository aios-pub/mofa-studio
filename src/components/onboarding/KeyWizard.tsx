/**
 * BYOK key configuration wizard (ONBOARD-02).
 *
 * Vendor picker (国内可达优先) → official apply-page deep link → paste key
 * (validated on paste, masked) → model name (curated default, editable) →
 * register on the engine → connectivity test. The key is sent to the
 * gateway once and persisted engine-side; the frontend keeps nothing.
 */

import { useMemo, useState } from "react";
import { Button, Input, Select, Steps, message } from "antd";
import {
  CheckCircleOutlined,
  ExportOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { allProviderConfigs } from "@/services/provider/providerConfigs";
import {
  buildRegistration,
  defaultModelFor,
  engineConfigService,
  orderVendorsChinaFirst,
  validateApiKey,
} from "@/services/api/engineConfig";
import { engineService } from "@/services/api/engine";
import { markOnboarded } from "./WelcomeFlow";
import SearchConfigCard from "./SearchConfigCard";

export default function KeyWizard({ onDone }: { onDone?: () => void }) {
  const vendors = useMemo(
    () =>
      orderVendorsChinaFirst(
        allProviderConfigs.filter((v) => v.category === "cloud" && v.api?.defaultBaseUrl),
      ),
    [],
  );
  const [vendorType, setVendorType] = useState<string>(vendors[0]?.type ?? "deepseek");
  const vendor = vendors.find((v) => v.type === vendorType) ?? vendors[0];
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState(() => defaultModelFor(vendorType));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const validation = apiKey ? validateApiKey(apiKey, vendor) : null;

  const handleVendorChange = (type: string) => {
    setVendorType(type);
    setModelName(defaultModelFor(type));
    setApiKey("");
  };

  const handleRegister = async () => {
    const check = validateApiKey(apiKey, vendor);
    if (!check.ok) {
      message.warning(check.reason);
      return;
    }
    setBusy(true);
    try {
      // 1. Register on the engine (key persists engine-side only).
      await engineConfigService.register(
        buildRegistration(vendor, apiKey, modelName),
      );
      // 2. Connectivity test: the engine's model list must now expose the
      //    provider (capabilities refresh happens engine-side on register).
      const models = await engineService.listModels();
      const registered = models.some((m) => m.owned_by === vendor.type);
      if (!registered) {
        message.warning(
          "已注册，但模型列表暂未出现该厂商——请稍后刷新模型列表确认连通",
        );
      }
      setDone(true);
      markOnboarded();
      message.success(`已配置 ${vendor.name}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      message.error(`配置失败：${detail}`);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <>
      <SearchConfigCard />
      <div className="max-w-md mx-auto mt-10 p-8 rounded-2xl border border-(--color-border) bg-[var(--color-bg-secondary)] text-center space-y-4">
        <CheckCircleOutlined className="text-5xl text-green-500" />
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {vendor.name} 配置完成
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          密钥已保存在本机引擎中，前端不保留明文。现在可以在对话中选择该模型开始使用。
        </p>
        <Button type="primary" onClick={onDone} aria-label="完成配置">
          开始使用
        </Button>
      </div>
      </>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-8 rounded-2xl border border-(--color-border) bg-[var(--color-bg-secondary)] space-y-5">
      <Steps
        size="small"
        current={apiKey && validation?.ok ? 1 : 0}
        items={[{ title: "选择厂商" }, { title: "粘贴 Key" }, { title: "连通测试" }]}
      />

      <div>
        <label className="block text-sm font-medium mb-1">厂商（国内可达优先）</label>
        <Select
          value={vendorType}
          onChange={handleVendorChange}
          showSearch
          optionFilterProp="label"
          options={vendors.map((v) => ({
            value: v.type,
            label: `${v.icon} ${v.name}`,
          }))}
          style={{ width: "100%" }}
          aria-label="厂商选择"
        />
      </div>

      <div className="text-xs text-[var(--color-text-tertiary)]">
        {vendor.description}
        {vendor.website && (
          <a
            href={vendor.website}
            target="_blank"
            rel="noreferrer"
            className="ml-2 inline-flex items-center gap-0.5 text-[var(--color-primary)]"
          >
            去申请 Key <ExportOutlined />
          </a>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">API Key</label>
        <Input.Password
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={vendor.api.apiKeyPlaceholder ?? "粘贴你的 API Key"}
          aria-label="API Key 输入"
        />
        {validation && !validation.ok && (
          <p className="mt-1 text-xs text-red-400">{validation.reason}</p>
        )}
        {validation?.ok && (
          <p className="mt-1 text-xs text-green-500">Key 格式看起来正确</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">默认模型（可修改）</label>
        <Input
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          aria-label="默认模型"
        />
      </div>

      <Button
        type="primary"
        block
        loading={busy}
        disabled={!validation?.ok}
        onClick={handleRegister}
        icon={<SafetyOutlined />}
        aria-label="保存并测试连通"
      >
        {busy ? "注册并测试中…" : "保存并测试连通"}
      </Button>

      <p className="text-xs text-[var(--color-text-tertiary)]">
        密钥仅保存在本机引擎配置中，请求由 Rust 层注入，界面与前端存储不留明文。
      </p>
    </div>
  );
}
