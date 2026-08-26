import { useTranslation } from "react-i18next";
/**
 * Web-search BYOK card (CHAT-03 收尾): provider + key, saved server-side.
 * Mounted on the key-setup page below the LLM wizard.
 */

import { useEffect, useState } from "react";
import { Button, Input, Select, Tag, message } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import {
  SEARCH_PROVIDERS,
  searchConfigService,
  validateSearchKey,
  type SearchProvider,
} from "@/services/api/searchConfig";

export default function SearchConfigCard() {  const { t } = useTranslation();

  const [provider, setProvider] = useState<SearchProvider>("tavily");
  const [apiKey, setApiKey] = useState("");
  const [configured, setConfigured] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void searchConfigService.get().then((state) => {
      if (state.configured) {
        setConfigured(`${state.provider}（${state.api_key_masked}）`);
        if (state.provider !== "none") setProvider(state.provider as SearchProvider);
      }
    });
  }, []);

  const validation = apiKey ? validateSearchKey(apiKey) : null;
  const active = SEARCH_PROVIDERS.find((p) => p.value === provider)!;

  const save = async () => {
    const check = validateSearchKey(apiKey);
    if (!check.ok) {
      message.warning(check.reason);
      return;
    }
    setSaving(true);
    const ok = await searchConfigService.save(provider, apiKey);
    setSaving(false);
    if (ok) {
      setConfigured(t("{{p0}}（已保存）", { p0: provider }));
      setApiKey("");
      message.success(t("搜索配置已保存，密钥仅存本机服务端"));
    } else {
      message.error(t("保存失败，请检查 Key 是否有效"));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 p-6 rounded-2xl border border-(--color-border) bg-[var(--color-bg-secondary)] space-y-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
        <GlobalOutlined className="text-[var(--color-primary)]" />
        联网搜索（可选）
      </h3>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        配置后对话中的「联网」开关即可检索引用。密钥保存在本机服务端，前端不留明文。
      </p>

      {configured && (
        <p className="text-xs">
          <Tag color="green">{t("已配置")}</Tag>
          {configured}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">{t("搜索厂商")}</label>
        <Select
          value={provider}
          onChange={(value) => setProvider(value)}
          options={SEARCH_PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
          style={{ width: "100%" }}
          aria-label={t("搜索厂商选择")}
        />
        <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
          {active.hint}{" "}
          <a href={active.applyUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)]">
            去申请 Key
          </a>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t("搜索 API Key")}</label>
        <Input.Password
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t("粘贴搜索 API Key")}
          aria-label={t("搜索 API Key 输入")}
        />
        {validation && !validation.ok && (
          <p className="mt-1 text-xs text-red-400">{validation.reason}</p>
        )}
      </div>

      <Button
        block
        loading={saving}
        disabled={!validation?.ok}
        onClick={save}
        aria-label={t("保存搜索配置")}
      >
        保存搜索配置
      </Button>
    </div>
  );
}
