/**
 * First-launch welcome flow (ONBOARD-01).
 *
 * Three screens, one per product pillar (chat-creates / task-delivers /
 * workflow-produces), a persistent skip control, and a finish step that
 * lands on Key setup. The flag lives in localStorage so the flow shows
 * exactly once per device.
 */

import { useState } from "react";
import { Button, Progress } from "antd";
import {
  MessageOutlined,
  RocketOutlined,
  ApartmentOutlined,
  KeyOutlined,
  RightOutlined,
} from "@ant-design/icons";

export const ONBOARDED_FLAG = "mofa-studio-onboarded";

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_FLAG) === "1";
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_FLAG, "1");
  } catch {
    // Storage unavailable (private mode): the flow simply reappears next launch.
  }
}

interface Step {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  points: string[];
}

const STEPS: Step[] = [
  {
    icon: <MessageOutlined className="text-4xl text-[var(--color-primary)]" />,
    title: "聊天即创作",
    tagline: "对话入口直接完成问答、识图、生图、写作",
    points: [
      "多模型流式对话，深度思考链可见",
      "说「画一只橘猫」直接出图",
      "密钥自持，数据不出本机",
    ],
  },
  {
    icon: <RocketOutlined className="text-4xl text-[var(--color-primary)]" />,
    title: "任务即交付",
    tagline: "一句话任务 → 自动规划执行 → 交付成果",
    points: [
      "立项后自动拆解执行步骤",
      "专家评审团把关产物质量",
      "跑通一次，沉淀为可复用 SOP",
    ],
  },
  {
    icon: <ApartmentOutlined className="text-4xl text-[var(--color-primary)]" />,
    title: "工作流即产线",
    tagline: "节点式管线，批量生产图文视频内容",
    points: [
      "可视化画布编排创作流程",
      "增量执行，未变更节点命中缓存",
      "定时自动化，结果主动推送",
    ],
  },
];

export default function WelcomeFlow({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const finish = () => {
    markOnboarded();
    onFinish();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-label="欢迎引导"
      data-testid="welcome-flow"
    >
      <div className="w-[min(92vw,560px)] rounded-2xl bg-[var(--color-bg-primary)] border border-(--color-border) shadow-2xl p-8">
        <Progress
          percent={((step + 1) / STEPS.length) * 100}
          showInfo={false}
          strokeColor="var(--color-primary)"
          aria-label={`引导进度 ${step + 1}/${STEPS.length}`}
        />
        <div className="mt-6 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-(--color-bg-tertiary) flex items-center justify-center">
            {current.icon}
          </div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {current.title}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {current.tagline}
          </p>
          <ul className="mt-2 space-y-2 text-sm text-[var(--color-text-secondary)] text-left">
            {current.points.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button type="text" onClick={finish} aria-label="跳过引导">
            跳过
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button onClick={() => setStep((s) => s - 1)} aria-label="上一步">
                上一步
              </Button>
            )}
            {isLast ? (
              <Button
                type="primary"
                icon={<KeyOutlined />}
                iconPosition="start"
                onClick={finish}
                aria-label="开始配置"
              >
                开始配置
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<RightOutlined />}
                iconPosition="end"
                onClick={() => setStep((s) => s + 1)}
                aria-label="下一步"
              >
                下一步
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
