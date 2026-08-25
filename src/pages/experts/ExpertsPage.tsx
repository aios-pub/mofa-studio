/**
 * 专家体系 (TASK-14): 专家卡片浏览（行业分类）· 召唤进对话 · 我的专家 ·
 * 分享导出/导入。召唤 = 跳转对话并携带专家 id（Conversation 注入人设
 * system prompt + 预选工具链）。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Modal, Tag, message } from "antd";
import { PlusOutlined, UserAddOutlined, ExportOutlined } from "@ant-design/icons";
import {
  BUILTIN_EXPERTS,
  exportExpertJson,
  loadMyExperts,
  parseExpertJson,
  saveMyExperts,
  type Expert,
} from "@/utils/experts";

function downloadCard(expert: Expert) {
  const blob = new Blob([exportExpertJson(expert)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `expert-${expert.name}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ExpertsPage() {
  const navigate = useNavigate();
  const [mine, setMine] = useState<Expert[]>(loadMyExperts);
  const [industry, setIndustry] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", industry: "", persona: "", methodology: "" });
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveMyExperts(mine);
  }, [mine]);

  const all = useMemo(() => [...mine, ...BUILTIN_EXPERTS], [mine]);
  const industries = useMemo(
    () => ["all", ...Array.from(new Set(all.map((e) => e.industry)))],
    [all],
  );
  const visible = industry === "all" ? all : all.filter((e) => e.industry === industry);

  const summon = (expert: Expert) => {
    navigate(`/?expert=${expert.id}`);
  };

  const createMine = () => {
    if (!draft.name.trim() || !draft.persona.trim()) {
      message.warning("名称与人设必填");
      return;
    }
    const expert: Expert = {
      id: `expert-${Date.now()}`,
      name: draft.name.trim().slice(0, 30),
      industry: draft.industry.trim().slice(0, 12) || "自定义",
      persona: draft.persona.trim().slice(0, 500),
      methodology: draft.methodology.trim().slice(0, 500),
      tools: [],
      avatar: "👤",
      builtin: false,
    };
    setMine((prev) => [expert, ...prev]);
    setCreating(false);
    setDraft({ name: "", industry: "", persona: "", methodology: "" });
    message.success(`已创建「${expert.name}」`);
  };

  const importCard = async (file: File) => {
    const text = await file.text();
    const result = parseExpertJson(text);
    if (!result.ok) {
      message.error(`导入失败：${result.reason}`);
      return;
    }
    setMine((prev) => [result.expert, ...prev]);
    message.success(`已导入「${result.expert.name}」`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">专家</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            以什么身份、什么视角处理 —— 召唤后整段对话按该专家的人设与方法作答
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={<UserAddOutlined />} onClick={() => setCreating(true)} aria-label="创建我的专家">
            我的专家
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => importRef.current?.click()} aria-label="导入专家卡片">
            导入
          </Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importCard(file);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      <div className="flex flex-wrap gap-2" aria-label="行业分类">
        {industries.map((i) => (
          <button
            key={i}
            onClick={() => setIndustry(i)}
            aria-pressed={industry === i}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              industry === i
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                : "border-(--color-border) text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {i === "all" ? "全部" : i}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map((expert) => (
          <div
            key={expert.id}
            className="rounded-xl border border-(--color-border) p-4 space-y-2 flex flex-col"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {expert.avatar}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold truncate">{expert.name}</h3>
                  {expert.builtin ? <Tag>内置</Tag> : <Tag color="blue">我的</Tag>}
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)]">{expert.industry}</p>
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3">{expert.persona}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-2">{expert.methodology}</p>
            <div className="flex gap-2 pt-1">
              <Button type="primary" size="small" onClick={() => summon(expert)} aria-label={`召唤 ${expert.name}`}>
                召唤进对话
              </Button>
              <Button
                size="small"
                icon={<ExportOutlined />}
                onClick={() => downloadCard(expert)}
                aria-label={`导出 ${expert.name}`}
              >
                分享
              </Button>
              {!expert.builtin && (
                <Button
                  size="small"
                  danger
                  onClick={() => {
                    setMine((prev) => prev.filter((e) => e.id !== expert.id));
                    message.info(`已删除「${expert.name}」`);
                  }}
                  aria-label={`删除 ${expert.name}`}
                >
                  删除
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        title="创建我的专家"
        open={creating}
        onOk={() => createMine()}
        onCancel={() => setCreating(false)}
        okText="创建"
        cancelText="取消"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">名称 *</label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              aria-label="专家名称"
              placeholder="例如：跨境电商运营"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">行业</label>
            <Input
              value={draft.industry}
              onChange={(e) => setDraft((d) => ({ ...d, industry: e.target.value }))}
              aria-label="专家行业"
              placeholder="例如：电商"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">人设 *（它是谁、怎么说话）</label>
            <Input.TextArea
              value={draft.persona}
              onChange={(e) => setDraft((d) => ({ ...d, persona: e.target.value }))}
              aria-label="专家人设"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">方法论（怎么干活）</label>
            <Input.TextArea
              value={draft.methodology}
              onChange={(e) => setDraft((d) => ({ ...d, methodology: e.target.value }))}
              aria-label="专家方法论"
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
