/**
 * 连接器 (TASK-09): 官方目录一键安装（安装前展示授权范围）· 自定义 MCP
 * server · 工具发现与真实调用 · 撤销授权即失效（删除 = 断开）。
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Empty,
  Input,
  Modal,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ApiOutlined,
  DeleteOutlined,
  PlusOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  CONNECTOR_CATALOG,
  connectorService,
  matchesCatalog,
  type CatalogEntry,
  type Connector,
  type ConnectorTool,
} from "@/services/api/connectors";

export default function ConnectorsPage() {
  const [installed, setInstalled] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState({ name: "", command: "", args: "" });
  const [confirmEntry, setConfirmEntry] = useState<CatalogEntry | null>(null);
  const [confirmDir, setConfirmDir] = useState("");
  // Tool inspection state per connector.
  const [toolsFor, setToolsFor] = useState<Connector | null>(null);
  const [tools, setTools] = useState<ConnectorTool[] | null>(null);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [callTool, setCallTool] = useState("");
  const [callArgs, setCallArgs] = useState("{}");
  const [callResult, setCallResult] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInstalled(await connectorService.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const install = async (entry: CatalogEntry, dir: string) => {
    setInstalling(entry.key);
    const args = entry.args.map((a) => a.replace("${目录}", dir).replace("${数据库路径}", dir));
    const env: Record<string, string> = {};
    if (entry.byok && process.env[`MOFA_${entry.key.toUpperCase()}_KEY`]) {
      env[entry.byok] = process.env[`MOFA_${entry.key.toUpperCase()}_KEY`] as string;
    }
    const result = await connectorService.add({
      name: entry.name,
      command: entry.command,
      args,
      env: Object.keys(env).length ? env : undefined,
    });
    setInstalling(null);
    setConfirmEntry(null);
    setConfirmDir("");
    if (!result.ok) {
      message.error(`安装失败：${result.reason}`);
      return;
    }
    message.success(`已安装「${entry.name}」，可查看其工具并试调用`);
    await load();
  };

  const installCustom = async () => {
    if (!custom.name.trim() || !custom.command.trim()) {
      message.warning("名称与命令必填");
      return;
    }
    const result = await connectorService.add({
      name: custom.name.trim(),
      command: custom.command.trim(),
      args: custom.args.trim() ? custom.args.trim().split(/\s+/) : undefined,
    });
    if (!result.ok) {
      message.error(`添加失败：${result.reason}`);
      return;
    }
    setCustomOpen(false);
    setCustom({ name: "", command: "", args: "" });
    message.success("已添加自定义连接器");
    await load();
  };

  const revoke = async (connector: Connector) => {
    const ok = await connectorService.remove(connector.id);
    if (ok) {
      message.success(`已撤销「${connector.name}」，其工具立即不可用`);
      await load();
    } else {
      message.error("撤销失败");
    }
  };

  const inspect = async (connector: Connector) => {
    setToolsFor(connector);
    setTools(null);
    setCallResult(null);
    setCallTool("");
    setToolsLoading(true);
    const list = await connectorService.tools(connector.id);
    setTools(list);
    setToolsLoading(false);
    if (list.length === 0) {
      message.warning("未发现工具（连接器未启动或命令不可执行）");
    }
  };

  const runCall = async () => {
    if (!toolsFor || !callTool.trim()) return;
    let args: Record<string, unknown>;
    try {
      args = callArgs.trim() ? JSON.parse(callArgs) : {};
    } catch {
      message.error("参数必须是合法 JSON");
      return;
    }
    setCalling(true);
    const result = await connectorService.call(toolsFor.id, callTool.trim(), args);
    setCalling(false);
    setCallResult(`${result.ok ? "✅" : "❌"} ${result.result}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">连接器</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            接入网盘/搜索/代码库等外部能力（MCP 标准）；撤销授权后工具立即失效
          </p>
        </div>
        <Button icon={<PlusOutlined />} onClick={() => setCustomOpen(true)} aria-label="添加自定义连接器">
          自定义
        </Button>
      </header>

      {/* Official catalog */}
      <section aria-label="官方目录" className="space-y-3">
        <h2 className="text-base font-semibold">官方目录</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CONNECTOR_CATALOG.map((entry) => {
            const already = installed.some((c) => matchesCatalog(c, entry));
            return (
              <div key={entry.key} className="rounded-xl border border-(--color-border) p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <ApiOutlined className="text-[var(--color-primary)]" />
                  <span className="text-sm font-medium flex-1 truncate">{entry.name}</span>
                  {entry.byok && <Tag color="orange">BYOK</Tag>}
                  {already && <Tag color="green">已安装</Tag>}
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">{entry.description}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] flex items-start gap-1">
                  <SafetyOutlined className="mt-0.5" />
                  授权范围：{entry.scope}
                </p>
                <Button
                  size="small"
                  type={already ? "default" : "primary"}
                  loading={installing === entry.key}
                  onClick={() => setConfirmEntry(entry)}
                  aria-label={`安装 ${entry.name}`}
                >
                  {already ? "再装一个" : "一键安装"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Installed */}
      <section aria-label="已安装" className="space-y-3">
        <h2 className="text-base font-semibold">已安装</h2>
        {loading ? (
          <Spin />
        ) : installed.length === 0 ? (
          <Empty description="尚未安装连接器" />
        ) : (
          <div className="space-y-2">
            {installed.map((connector) => (
              <div
                key={connector.id}
                className="rounded-lg border border-(--color-border) p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{connector.name}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                    {connector.command} {(connector.args ?? []).join(" ")}
                  </p>
                </div>
                <Button size="small" icon={<ThunderboltOutlined />} onClick={() => void inspect(connector)} aria-label={`查看工具 ${connector.name}`}>
                  工具
                </Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => void revoke(connector)} aria-label={`撤销 ${connector.name}`}>
                  撤销
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Install confirm (scope + dir placeholder) */}
      <Modal
        title={`安装「${confirmEntry?.name ?? ""}」`}
        open={confirmEntry !== null}
        okText="确认安装"
        cancelText="取消"
        onCancel={() => setConfirmEntry(null)}
        onOk={() => confirmEntry && void install(confirmEntry, confirmDir)}
      >
        {confirmEntry && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--color-text-secondary)]">
              命令：<code>{confirmEntry.command} {confirmEntry.args.join(" ")}</code>
            </p>
            <p className="text-xs">授权范围：{confirmEntry.scope}</p>
            {confirmEntry.args.some((a) => a.startsWith("${")) && (
              <div>
                <label className="block text-sm mb-1">替换占位符（目录/数据库路径）</label>
                <Input
                  value={confirmDir}
                  onChange={(e) => setConfirmDir(e.target.value)}
                  placeholder="/Users/you/Documents/workspace"
                  aria-label="授权目录"
                />
              </div>
            )}
            {confirmEntry.byok && (
              <p className="text-xs text-orange-500">
                需要环境变量 {confirmEntry.byok}（在系统环境配置后重启应用生效）
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Custom connector */}
      <Modal
        title="添加自定义连接器（MCP server）"
        open={customOpen}
        okText="添加"
        cancelText="取消"
        onCancel={() => setCustomOpen(false)}
        onOk={() => void installCustom()}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">名称 *</label>
            <Input value={custom.name} onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))} aria-label="连接器名称" />
          </div>
          <div>
            <label className="block text-sm mb-1">启动命令 *</label>
            <Input value={custom.command} onChange={(e) => setCustom((c) => ({ ...c, command: e.target.value }))} aria-label="连接器命令" placeholder="npx" />
          </div>
          <div>
            <label className="block text-sm mb-1">参数（空格分隔）</label>
            <Input value={custom.args} onChange={(e) => setCustom((c) => ({ ...c, args: e.target.value }))} aria-label="连接器参数" placeholder="-y @modelcontextprotocol/server-fetch" />
          </div>
        </div>
      </Modal>

      {/* Tools inspection + live call */}
      <Modal
        title={`「${toolsFor?.name ?? ""}」的工具`}
        open={toolsFor !== null}
        footer={null}
        onCancel={() => setToolsFor(null)}
        width={640}
      >
        {toolsLoading ? (
          <Spin />
        ) : (
          <div className="space-y-3">
            {tools && tools.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto text-xs space-y-1" aria-label="工具清单">
                {tools.map((tool) => (
                  <li key={tool.name} className="rounded border border-(--color-border) px-2 py-1">
                    <span className="font-medium">{tool.name}</span>
                    {tool.description && (
                      <span className="text-[var(--color-text-tertiary)]"> — {tool.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty description="无工具" />
            )}
            <div className="space-y-2 border-t border-(--color-border) pt-3">
              <div className="flex gap-2">
                <Input
                  value={callTool}
                  onChange={(e) => setCallTool(e.target.value)}
                  placeholder="工具名"
                  style={{ width: 200 }}
                  aria-label="调用工具名"
                />
                <Button loading={calling} onClick={() => void runCall()} aria-label="调用工具">
                  调用
                </Button>
              </div>
              <Input.TextArea
                value={callArgs}
                onChange={(e) => setCallArgs(e.target.value)}
                rows={3}
                aria-label="调用参数 JSON"
                placeholder='{"key": "value"}'
              />
              {callResult && (
                <Typography.Paragraph>
                  <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">{callResult}</pre>
                </Typography.Paragraph>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
