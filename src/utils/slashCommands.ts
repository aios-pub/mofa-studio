/**
 * Slash command registry (CHAT-09): 「/」唤起面板, commands = name +
 * template + parameter slots, `{{slot}}` placeholders fill at use time.
 * Commands persist in localStorage; seeds ship defaults.
 */

export interface SlashCommand {
  id: string;
  name: string;
  /** Displayed as `/name`. */
  template: string;
  /** Slot names extracted from the template's `{{placeholders}}`. */
  slots: string[];
  builtin?: boolean;
}

const STORAGE_KEY = "mofa-studio-slash-commands";

export const SEED_COMMANDS: SlashCommand[] = [
  {
    id: "builtin-translate",
    name: "翻译",
    template: "把下面的内容翻译成{{目标语言}}：\n\n{{原文}}",
    slots: ["目标语言", "原文"],
    builtin: true,
  },
  {
    id: "builtin-xiaohongshu",
    name: "小红书",
    template:
      "以小红书博主口吻为「{{主题}}」写一篇种草文案，突出{{卖点}}，300 字左右，带 emoji。",
    slots: ["主题", "卖点"],
    builtin: true,
  },
  {
    id: "builtin-summary",
    name: "总结",
    template: "用{{条数}}条要点总结以下内容：\n\n{{原文}}",
    slots: ["条数", "原文"],
    builtin: true,
  },
  {
    id: "builtin-polish",
    name: "润色",
    template: "润色以下文字，保持原意，让表达更{{风格}}：\n\n{{原文}}",
    slots: ["风格", "原文"],
    builtin: true,
  },
];

/** Extract `{{slot}}` names from a template body. */
export function extractSlots(template: string): string[] {
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

/** Build a SlashCommand, deriving slots from the template. */
export function makeCommand(id: string, name: string, template: string): SlashCommand {
  return { id, name, template, slots: extractSlots(template) };
}

/** Filter commands for the palette by the current `/query` prefix. */
export function filterCommands(
  commands: SlashCommand[],
  query: string,
): SlashCommand[] {
  const q = query.replace(/^\//, "").toLowerCase();
  if (!q) return commands;
  return commands.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q),
  );
}

/** Replace `{{slot}}` placeholders with provided values. */
export function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (whole, name: string) => {
    const value = values[name.trim()];
    return value !== undefined && value !== "" ? value : whole;
  });
}

export function loadCommands(): SlashCommand[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SlashCommand[]) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Seeds stay pinned so a fresh install always has the basics.
      const ids = new Set(parsed.map((c) => c.id));
      const missing = SEED_COMMANDS.filter((c) => !ids.has(c.id));
      return [...missing, ...parsed];
    }
  } catch {
    // Fall through to seeds.
  }
  return [...SEED_COMMANDS];
}

export function saveCommands(commands: SlashCommand[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commands));
  } catch {
    // Storage unavailable: commands live for this session only.
  }
}
