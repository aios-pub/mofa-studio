/**
 * Tests for TASK-12/13: manifest validation, palette registration on
 * install (零代码被路由匹配), enable/disable mirroring, market install,
 * file import, and the natural-language draft flow.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SkillsPage from "./SkillsPage";
import { loadCommands } from "@/utils/slashCommands";
import {
  BUILTIN_SKILL_MARKET,
  loadSkills,
  matchSkills,
  parseManifest,
  skillToCommands,
} from "@/utils/skills";

const mockedChat = vi.fn();

vi.mock("antd", async (importOriginal) => {
  const antd = await importOriginal<typeof import("antd")>();
  return { ...antd, message: { ...antd.message, success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() } };
});

vi.mock("@/services/api/chat", () => ({
  chatService: { chat: (...a: unknown[]) => mockedChat(...a) },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SkillsPage />
    </MemoryRouter>,
  );
}

describe("parseManifest (TASK-12)", () => {
  const valid = {
    skill_version: 1,
    name: "会议纪要",
    description: "整理会议内容",
    triggers: ["会议", "纪要"],
    commands: [{ name: "纪要", template: "整理：{{会议内容}}" }],
  };

  it("accepts a valid manifest and derives slots from the template", () => {
    const result = parseManifest(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.commands[0].slots).toBeUndefined();
      const commands = skillToCommands({
        ...result.manifest,
        id: "s1",
        installed_at: "",
        enabled: true,
      });
      expect(commands[0].slots).toEqual(["会议内容"]);
    }
  });

  it("rejects wrong versions and missing fields", () => {
    expect(parseManifest({ ...valid, skill_version: 2 }).ok).toBe(false);
    expect(parseManifest({ ...valid, name: " " }).ok).toBe(false);
    expect(parseManifest({ ...valid, triggers: [] }).ok).toBe(false);
    expect(
      parseManifest({ ...valid, commands: [{ name: "x" }] }).ok,
    ).toBe(false);
  });
});

describe("matchSkills (TASK-07 第②层)", () => {
  it("scores enabled skills by trigger evidence", () => {
    const skills = [
      { ...BUILTIN_SKILL_MARKET[0], id: "a", installed_at: "", enabled: true },
      { ...BUILTIN_SKILL_MARKET[1], id: "b", installed_at: "", enabled: true },
      { ...BUILTIN_SKILL_MARKET[2], id: "c", installed_at: "", enabled: false },
    ];
    const hits = matchSkills("帮我整理一下昨天的会议纪要", skills);
    expect(hits[0].skill.id).toBe("a");
    expect(hits.some((h) => h.skill.id === "c")).toBe(false);
    expect(matchSkills("你好", skills)).toEqual([]);
  });
});

describe("SkillsPage (TASK-13)", () => {
  it("installs a market skill into the palette (零代码路由匹配)", async () => {
    renderPage();
    fireEvent.click(await screen.findByLabelText("安装 会议纪要"));

    await waitFor(() => {
      expect(loadSkills().some((s) => s.name === "会议纪要")).toBe(true);
    });
    expect(loadCommands().some((c) => c.name === "纪要" && !c.builtin)).toBe(true);
    expect(await screen.findByText("已装")).toBeInTheDocument();
  });

  it("disabling removes its commands from the palette; enabling restores", async () => {
    renderPage();
    fireEvent.click(await screen.findByLabelText("安装 周报生成"));
    await waitFor(() => expect(loadCommands().some((c) => c.name === "周报")).toBe(true));

    fireEvent.click(await screen.findByLabelText("启停 周报生成"));
    await waitFor(() =>
      expect(loadCommands().some((c) => c.name === "周报")).toBe(false),
    );
    expect(loadSkills()[0].enabled).toBe(false);

    fireEvent.click(screen.getByLabelText("启停 周报生成"));
    await waitFor(() =>
      expect(loadCommands().some((c) => c.name === "周报")).toBe(true),
    );
  });

  it("search filters both installed and market lists", async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText("技能搜索"), {
      target: { value: "旅行" },
    });
    expect(screen.getByLabelText("安装 旅行规划")).toBeInTheDocument();
    expect(screen.queryByLabelText("安装 会议纪要")).not.toBeInTheDocument();
  });

  it("natural-language creation drafts a manifest via the chat model", async () => {
    const manifest = BUILTIN_SKILL_MARKET[0];
    mockedChat.mockResolvedValueOnce({
      choices: [{ message: { role: "assistant", content: `前置说明\n${JSON.stringify(manifest)}` } }],
    });
    renderPage();

    fireEvent.click(await screen.findByLabelText("自然语言创建技能"));
    fireEvent.change(await screen.findByLabelText("技能需求描述"), {
      target: { value: "整理会议纪要的技能" },
    });
    fireEvent.click(screen.getByLabelText("生成技能草稿"));

    const draft = await screen.findByLabelText("技能草稿 JSON");
    await waitFor(() =>
      expect((draft as HTMLTextAreaElement).value).toContain("会议纪要"),
    );
    fireEvent.click(screen.getByRole("button", { name: /确认安装/ }));
    await waitFor(() => {
      expect(loadSkills().some((s) => s.name === "会议纪要")).toBe(true);
    });
  });

  it("draft failures surface the model dependency honestly", async () => {
    mockedChat.mockRejectedValueOnce(new Error("503 engine down"));
    renderPage();
    fireEvent.click(await screen.findByLabelText("自然语言创建技能"));
    fireEvent.change(await screen.findByLabelText("技能需求描述"), {
      target: { value: "随便一个技能" },
    });
    fireEvent.click(screen.getByLabelText("生成技能草稿"));
    await waitFor(() => expect(mockedChat).toHaveBeenCalled());
    // Modal stays open without a draft; the error toast carried the reason.
    expect(screen.getByLabelText("技能需求描述")).toBeInTheDocument();
  });
});
