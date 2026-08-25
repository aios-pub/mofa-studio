/**
 * Connector service (TASK-09): MCP connectors over the mcp_host API —
 * install (stdio command), list, tools discovery, live calls, revoke.
 */

import { apiClient } from "../api/apiClient";

export interface Connector {
  id: string;
  name: string;
  command: string;
  args?: string[];
  created_at?: string;
}

export interface ConnectorTool {
  name: string;
  description?: string;
}

/** Catalog entry: a well-known MCP server installable in one click. */
export interface CatalogEntry {
  key: string;
  name: string;
  category: string;
  description: string;
  command: string;
  args: string[];
  /** What the connector can touch — the 授权范围 shown before install. */
  scope: string;
  byok?: string;
}

/** Official connector catalog v1 (BYOK-reachable MCP servers). */
export const CONNECTOR_CATALOG: CatalogEntry[] = [
  {
    key: "filesystem",
    name: "本地文件",
    category: "文件",
    description: "读写授权目录内的文件（MCP filesystem server）",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "${目录}"],
    scope: "仅你指定的目录；安装时替换 ${目录}",
  },
  {
    key: "fetch",
    name: "网页抓取",
    category: "信息",
    description: "抓取网页并转为 Markdown（server-fetch）",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    scope: "只读网络请求",
  },
  {
    key: "sqlite",
    name: "SQLite",
    category: "数据",
    description: "查询本地 SQLite 数据库（server-sqlite）",
    command: "uvx",
    args: ["mcp-server-sqlite", "--db-path", "${数据库路径}"],
    scope: "指定数据库文件的读写",
  },
  {
    key: "brave-search",
    name: "Brave 搜索",
    category: "信息",
    description: "网页搜索 API（需要 API Key）",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    scope: "网络搜索查询",
    byok: "BRAVE_API_KEY",
  },
  {
    key: "github",
    name: "GitHub",
    category: "开发",
    description: "仓库/Issue/PR 操作（需要 Personal Access Token）",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    scope: "Token 权限范围内的仓库操作",
    byok: "GITHUB_PERSONAL_ACCESS_TOKEN",
  },
  {
    key: "memory",
    name: "知识图谱记忆",
    category: "知识",
    description: "跨会话实体记忆（server-memory）",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    scope: "本地记忆文件",
  },
];

export class ConnectorService {
  async list(): Promise<Connector[]> {
    try {
      const data = await apiClient.get<{ data?: Connector[] }>("/api/mcp/servers");
      return data?.data ?? [];
    } catch {
      return [];
    }
  }

  async add(input: { name: string; command: string; args?: string[]; env?: Record<string, string> }): Promise<
    { ok: true; id: string } | { ok: false; reason: string }
  > {
    try {
      const data = await apiClient.post<{ data?: { id?: string }; msg?: string }>(
        "/api/mcp/servers",
        input,
      );
      const id = data?.data?.id;
      if (id) return { ok: true, id };
      return { ok: false, reason: data?.msg ?? "安装失败" };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) };
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/api/mcp/servers/${id}`);
      return true;
    } catch {
      return false;
    }
  }

  async tools(id: string): Promise<ConnectorTool[]> {
    try {
      const data = await apiClient.post<{ data?: { tools?: ConnectorTool[] } }>(
        `/api/mcp/servers/${id}/tools`,
        {},
      );
      return data?.data?.tools ?? [];
    } catch {
      return [];
    }
  }

  async call(id: string, tool: string, args: Record<string, unknown>): Promise<{ ok: boolean; result: string }> {
    try {
      const data = await apiClient.post<{ data?: unknown; msg?: string }>(
        `/api/mcp/servers/${id}/call`,
        { tool, arguments: args },
      );
      return { ok: true, result: JSON.stringify(data?.data ?? data, null, 2) };
    } catch (error) {
      return {
        ok: false,
        result: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const connectorService = new ConnectorService();

/** Does an installed connector match a catalog entry (same launch vector)? */
export function matchesCatalog(connector: Connector, entry: CatalogEntry): boolean {
  return (
    connector.command === entry.command &&
    (connector.args ?? []).join(" ") === entry.args.join(" ")
  );
}
