/**
 * First-task guide (ONBOARD-03): a「做同款」recommendation strip shown on
 * the dashboard until the first successful output. One click routes into
 * a creation tool with prefilled parameters and auto-runs.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal } from "antd";
import { RocketOutlined, RightOutlined } from "@ant-design/icons";
import { FIRST_RUN_CASES, hasFirstOutput } from "./firstRunCases";
import { loadCommands, makeCommand, saveCommands } from "@/utils/slashCommands";

export default function FirstRunGuide() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (hasFirstOutput() || dismissed) return null;

  const runCase = (index: number) => {
    const c = FIRST_RUN_CASES[index];
    const search = new URLSearchParams(c.params).toString();
    navigate(`${c.to}?${search}`);
  };

  return (
    <section
      className="
        mb-6 rounded-xl overflow-hidden
        border border-[var(--color-border)]
        bg-[var(--color-bg-secondary)]/60
      "
      aria-label="首任务引导"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="
                h-6 w-6 shrink-0 rounded-md flex items-center justify-center
                bg-[var(--color-primary)]/10
              "
            >
              <RocketOutlined className="text-xs text-[var(--color-primary)]" />
            </span>
            <span className="text-sm font-semibold text-[var(--color-text-primary)] whitespace-nowrap">
              5 分钟拿到第一个成果
            </span>
            <span className="hidden md:inline text-xs text-[var(--color-text-tertiary)] truncate">
              选一个「做同款」，一键启动
            </span>
          </div>
          <Button
            type="text"
            size="small"
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            onClick={() => setDismissed(true)}
            aria-label="关闭首任务引导"
          >
            稍后再说
          </Button>
        </div>

        {/* Compact one-line task cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {FIRST_RUN_CASES.map((c, index) => (
            <button
              key={c.id}
              onClick={() => runCase(index)}
              className="
                group flex items-center gap-2.5 text-left p-2.5 rounded-lg
                border border-[var(--color-border)]
                bg-[var(--color-bg-primary)]
                hover:border-[var(--color-primary)]/50
                hover:shadow-sm
                transition-all duration-150
              "
              aria-label={`做同款：${c.title}`}
            >
              <span
                className="
                  h-8 w-8 shrink-0 rounded-md flex items-center justify-center
                  bg-[var(--color-bg-tertiary)] text-lg
                  group-hover:bg-[var(--color-primary)]/10
                  transition-colors
                "
              >
                {c.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                  {c.title}
                </span>
                <span className="block text-xs text-[var(--color-text-tertiary)] truncate">
                  {c.description}
                </span>
              </span>
              <RightOutlined className="shrink-0 text-[10px] text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 二选一 after the first successful output (存为模板 / 继续探索). */
export function FirstOutputDialog({
  open,
  templateName,
  templateBody,
  onClose,
}: {
  open: boolean;
  templateName: string;
  templateBody: string;
  onClose: () => void;
}) {
  const saveAsTemplate = () => {
    const command = makeCommand(`case-${Date.now()}`, templateName, templateBody);
    saveCommands([...loadCommands().filter((c) => c.id !== command.id), command]);
    onClose();
  };

  return (
    <Modal
      title="第一个成果已完成 🎉"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="explore" onClick={onClose}>
          继续探索
        </Button>,
        <Button key="save" type="primary" onClick={saveAsTemplate}>
          存为模板
        </Button>,
      ]}
    >
      <p className="text-sm text-[var(--color-text-secondary)]">
        把这次的做法保存为快捷指令模板，下次在对话框输入
        「/{templateName}」即可一键复用。
      </p>
    </Modal>
  );
}
