/**
 * Inline guidance card (ONBOARD-04 交互要点): a non-modal strip with a
 * permanent-dismiss control — the UI half of the progressive-disclosure
 * engine.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Tag } from "antd";
import { BulbOutlined, CloseOutlined } from "@ant-design/icons";
import { dismissGuidance, type Guidance } from "@/utils/progressiveDisclosure";

export default function GuidanceCard({ guidance }: { guidance: Guidance }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const dismiss = () => {
    dismissGuidance(guidance.id);
    setVisible(false);
  };

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5"
      role="status"
      aria-label={`引导：${guidance.title}`}
    >
      <BulbOutlined className="text-[var(--color-primary)] mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Tag color="geekblue">{guidance.stage}</Tag>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {guidance.title}
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {guidance.body}
        </p>
        <Button
          size="small"
          type="link"
          className="!px-0"
          onClick={() => navigate(guidance.action.route)}
          aria-label={guidance.action.label}
        >
          {guidance.action.label} →
        </Button>
      </div>
      <button
        onClick={dismiss}
        className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        aria-label="永久关闭此引导"
        title="不再显示"
      >
        <CloseOutlined />
      </button>
    </div>
  );
}
