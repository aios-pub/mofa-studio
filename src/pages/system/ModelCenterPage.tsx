/**
 * 模型管理中心 (FLOW-05): 双轨视图.
 *
 * - 云轨: engine model cards grouped by capability (BYOK via the key wizard).
 * - 本地轨: Ollama 代理 — 拉取模型（断点续传由 Ollama 提供）、磁盘占用、
 *   删除。边界声明: 本地推理经 Ollama 等外部服务代理，本页不运行模型。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Empty, Input, Progress, Spin, Table, Tag, message } from "antd";
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { engineService, type EngineModel } from "@/services/api/engine";
import {
  formatBytes,
  modelCenterService,
  type LocalModel,
  type PullTask,
} from "@/services/api/modelCenter";

const CAPABILITY_LABEL: Record<string, string> = {
  chat: "对话",
  vlm: "识图",
  image_gen: "生图",
  image_edit: "改图",
  video_gen: "生视频",
  tts: "语音合成",
  asr: "语音识别",
  embedding: "向量",
};

const POLL_MS = 1200;

export default function ModelCenterPage() {
  // Cloud track: engine model cards.
  const [engineModels, setEngineModels] = useState<EngineModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  // Local track.
  const [storage, setStorage] = useState<{ models: LocalModel[]; total_bytes: number } | null>(
    null,
  );
  const [localUnavailable, setLocalUnavailable] = useState(false);
  const [pulls, setPulls] = useState<PullTask[]>([]);
  const [pullName, setPullName] = useState("");
  const timerRef = useRef<number | null>(null);

  const loadEngineModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      setEngineModels(await engineService.listModels());
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const loadLocal = useCallback(async () => {
    const s = await modelCenterService.localStorage();
    if (s === null) {
      setLocalUnavailable(true);
      setStorage(null);
      return;
    }
    setLocalUnavailable(false);
    setStorage(s);
  }, []);

  const loadPulls = useCallback(async () => {
    setPulls(await modelCenterService.pulls());
  }, []);

  useEffect(() => {
    void loadEngineModels();
    void loadLocal();
    void loadPulls();
  }, [loadEngineModels, loadLocal, loadPulls]);

  // Poll while any pull is active; stop when quiescent.
  useEffect(() => {
    const active = pulls.some((p) => p.status === "pulling");
    if (active && timerRef.current === null) {
      timerRef.current = window.setInterval(() => void loadPulls(), POLL_MS);
    } else if (!active && timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
      // Finished pulls may have landed on disk — refresh the accounting.
      void loadLocal();
    }
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pulls, loadPulls, loadLocal]);

  const startPull = async () => {
    const name = pullName.trim();
    if (!name) return;
    const id = await modelCenterService.pull(name);
    if (!id) {
      message.error("拉取启动失败（本地 Ollama 不可达？）");
      return;
    }
    setPullName("");
    await loadPulls();
  };

  const removeModel = async (name: string) => {
    const ok = await modelCenterService.delete(name);
    if (ok) {
      message.success(`已删除 ${name}，磁盘已释放`);
      await loadLocal();
    } else {
      message.error("删除失败");
    }
  };

  const grouped = engineModels.reduce<Record<string, EngineModel[]>>(
    (acc, model) => {
      const key = model.capability ?? "other";
      (acc[key] ??= []).push(model);
      return acc;
    },
    {},
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
          模型中心
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          云端模型配好 Key 即用（<Link to="/onboarding/key" className="underline">去配置密钥</Link>）；
          本地模型经 Ollama 代理拉取与管理
        </p>
      </header>

      {/* 云轨: engine cards by capability */}
      <section aria-label="云端模型" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">云端模型（引擎路由）</h2>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => void loadEngineModels()}>
            刷新
          </Button>
        </div>
        {loadingModels ? (
          <Spin />
        ) : engineModels.length === 0 ? (
          <Empty description="引擎暂无模型：配置 provider 或启动 Ollama 后刷新" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(grouped).map(([capability, models]) => (
              <div
                key={capability}
                className="rounded-xl border border-(--color-border) p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {CAPABILITY_LABEL[capability] ?? capability}
                  </span>
                  <Tag>{models.length}</Tag>
                </div>
                <ul className="text-xs text-[var(--color-text-tertiary)] space-y-0.5">
                  {models.slice(0, 5).map((m) => (
                    <li key={m.id} className="truncate">
                      {m.id}
                      {m.cost_tier && m.cost_tier !== "free" ? " · 付费" : ""}
                    </li>
                  ))}
                  {models.length > 5 && <li>…共 {models.length} 个</li>}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 本地轨: Ollama proxy */}
      <section aria-label="本地模型" className="space-y-3">
        <h2 className="text-base font-semibold">本地模型（Ollama 代理）</h2>
        {localUnavailable ? (
          <Empty
            description={
              <span className="text-xs">
                本地 Ollama 不可达。安装并启动 Ollama
                后此处可拉取/管理本地模型；拉取支持断点续传
              </span>
            }
          />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Input
                value={pullName}
                onChange={(e) => setPullName(e.target.value)}
                placeholder="模型名，如 qwen3:8b"
                style={{ width: 260 }}
                aria-label="拉取模型名"
                onPressEnter={() => void startPull()}
              />
              <Button
                type="primary"
                icon={<CloudDownloadOutlined />}
                onClick={() => void startPull()}
                aria-label="拉取模型"
                disabled={!pullName.trim()}
              >
                拉取
              </Button>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                磁盘占用 {formatBytes(storage?.total_bytes ?? 0)}
              </span>
            </div>

            {pulls.length > 0 && (
              <div className="space-y-2" aria-label="拉取任务">
                {pulls.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-(--color-border) p-2 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-medium">{task.name}</span>
                        <span className="text-[var(--color-text-tertiary)]">
                          {task.status === "pulling"
                            ? (task.percent ?? "…") + (task.percent != null ? "%" : "")
                            : task.status === "done"
                              ? "完成"
                              : task.status === "cancelled"
                                ? "已取消"
                                : "失败"}
                        </span>
                      </div>
                      {task.status === "pulling" && (
                        <Progress
                          percent={task.percent ?? 0}
                          size="small"
                          status={task.percent == null ? "active" : "normal"}
                          showInfo={false}
                        />
                      )}
                      {task.detail && task.status === "error" && (
                        <p className="text-xs text-red-500 truncate" title={task.detail}>
                          {task.detail}
                        </p>
                      )}
                    </div>
                    {task.status === "pulling" && (
                      <Button
                        size="small"
                        onClick={() => void modelCenterService.cancel(task.id).then(loadPulls)}
                        aria-label={`取消拉取 ${task.name}`}
                      >
                        取消
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Table<LocalModel>
              rowKey="name"
              size="small"
              dataSource={storage?.models ?? []}
              locale={{ emptyText: "暂无本地模型" }}
              pagination={false}
              columns={[
                { title: "模型", dataIndex: "name", key: "name" },
                {
                  title: "磁盘占用",
                  dataIndex: "size_bytes",
                  key: "size",
                  width: 140,
                  render: (v: number) => formatBytes(v),
                },
                {
                  title: "",
                  key: "actions",
                  width: 80,
                  render: (_, record) => (
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => void removeModel(record.name)}
                      aria-label={`删除 ${record.name}`}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </section>
    </div>
  );
}
