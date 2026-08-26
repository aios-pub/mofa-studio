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
        bg-[var(--color-bg-primary)]
        shadow-sm
      "
      aria-label="首任务引导"
    >
      {/* Accent top bar */}
      <div className="h-0.5 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary-light)] to-transparent" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="
              w-7 h-7 rounded-lg flex items-center justify-center
              bg-[var(--color-primary)]/10
            ">
              <RocketOutlined className="text-[var(--color-primary)] text-sm" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">
                5 分钟拿到第一个成果
              </h3>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                选一个「做同款」，一键启动
              </p>
            </div>
          </div>
          <Button
            type="text"
            size="small"
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            onClick={() => setDismissed(true)}
            aria-label="关闭首任务引导"
          >
            稍后再说
          </Button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FIRST_RUN_CASES.map((c, index) => (
            <button
              key={c.id}
              onClick={() => runCase(index)}
              className="
                group text-left p-4 rounded-lg
                border border-[var(--color-border)]
                bg-[var(--color-bg-secondary)]
                hover:border-[var(--color-primary)]/40
                hover:bg-[var(--color-primary)]/5
                hover:shadow-md
                transition-all duration-200
                relative overflow-hidden
              "
              aria-label={`做同款：${c.title}`}
            >
              {/* Hover glow */}
              <div className="
                absolute inset-0 rounded-lg
                bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent
                opacity-0 group-hover:opacity-100
                transition-opacity duration-200
              " />

              <div className="relative">
                <span className="text-2xl">{c.icon}</span>
                <p className="mt-2 text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                  {c.title}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)] transition-colors">
                  {c.description}
                </p>
                <div className="
                  mt-3 flex items-center gap-1
                  text-xs text-[var(--color-primary)]
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-200
                ">
                  <span>立即体验</span>
                  <RightOutlined className="text-[10px]" />
                </div>
              </div>
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
