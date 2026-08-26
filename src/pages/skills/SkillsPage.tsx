import { useTranslation } from "react-i18next";
/**
 * Skill 市场 (TASK-13): 查找安装 / 上传本地技能包 / 自然语言创建 /
 * 启用停用与搜索。安装 = manifest 校验 → 技能库 + CHAT-09 调色板注册
 * （TASK-12：零代码改动即可被路由匹配）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Empty,
  Input,
  Modal,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CloudUploadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { chatService } from "@/services/api/chat";
import { loadCommands, saveCommands } from "@/utils/slashCommands";
import {
  BUILTIN_SKILL_MARKET,
  loadSkills,
  parseManifest,
  saveSkills,
  skillToCommands,
  type InstalledSkill,
  type SkillManifest,
} from "@/utils/skills";

/** Draft prompt for 自然语言创建: the LLM returns a strict manifest. */
const DRAFT_PROMPT = `你是技能打包器。根据用户需求输出一个 JSON 技能 manifest，不要输出其他文字。
格式：{"skill_version":1,"name":"...","description":"...","triggers":["触发词",...],"commands":[{"name":"指令名","template":"...{{槽位}}..."}]}
要求：name ≤10 字；triggers 3-6 个常用词；commands 1-2 个；template 中用 {{中文槽位名}} 标记参数。
用户需求：`;

export default function SkillsPage() {  const { t } = useTranslation();

  const [skills, setSkills] = useState<InstalledSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftNeed, setDraftNeed] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftJson, setDraftJson] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSkills(loadSkills());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const install = useCallback(
    (manifest: SkillManifest): boolean => {
      const skill: InstalledSkill = {
        ...manifest,
        id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        installed_at: new Date().toISOString(),
        enabled: true,
      };
      // Register into the CHAT-09 palette alongside the skill store.
      const commands = loadCommands().filter((c) => !c.id.startsWith(`skill-`));
      saveCommands([...skillToCommands(skill), ...commands]);
      saveSkills([skill, ...loadSkills()]);
      void load();
      message.success(t("已安装「{{p0}}」，输入 /{{p1}} 即可使用", { p0: skill.name, p1: skill.commands[0].name }));
      return true;
    },
    [load],
  );

  const toggle = (skill: InstalledSkill, enabled: boolean) => {
    const next = loadSkills().map((s) => (s.id === skill.id ? { ...s, enabled } : s));
    saveSkills(next);
    // Palette mirrors the toggle: disabled skills' commands leave the store.
    const commands = loadCommands().filter((c) => !c.id.startsWith("skill-"));
    const active = next
      .filter((s) => s.enabled)
      .flatMap((s) => skillToCommands(s));
    saveCommands([...active, ...commands]);
    void load();
    message.info(enabled ? t("已启用「{{p0}}」", { p0: skill.name }) : t("已停用「{{p0}}」，指令从面板移除", { p0: skill.name }));
  };

  const uninstall = (skill: InstalledSkill) => {
    saveSkills(loadSkills().filter((s) => s.id !== skill.id));
    saveCommands(loadCommands().filter((c) => !c.id.startsWith(`skill-${skill.id}`)));
    void load();
    message.success(t("已卸载「{{p0}}」", { p0: skill.name }));
  };

  const installFromFile = async (file: File) => {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(await file.text());
    } catch {
      message.error(t("不是有效的 JSON 技能包"));
      return;
    }
    const result = parseManifest(parsedJson);
    if (!result.ok) {
      message.error(t("导入失败：{{p0}}", { p0: result.reason }));
      return;
    }
    install(result.manifest);
  };

  const draftFromNeed = async () => {
    if (!draftNeed.trim()) return;
    setDrafting(true);
    setDraftJson("");
    try {
      const response = await chatService.chat({
        messages: [{ role: "user", content: `${DRAFT_PROMPT}${draftNeed.trim()}` }],
      });
      const text =
        response.choices?.[0]?.message?.content ??
        (response as unknown as { content?: string }).content ??
        "";
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      const candidate = start >= 0 && end > start ? text.slice(start, end + 1) : text;
      const result = parseManifest(JSON.parse(candidate));
      if (!result.ok) {
        message.error(t("草稿不合规：{{p0}}，请修改需求重试", { p0: result.reason }));
        return;
      }
      setDraftJson(JSON.stringify(result.manifest, null, 2));
      message.success(t("草稿已生成，确认后安装"));
    } catch (error) {
      message.error(
        `生成草稿失败：${error instanceof Error ? error.message : String(error)}（需要可用对话模型）`,
      );
    } finally {
      setDrafting(false);
    }
  };

  const confirmDraft = () => {
    try {
      const result = parseManifest(JSON.parse(draftJson));
      if (!result.ok) {
        message.error(result.reason);
        return;
      }
      install(result.manifest);
      setDraftOpen(false);
      setDraftNeed("");
      setDraftJson("");
    } catch {
      message.error(t("草稿不是合法 JSON"));
    }
  };

  const filtered = useMemo(
    () =>
      query.trim()
        ? skills.filter((s) =>
            `${s.name}${s.description}${s.triggers.join("")}`.includes(query.trim()),
          )
        : skills,
    [skills, query],
  );
  const market = useMemo(
    () =>
      query.trim()
        ? BUILTIN_SKILL_MARKET.filter((s) =>
            `${s.name}${s.description}`.includes(query.trim()),
          )
        : BUILTIN_SKILL_MARKET,
    [query],
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{t("技能")}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            技能 = 自带指令与触发词的任务包；安装后进入对话 / 面板，卸载即移除
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={<ThunderboltOutlined />} onClick={() => setDraftOpen(true)} aria-label={t("自然语言创建技能")}>
            描述创建
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => uploadRef.current?.click()} aria-label={t("上传技能包")}>
            上传
          </Button>
          <input
            ref={uploadRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void installFromFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      <Input
        allowClear
        prefix={<SearchOutlined />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("搜索技能（名称/描述/触发词）")}
        aria-label={t("技能搜索")}
      />

      <section aria-label={t("已安装")} className="space-y-3">
        <h2 className="text-base font-semibold">{t("已安装")}</h2>
        {loading ? (
          <Spin />
        ) : filtered.length === 0 ? (
          <Empty description={t("暂无已安装技能")} />
        ) : (
          <div className="space-y-2">
            {filtered.map((skill) => (
              <div
                key={skill.id}
                className="rounded-lg border border-(--color-border) p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{skill.name}</span>
                    {skill.enabled ? <Tag color="green">{t("启用")}</Tag> : <Tag>{t("停用")}</Tag>}
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                    {skill.description} · 触发词：{skill.triggers.slice(0, 4).join("、")}
                  </p>
                </div>
                <Switch
                  checked={skill.enabled}
                  onChange={(checked) => toggle(skill, checked)}
                  aria-label={t("启停 {{p0}}", { p0: skill.name })}
                />
                <Button size="small" danger onClick={() => uninstall(skill)} aria-label={t("卸载 {{p0}}", { p0: skill.name })}>
                  卸载
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-label={t("市场")} className="space-y-3">
        <h2 className="text-base font-semibold">{t("市场")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {market.map((entry) => {
            const installedAlready = skills.some((s) => s.name === entry.name);
            return (
              <div key={entry.name} className="rounded-xl border border-(--color-border) p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CloudUploadOutlined className="text-[var(--color-primary)]" />
                  <span className="text-sm font-medium flex-1 truncate">{entry.name}</span>
                  {installedAlready && <Tag color="green">{t("已装")}</Tag>}
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">{entry.description}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  指令：{entry.commands.map((c) => `/${c.name}`).join(" ")}
                </p>
                <Button
                  size="small"
                  type={installedAlready ? "default" : "primary"}
                  disabled={installedAlready}
                  onClick={() => install(entry)}
                  aria-label={t("安装 {{p0}}", { p0: entry.name })}
                >
                  {installedAlready ? "已安装" : "安装"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <Modal
        title={t("自然语言创建技能")}
        open={draftOpen}
        okText={t("确认安装")}
        cancelText={t("取消")}
        okButtonProps={{ disabled: !draftJson }}
        onCancel={() => setDraftOpen(false)}
        onOk={() => confirmDraft()}
        width={640}
      >
        <div className="space-y-3">
          <Input.TextArea
            value={draftNeed}
            onChange={(e) => setDraftNeed(e.target.value)}
            rows={2}
            aria-label={t("技能需求描述")}
            placeholder={t("例如：帮我把英文论文段落翻译成学术中文")}
          />
          <Button loading={drafting} onClick={() => void draftFromNeed()} aria-label={t("生成技能草稿")}>
            生成草稿
          </Button>
          {draftJson && (
            <>
              <Typography.Paragraph className="text-xs mb-0">
                草稿（可编辑，确认后安装）：
              </Typography.Paragraph>
              <Input.TextArea
                value={draftJson}
                onChange={(e) => setDraftJson(e.target.value)}
                rows={10}
                aria-label={t("技能草稿 JSON")}
                className="font-mono text-xs"
              />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
