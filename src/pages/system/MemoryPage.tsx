import { useTranslation } from "react-i18next";
/**
 * Memory management page (TASK-19 隐私四权能): every entry visible,
 * editable, and deletable; the master switch disables retrieval without
 * touching management.
 */

import { useCallback, useEffect, useState } from "react";
import { Button, Empty, Input, Popconfirm, Select, Switch, Tag, message } from "antd";
import { CrownOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  KIND_COLORS,
  KIND_LABELS,
  memoryService,
  type MemoryEntry,
  type MemoryKind,
} from "@/services/api/memory";

export default function MemoryPage() {  const { t } = useTranslation();

  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [draft, setDraft] = useState("");
  const [draftKind, setDraftKind] = useState<MemoryKind>("preference");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = useCallback(async () => {
    const [list, status] = await Promise.all([
      memoryService.list(),
      memoryService.status(),
    ]);
    setEntries(list);
    setEnabled(status.enabled);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const created = await memoryService.create(trimmed, draftKind);
    if (created) {
      message.success(t("已记入长期记忆"));
      setDraft("");
      await load();
    } else {
      message.error(t("保存失败"));
    }
  }, [draft, draftKind, load]);

  const saveEdit = useCallback(
    async (id: string) => {
      const trimmed = editValue.trim();
      if (!trimmed) return;
      const updated = await memoryService.update(id, trimmed);
      if (updated) {
        setEditingId(null);
        await load();
      } else {
        message.error(t("更新失败"));
      }
    },
    [editValue, load],
  );

  const remove = useCallback(
    async (id: string) => {
      if (await memoryService.remove(id)) {
        await load();
      } else {
        message.error(t("删除失败"));
      }
    },
    [load],
  );

  const toggle = useCallback(
    async (next: boolean) => {
      setEnabled(next);
      const ok = await memoryService.toggle(next);
      if (!ok) {
        setEnabled(!next);
        message.error(t("开关设置失败"));
        return;
      }
      message[next ? "info" : "warning"](
        next ? "记忆已启用——对话与任务将自动参考" : "记忆已停用——不再检索注入，条目保留可管理",
      );
    },
    [],
  );

  return (
    <div className="h-full overflow-y-auto p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <CrownOutlined className="text-[var(--color-primary)]" />
          长期记忆
          <span className="text-sm font-normal text-[var(--color-text-tertiary)]">
            {entries.length} 条
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-tertiary)]">{t("总开关")}</span>
          <Switch checked={enabled} onChange={(v) => void toggle(v)} aria-label={t("记忆总开关")} />
        </div>
      </div>

      {!enabled && (
        <p className="text-xs text-amber-500 p-2 rounded-lg bg-amber-500/10">
          记忆检索已停用：对话与任务不再自动注入记忆。条目仍然可见、可编辑、可删除。
        </p>
      )}

      {/* Add */}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={() => void add()}
          placeholder={t("例如：用户偏好简洁的中文回复 / 项目背景：… / 决定采用 A 方案")}
          aria-label={t("新记忆内容")}
        />
        <Select
          value={draftKind}
          onChange={setDraftKind}
          options={(Object.keys(KIND_LABELS) as MemoryKind[]).map((k) => ({
            value: k,
            label: KIND_LABELS[k],
          }))}
          style={{ width: 96 }}
          aria-label={t("记忆类型")}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => void add()} aria-label={t("添加记忆")}>
          记入
        </Button>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <Empty description={t("还没有记忆条目")} />
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-(--color-border) bg-[var(--color-bg-secondary)]"
            >
              <Tag color={KIND_COLORS[entry.kind]}>{KIND_LABELS[entry.kind]}</Tag>
              <div className="flex-1 min-w-0">
                {editingId === entry.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onPressEnter={() => void saveEdit(entry.id)}
                      autoFocus
                      size="small"
                      aria-label={t("编辑记忆内容")}
                    />
                    <Button size="small" type="primary" onClick={() => void saveEdit(entry.id)}>
                      保存
                    </Button>
                  </div>
                ) : (
                  <button
                    className="text-left text-sm text-[var(--color-text-primary)] w-full"
                    onClick={() => {
                      setEditingId(entry.id);
                      setEditValue(entry.content);
                    }}
                    aria-label={`编辑记忆 ${entry.content.slice(0, 12)}`}
                    title={t("点击编辑")}
                  >
                    {entry.content}
                  </button>
                )}
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  {entry.created_at.replace("T", " ").slice(0, 19)}
                </p>
              </div>
              <Popconfirm
                title={t("删除这条记忆？")}
                onConfirm={() => void remove(entry.id)}
                okText={t("删除")}
                cancelText={t("取消")}
              >
                <Button size="small" danger icon={<DeleteOutlined />} aria-label={t("删除记忆 {{p0}}", { p0: entry.id })} />
              </Popconfirm>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--color-text-tertiary)]">
        隐私四权能：所有条目可见、可编辑、可删除；总开关一键停用检索注入。记忆仅存本机。
      </p>
    </div>
  );
}
