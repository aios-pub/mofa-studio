/**
 * Tests for the connectors page (TASK-09): catalog install with scope
 * confirmation, custom connectors, tool discovery + live call, and revoke
 * semantics.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConnectorsPage from "./ConnectorsPage";
import {
  CONNECTOR_CATALOG,
  matchesCatalog,
  type Connector,
} from "@/services/api/connectors";

const mockedList = vi.fn();
const mockedAdd = vi.fn();
const mockedRemove = vi.fn();
const mockedTools = vi.fn();
const mockedCall = vi.fn();

vi.mock("antd", async (importOriginal) => {
  const antd = await importOriginal<typeof import("antd")>();
  return { ...antd, message: { ...antd.message, success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() } };
});

vi.mock("@/services/api/connectors", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api/connectors")>();
  return {
    ...actual,
    connectorService: {
      list: (...a: unknown[]) => mockedList(...a),
      add: (...a: unknown[]) => mockedAdd(...a),
      remove: (...a: unknown[]) => mockedRemove(...a),
      tools: (...a: unknown[]) => mockedTools(...a),
      call: (...a: unknown[]) => mockedCall(...a),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedList.mockResolvedValue([]);
});

describe("ConnectorsPage (TASK-09)", () => {
  it("renders the official catalog with scopes", async () => {
    render(
      <MemoryRouter>
        <ConnectorsPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("官方目录")).toBeInTheDocument();
    expect(screen.getByText("Brave 搜索")).toBeInTheDocument();
    expect(screen.getByText(/网络搜索查询/)).toBeInTheDocument();
    expect(screen.getByText(/Token 权限范围/)).toBeInTheDocument();
  });

  it("installing from the catalog confirms scope, substitutes the dir, and adds", async () => {
    mockedAdd.mockResolvedValueOnce({ ok: true, id: "mcp-1" });
    mockedList.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ConnectorsPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByLabelText("安装 本地文件"));

    // Scope confirmation modal shows the authorization boundary (also on
    // the catalog card, so scope the lookup to the modal).
    const modal = await screen.findByRole("dialog");
    expect(modal.textContent).toContain("仅你指定的目录");
    fireEvent.change(screen.getByLabelText("授权目录"), {
      target: { value: "/tmp/docs" },
    });
    fireEvent.click(screen.getByRole("button", { name: /确认安装/ }));

    await waitFor(() => expect(mockedAdd).toHaveBeenCalled());
    const payload = mockedAdd.mock.calls[0][0];
    expect(payload.name).toBe("本地文件");
    // The ${目录} placeholder was substituted.
    expect(payload.args).toContain("/tmp/docs");
  });

  it("adds a custom MCP server", async () => {
    mockedAdd.mockResolvedValueOnce({ ok: true, id: "mcp-2" });
    render(
      <MemoryRouter>
        <ConnectorsPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByLabelText("添加自定义连接器"));
    fireEvent.change(await screen.findByLabelText("连接器名称"), {
      target: { value: "我的工具" },
    });
    fireEvent.change(screen.getByLabelText("连接器命令"), { target: { value: "npx" } });
    fireEvent.change(screen.getByLabelText("连接器参数"), {
      target: { value: "-y @modelcontextprotocol/server-fetch" },
    });
    fireEvent.click(screen.getByRole("button", { name: /添 加|确 定/ }));
    await waitFor(() => expect(mockedAdd).toHaveBeenCalledWith({
      name: "我的工具",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-fetch"],
    }));
  });

  it("inspects tools and performs a live call with JSON args", async () => {
    const connector: Connector = { id: "mcp-3", name: "网页抓取", command: "npx", args: [] };
    mockedList.mockResolvedValue([connector]);
    mockedTools.mockResolvedValueOnce([
      { name: "fetch", description: "抓取 URL" },
    ]);
    mockedCall.mockResolvedValueOnce({ ok: true, result: '{"content":"hi"}' });

    render(
      <MemoryRouter>
        <ConnectorsPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByLabelText("查看工具 网页抓取"));
    await waitFor(() => {
      const list = screen.getByLabelText("工具清单");
      expect(list.textContent).toContain("fetch");
      expect(list.textContent).toContain("抓取 URL");
    });

    fireEvent.change(screen.getByLabelText("调用工具名"), { target: { value: "fetch" } });
    fireEvent.change(screen.getByLabelText("调用参数 JSON"), {
      target: { value: '{"url":"https://example.com"}' },
    });
    fireEvent.click(screen.getByLabelText("调用工具"));
    await waitFor(() =>
      expect(mockedCall).toHaveBeenCalledWith("mcp-3", "fetch", { url: "https://example.com" }),
    );
    expect(await screen.findByText(/"content":"hi"/)).toBeInTheDocument();
  });

  it("revoking removes the connector from the installed list", async () => {
    const connector: Connector = { id: "mcp-4", name: "GitHub", command: "npx", args: [] };
    mockedList.mockResolvedValueOnce([connector]).mockResolvedValue([]);
    mockedRemove.mockResolvedValueOnce(true);

    render(
      <MemoryRouter>
        <ConnectorsPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByLabelText("撤销 GitHub"));
    await waitFor(() => expect(mockedRemove).toHaveBeenCalledWith("mcp-4"));
    await waitFor(() =>
      expect(screen.queryByLabelText("撤销 GitHub")).not.toBeInTheDocument(),
    );
  });

  it("rejects malformed JSON call args before any request", async () => {
    const connector: Connector = { id: "mcp-5", name: "SQLite", command: "uvx", args: [] };
    mockedList.mockResolvedValue([connector]);
    mockedTools.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <ConnectorsPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByLabelText("查看工具 SQLite"));
    await screen.findByText("无工具");
    fireEvent.change(screen.getByLabelText("调用工具名"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("调用参数 JSON"), { target: { value: "{bad" } });
    fireEvent.click(screen.getByLabelText("调用工具"));
    // No call fired: args never validated client-side to the wire.
    await new Promise((r) => setTimeout(r, 50));
    expect(mockedCall).not.toHaveBeenCalled();
  });
});

describe("matchesCatalog", () => {
  it("matches installed connectors back to catalog entries", () => {
    const fetch = CONNECTOR_CATALOG.find((e) => e.key === "fetch")!;
    expect(
      matchesCatalog({ id: "x", name: "网页抓取", command: "npx", args: fetch.args }, fetch),
    ).toBe(true);
    expect(
      matchesCatalog({ id: "x", name: "other", command: "uvx", args: [] }, fetch),
    ).toBe(false);
  });
});
