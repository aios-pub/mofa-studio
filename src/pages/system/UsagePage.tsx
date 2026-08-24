/**
 * Usage & logs panel (PLAT-15 用户面板「用量与日志」): filters over span
 * metadata, summary cards, per-model breakdown, and failure details.
 * Spans are metadata-only — no prompts or generated text ever appear.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, DatePicker, Select, Spin, Table, Tag, Empty } from "antd";
import { LineChartOutlined } from "@ant-design/icons";
import {
  DEFAULT_FILTER,
  byModel,
  distinctModels,
  filterSpans,
  summarize,
  usageService,
  type SpanFilter,
  type UsageSpan,
} from "@/services/api/usage";

const SOURCE_OPTIONS = [
  { value: "all", label: "全部来源" },
  { value: "chat", label: "对话" },
  { value: "studio", label: "创作" },
  { value: "flow", label: "工作流" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "ok", label: "成功" },
  { value: "error", label: "失败" },
];

function dayOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function UsagePage() {
  const [spans, setSpans] = useState<UsageSpan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SpanFilter>(DEFAULT_FILTER);

  const load = useCallback(async () => {
    setLoading(true);
    setSpans(await usageService.listSpans());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => filterSpans(spans, filter), [spans, filter]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const models = useMemo(() => byModel(filtered), [filtered]);
  const modelOptions = useMemo(
    () => [
      { value: "all", label: "全部模型" },
      ...distinctModels(spans).map((m) => ({ value: m, label: m })),
    ],
    [spans],
  );

  const setPreset = (days: number) => {
    setFilter((prev) => ({ ...prev, from: dayOffset(-days + 1), to: dayOffset(0) }));
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
          <LineChartOutlined className="text-[var(--color-primary)]" />
          用量与日志
        </h2>
        <div className="flex gap-2 text-xs">
          {[
            { label: "今天", days: 1 },
            { label: "近 7 天", days: 7 },
            { label: "近 30 天", days: 30 },
          ].map((preset) => (
            <button
              key={preset.days}
              onClick={() => setPreset(preset.days)}
              className="px-3 py-1 rounded-lg border border-(--color-border) hover:border-[var(--color-primary)] transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={filter.source}
          onChange={(source) => setFilter((prev) => ({ ...prev, source }))}
          options={SOURCE_OPTIONS}
          style={{ width: 130 }}
          aria-label="来源筛选"
        />
        <Select
          value={filter.model}
          onChange={(model) => setFilter((prev) => ({ ...prev, model }))}
          options={modelOptions}
          style={{ width: 200 }}
          showSearch
          aria-label="模型筛选"
        />
        <Select
          value={filter.status}
          onChange={(status) => setFilter((prev) => ({ ...prev, status }))}
          options={STATUS_OPTIONS}
          style={{ width: 120 }}
          aria-label="状态筛选"
        />
        <DatePicker
          placeholder="开始日期"
          onChange={(_date, text) =>
            setFilter((prev) => ({ ...prev, from: typeof text === "string" ? text : "" }))
          }
          aria-label="开始日期"
        />
        <DatePicker
          placeholder="结束日期"
          onChange={(_date, text) =>
            setFilter((prev) => ({ ...prev, to: typeof text === "string" ? text : "" }))
          }
          aria-label="结束日期"
        />
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Summary cards (token-based; BYOK cost needs per-vendor rates,
              deliberately not estimated here) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "调用次数", value: summary.calls },
              { label: "失败", value: summary.failures },
              { label: "输入 tokens", value: summary.tokensIn },
              { label: "输出 tokens", value: summary.tokensOut },
              { label: "平均耗时", value: `${summary.avgDurationMs}ms` },
            ].map((card) => (
              <Card key={card.label} size="small">
                <p className="text-xs text-[var(--color-text-tertiary)]">{card.label}</p>
                <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                  {card.value}
                </p>
              </Card>
            ))}
          </div>

          {/* Per-model breakdown */}
          <Card size="small" title="按模型汇总">
            <Table
              size="small"
              dataSource={models}
              rowKey="model"
              pagination={false}
              columns={[
                { title: "模型", dataIndex: "model", key: "model" },
                { title: "调用", dataIndex: "calls", key: "calls" },
                { title: "tokens", dataIndex: "tokens", key: "tokens" },
                {
                  title: "失败",
                  dataIndex: "failures",
                  key: "failures",
                  render: (value: number) =>
                    value > 0 ? <Tag color="red">{value}</Tag> : value,
                },
              ]}
            />
          </Card>

          {/* Span log with failure details */}
          <Card size="small" title={`调用日志（${filtered.length} 条）`}>
            {filtered.length === 0 ? (
              <Empty description="还没有调用记录——去对话或创作页试一试" />
            ) : (
              <Table
                size="small"
                dataSource={filtered.slice(0, 100)}
                rowKey="id"
                pagination={false}
                expandable={{
                  rowExpandable: (record) => record.status === "error",
                  expandedRowRender: (record) => (
                    <p className="text-xs text-red-400">
                      失败原因：{record.detail ?? "（引擎未返回详情）"}
                    </p>
                  ),
                }}
                columns={[
                  {
                    title: "时间",
                    dataIndex: "created_at",
                    key: "created_at",
                    render: (value: string) => value.replace("T", " ").slice(0, 19),
                    sorter: (a: UsageSpan, b: UsageSpan) =>
                      a.created_at.localeCompare(b.created_at),
                    defaultSortOrder: "descend",
                  },
                  { title: "来源", dataIndex: "source", key: "source" },
                  { title: "模型", dataIndex: "model", key: "model" },
                  {
                    title: "tokens",
                    key: "tokens",
                    render: (_: unknown, record: UsageSpan) =>
                      (record.tokens_in ?? 0) + (record.tokens_out ?? 0),
                  },
                  {
                    title: "耗时",
                    dataIndex: "duration_ms",
                    key: "duration_ms",
                    render: (value: number) => `${value}ms`,
                  },
                  {
                    title: "状态",
                    dataIndex: "status",
                    key: "status",
                    render: (value: string) =>
                      value === "ok" ? (
                        <Tag color="green">成功</Tag>
                      ) : (
                        <Tag color="red">失败</Tag>
                      ),
                  },
                ]}
              />
            )}
          </Card>

          <p className="text-xs text-[var(--color-text-tertiary)]">
            隐私说明：日志仅记录元数据（模型/tokens/耗时/成败），不包含提示词与生成原文。默认保留 90 天。
          </p>
        </>
      )}
    </div>
  );
}
