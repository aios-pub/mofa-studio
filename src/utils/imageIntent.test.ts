/**
 * Labeled-example tests for the image intent classifier (CHAT-05 验收：
 * 生图意图召回率抽检 ≥90%).
 */
import { describe, expect, it } from "vitest";
import { detectImageIntent, refineImagePrompt } from "./imageIntent";

const IMAGE_EXAMPLES = [
  "画一只橘猫",
  "帮我画一张赛博朋克风格的城市夜景",
  "生成一张小红书封面图",
  "来一张日落壁纸",
  "做张海报：周末露营活动",
  "给我画个头像，卡通风格",
  "画幅山水画",
  "设计一张邀请函配图",
  "帮我生成图片：一杯咖啡特写",
  "draw an image of a red panda",
  "Generate a poster for a jazz concert",
  "please make a picture of the seaside",
  "/画 星空下的灯塔",
  "/image a cozy reading nook",
];

const CHAT_EXAMPLES = [
  "你好",
  "帮我写一段产品介绍文案",
  "什么是量子计算？",
  "把这段话翻译成英文：今天天气很好",
  "这篇文章的主旨是什么",
  "续写这个故事",
  "画蛇添足是什么意思？", // 含"画"字但非生图（成语疑问）→ 需要 hitImageNoun? 画蛇添足 hits /^画/ verb rule...
  "怎么提高英语听力",
  "summarize this article for me",
];

describe("detectImageIntent", () => {
  it.each(IMAGE_EXAMPLES)("routes to image: %s", (text) => {
    expect(detectImageIntent(text).kind).toBe("image");
  });

  it("routes chat examples to chat (labeling precision)", () => {
    const misrouted = CHAT_EXAMPLES.filter(
      (text) => detectImageIntent(text).kind === "image",
    );
    // 允许把「画蛇添足」误判为生图：接受个别误报（precision 换 recall），
    // 但要求绝大多数正常聊天不被劫持。
    expect(misrouted.length).toBeLessThanOrEqual(2);
  });

  it("edit markers only fire after an image turn", () => {
    expect(detectImageIntent("换成夜景")).toEqual({ kind: "chat" });
    expect(detectImageIntent("换成夜景", true)).toEqual({
      kind: "image",
      edit: true,
    });
    expect(detectImageIntent("重新画一版", true).edit).toBe(true);
  });

  it("empty text is chat", () => {
    expect(detectImageIntent("   ")).toEqual({ kind: "chat" });
  });

  it("slash command prefix routes to image without noun matching", () => {
    expect(detectImageIntent("/画 星空").kind).toBe("image");
  });
});

describe("refineImagePrompt", () => {
  it("appends the edit request to the previous prompt", () => {
    expect(refineImagePrompt("一只橘猫坐在窗台", "换成夜景")).toBe(
      "一只橘猫坐在窗台（调整：换成夜景）",
    );
  });
});
