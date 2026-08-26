/**
 * TASK-12 Skill 规范与 manifest: Skill = 自包含 mini-Agent —— 自带路由
 * 触发词、命令模板与说明。导入后零代码改动即可被路由匹配：命令进入
 * CHAT-09 调色板，触发词参与意图路由的技能检索（TASK-07 的第②层）。
 */

import type { SlashCommand } from "./slashCommands";

export interface SkillCommandSpec {
  name: string;
  template: string;
  slots?: string[];
}

export interface SkillManifest {
  /** manifest 版本. */
  skill_version: 1;
  name: string;
  description: string;
  /** 意图路由触发词（TASK-07 第②层 检索信号）. */
  triggers: string[];
  commands: SkillCommandSpec[];
}

export interface InstalledSkill extends SkillManifest {
  id: string;
  installed_at: string;
  enabled: boolean;
}

export const SKILL_STORAGE_KEY = "mofa-studio-skills";

export type ManifestParseResult =
  | { ok: true; manifest: SkillManifest }
  | { ok: false; reason: string };

/** Validate a raw manifest document (导入与自然语言创建共用). */
export function parseManifest(input: unknown): ManifestParseResult {
  const doc = input as Partial<SkillManifest> & { commands?: unknown };
  if (!doc || typeof doc !== "object") {
    return { ok: false, reason: "manifest 必须是对象" };
  }
  if (doc.skill_version !== 1) {
    return { ok: false, reason: "skill_version 必须为 1" };
  }
  if (!doc.name?.trim()) {
    return { ok: false, reason: "缺少 name" };
  }
  if (!doc.description?.trim()) {
    return { ok: false, reason: "缺少 description" };
  }
  if (!Array.isArray(doc.triggers) || doc.triggers.length === 0) {
    return { ok: false, reason: "至少需要一个 triggers 触发词" };
  }
  if (!Array.isArray(doc.commands) || doc.commands.length === 0) {
    return { ok: false, reason: "至少需要一个 command" };
  }
  const commands: SkillCommandSpec[] = [];
  for (const raw of doc.commands) {
    const spec = raw as Partial<SkillCommandSpec>;
    if (!spec?.name?.trim() || !spec?.template?.trim()) {
      return { ok: false, reason: "每个 command 需要 name 与 template" };
    }
    commands.push({
      name: spec.name.trim().slice(0, 20),
      template: spec.template.trim().slice(0, 2000),
      slots: Array.isArray(spec.slots)
        ? spec.slots.filter((s) => typeof s === "string").slice(0, 8)
        : undefined,
    });
  }
  return {
    ok: true,
    manifest: {
      skill_version: 1,
      name: doc.name.trim().slice(0, 30),
      description: doc.description.trim().slice(0, 300),
      triggers: doc.triggers
        .filter((t) => typeof t === "string" && t.trim())
        .map((t) => t.trim().slice(0, 20))
        .slice(0, 10),
      commands,
    },
  };
}

export function loadSkills(): InstalledSkill[] {
  try {
    const raw = localStorage.getItem(SKILL_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as InstalledSkill[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSkills(skills: InstalledSkill[]) {
  try {
    localStorage.setItem(SKILL_STORAGE_KEY, JSON.stringify(skills.slice(0, 100)));
  } catch {
    // quota: session-only
  }
}

/** Commands a skill contributes to the CHAT-09 palette. */
export function skillToCommands(skill: InstalledSkill): SlashCommand[] {
  return skill.commands.map((spec, index) => ({
    id: `skill-${skill.id}-${index}`,
    name: spec.name,
    template: spec.template,
    slots: spec.slots?.length ? spec.slots : extractSlotsLocal(spec.template),
    builtin: false,
  }));
}

function extractSlotsLocal(template: string): string[] {
  const slots: string[] = [];
  const seen = new Set<string>();
  for (const match of template.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    const name = match[1].trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      slots.push(name);
    }
  }
  return slots;
}

/**
 * TASK-07 第②层（Skill 检索）: score installed skills against the input by
 * trigger/description keyword evidence. Description+keyword 混合匹配 TopK.
 */
export function matchSkills(text: string, skills: InstalledSkill[], topK = 3): Array<{ skill: InstalledSkill; score: number }> {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const scored = skills
    .filter((s) => s.enabled)
    .map((skill) => {
      let score = 0;
      for (const trigger of skill.triggers) {
        if (trimmed.includes(trigger)) score += 2;
      }
      for (const word of skill.description.split(/\s+/)) {
        if (word.length >= 2 && trimmed.includes(word)) score += 1;
      }
      return { skill, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/** Built-in market entries (TASK-13 官方目录). */
export const BUILTIN_SKILL_MARKET: SkillManifest[] = [
  {
    skill_version: 1,
    name: "会议纪要",
    description: "把口述或录音稿整理成带行动项的会议纪要",
    triggers: ["会议", "纪要", "行动项"],
    commands: [
      {
        name: "纪要",
        template:
          "把以下会议内容整理为纪要：与会人、议题结论、行动项（负责人+截止时间）：\n\n{{会议内容}}",
      },
    ],
  },
  {
    skill_version: 1,
    name: "周报生成",
    description: "根据本周要点生成结构化周报",
    triggers: ["周报", "本周", "汇报"],
    commands: [
      {
        name: "周报",
        template:
          "把以下要点写成周报（本周完成 / 数据亮点 / 下周计划 / 风险）：\n\n{{本周要点}}",
      },
    ],
  },
  {
    skill_version: 1,
    name: "邮件助手",
    description: "得体的商务邮件起草与回复",
    triggers: ["邮件", "回复对方", "商务"],
    commands: [
      {
        name: "邮件",
        template: "以{{语气}}的语气起草一封关于{{主题}}的邮件，收件人：{{收件人}}。背景：{{背景}}",
      },
    ],
  },
  {
    skill_version: 1,
    name: "数据解读",
    description: "把表格数据解读成结论与建议",
    triggers: ["数据", "同比", "解读"],
    commands: [
      {
        name: "解读",
        template: "解读以下数据：给出 3 条结论与 1 条行动建议，区分事实与推断：\n\n{{数据}}",
      },
    ],
  },
  {
    skill_version: 1,
    name: "面试准备",
    description: "针对岗位生成高频问题与回答要点",
    triggers: ["面试", "岗位", "自我介绍"],
    commands: [
      {
        name: "面试题",
        template: "我要面试{{岗位}}，请给 8 个高频问题与回答要点，并指出 3 个易踩的坑。",
      },
    ],
  },
  {
    skill_version: 1,
    name: "旅行规划",
    description: "按天数与预算生成行程草案",
    triggers: ["旅行", "行程", "攻略"],
    commands: [
      {
        name: "行程",
        template: "规划{{天数}}天的{{目的地}}行程，预算{{预算}}，偏好{{偏好}}，按天列出并标注交通方式。",
      },
    ],
  },
];
