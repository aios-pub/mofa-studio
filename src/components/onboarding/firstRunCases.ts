/**
 * First-run "做同款" cases (ONBOARD-03): lightweight, one-click replicas
 * that route into the creation tools with prefilled parameters.
 */

export interface FirstRunCase {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Route the case launches, with query params the page consumes. */
  to: string;
  /** Query params consumed by the target page for prefill + auto-run. */
  params: Record<string, string>;
}

export const FIRST_RUN_CASES: FirstRunCase[] = [
  {
    id: "xiaohongshu-copy",
    title: "写一篇小红书文案",
    description: "输入主题，30 秒出一篇带 emoji 的种草文案",
    icon: "📝",
    to: "/creation/writing",
    params: { genre: "xiaohongshu", topic: "新手露营装备怎么选", run: "1" },
  },
  {
    id: "avatar-gen",
    title: "生成你的卡通头像",
    description: "一句话描述，生成一张 1:1 头像图",
    icon: "🎨",
    to: "/creation/image-gen",
    params: { prompt: "一只戴眼镜的橘猫程序员头像，卡通插画风格，温暖色调", size: "1024x1024", run: "1" },
  },
  {
    id: "cover-image",
    title: "做一张小红书封面",
    description: "3:4 尺寸封面图，直接可用于发帖",
    icon: "🖼️",
    to: "/creation/image-gen",
    params: { prompt: "周末露营主题封面，格子野餐布上摆着咖啡和面包，阳光树林背景", size: "768x1024", run: "1" },
  },
  {
    id: "short-script",
    title: "写一个短视频脚本",
    description: "60 秒分镜脚本，画面+口播+字幕齐备",
    icon: "🎬",
    to: "/creation/writing",
    params: { genre: "script", topic: "一分钟教你挑西瓜", run: "1" },
  },
];

/** localStorage flag: flipped after the first successful output. */
export const FIRST_OUTPUT_FLAG = "mofa-studio-first-output";

export function hasFirstOutput(): boolean {
  try {
    return localStorage.getItem(FIRST_OUTPUT_FLAG) === "1";
  } catch {
    return false;
  }
}

export function markFirstOutput(): void {
  try {
    localStorage.setItem(FIRST_OUTPUT_FLAG, "1");
  } catch {
    // Storage unavailable; the guide just reappears next session.
  }
}

/** Parse a query string into a record (testable without the router). */
export function queryRecord(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const out: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    out[key] = value;
  }
  return out;
}
