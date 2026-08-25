/**
 * Flow Apps (FLOW-08): published canvas subgraphs as simple form tools.
 * Fill the exposed inputs, run, see results — teammates never touch the
 * canvas.
 */

import { useCallback, useEffect, useState } from "react";
import { Button, Empty, Input, Spin, Tag, message, Popconfirm } from "antd";
import { AppstoreOutlined, PlayCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  bindAppGraph,
  flowAppService,
  type FlowApp,
} from "@/services/api/flowApp";
import { flowService } from "@/services/api/flow";

export default function FlowAppsPage() {
  const [apps, setApps] = useState<FlowApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [results, setResults] = useState<Record<string, string[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setApps(await flowAppService.list());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    async (app: FlowApp) => {
      if (running) return;
      const form = values[app.id] ?? {};
      setRunning(app.id);
      try {
        const graph = bindAppGraph(app, form);
        const result = await flowService.execute(graph);
        if (result.ok) {
          const images: string[] = [];
          for (const output of Object.values(result.node_outputs)) {
            const list = (output as Record<string, unknown>).images;
            if (Array.isArray(list)) {
              for (const item of list) {
                if (typeof item === "string") {
                  images.push(`data:image/png;base64,${item}`);
                }
              }
            }
          }
          setResults((prev) => ({ ...prev, [app.id]: images }));
          message.success(`执行 ${result.executed} · 缓存 ${result.cached}`);
        } else {
          message.error(`执行失败：${result.error ?? "未知错误"}`);
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        message.error(`执行失败：${detail}`);
      } finally {
        setRunning(null);
      }
    },
    [running, values],
  );

  const remove = useCallback(
    async (app: FlowApp) => {
      if (await flowAppService.remove(app.id)) {
        await load();
      }
    },
    [load],
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <AppstoreOutlined className="text-[var(--color-primary)]" />
          应用
        </h2>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          由工作流画布发布的表单工具——填参数即可复用
        </span>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : apps.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <Empty description="还没有应用——在工作流画布上点「发布为应用」，把调好的流程变成简单表单" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-6xl">
          {apps.map((app) => {
            const images = results[app.id] ?? [];
            return (
              <div
                key={app.id}
                className="p-4 rounded-2xl border border-(--color-border) bg-[var(--color-bg-secondary)] space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                    {app.name}
                  </h3>
                  <Popconfirm title="下架这个应用？" onConfirm={() => void remove(app)} okText="下架" cancelText="取消">
                    <Button size="small" danger icon={<DeleteOutlined />} aria-label={`下架 ${app.name}`} />
                  </Popconfirm>
                </div>
                {app.description && (
                  <p className="text-xs text-[var(--color-text-tertiary)]">{app.description}</p>
                )}

                {/* The exposed form (FLOW-08: 只有选定输入暴露) */}
                <div className="space-y-2">
                  {app.inputs.map((input) => (
                    <div key={input.nodeId}>
                      <label className="block text-xs font-medium mb-1 text-[var(--color-text-secondary)]">
                        {input.label}
                      </label>
                      <Input
                        value={(values[app.id] ?? {})[input.nodeId] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [app.id]: {
                              ...(prev[app.id] ?? {}),
                              [input.nodeId]: e.target.value,
                            },
                          }))
                        }
                        placeholder={input.placeholder}
                        aria-label={`${app.name} ${input.label}`}
                      />
                    </div>
                  ))}
                </div>

                <Button
                  type="primary"
                  block
                  icon={<PlayCircleOutlined />}
                  loading={running === app.id}
                  onClick={() => void run(app)}
                  aria-label={`运行 ${app.name}`}
                >
                  运行
                </Button>

                {images.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-(--color-border)">
                    <Tag color="green">产物 {images.length}</Tag>
                    {images.map((src, index) => (
                      <img
                        key={index}
                        src={src}
                        alt={`${app.name} 产物 ${index + 1}`}
                        className="w-full rounded-lg border border-(--color-border)"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
