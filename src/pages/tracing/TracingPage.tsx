/**
 * Tracing 追踪页面
 * 使用 Ant Design 组件重构
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Table,
  Select,
  Button,
  Tag,
  Space,
  Input,
  Drawer,
  Descriptions,
  Statistic,
  Row,
  Col,
  Typography,
  Dropdown,
  message,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RightOutlined,
  DownOutlined,
  FundOutlined,
  DownloadOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/common";
import type { Trace, Span, TracingStats } from "../../types/tracing";
import { tracingApi } from "@/services";

const { Text } = Typography;

export default function TracingPage() {
  const { t } = useTranslation();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [stats, setStats] = useState<TracingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());

  // 过滤条件
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const loadTraces = useCallback(async () => {
    setLoading(true);
    try {
      const [tracesResult, statsResult] = await Promise.all([
        tracingApi.getTraces({
          status: statusFilter || undefined,
        }),
        tracingApi.getTracingStats(),
      ]);
      setTraces(tracesResult.data);
      setStats(statsResult);
    } catch (error) {
      console.error("Failed to load traces:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTraces();
  }, [loadTraces]);

  // 过滤追踪
  const filteredTraces = traces.filter((trace) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      trace.trace_id.toLowerCase().includes(query) ||
      trace.operation_name.toLowerCase().includes(query) ||
      trace.service_name.toLowerCase().includes(query)
    );
  });

  const toggleSpan = (span_id: string) => {
    const newExpanded = new Set(expandedSpans);
    if (newExpanded.has(span_id)) {
      newExpanded.delete(span_id);
    } else {
      newExpanded.add(span_id);
    }
    setExpandedSpans(newExpanded);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleRowClick = (record: Trace) => {
    setSelectedTrace(record);
    setDrawerOpen(true);
  };

  // 导出功能
  const handleExport = async (format: "json" | "csv") => {
    try {
      const blob = await tracingApi.exportTraces(
        {
          status: statusFilter || undefined,
          trace_id: searchQuery || undefined,
        },
        format,
      );

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `traces-export-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success(t("tracing.exportSuccess", "导出成功"));
    } catch (error) {
      console.error("Export failed:", error);
      message.error(t("tracing.exportFailed", "导出失败"));
    }
  };

  // 表格列配置
  const columns: ColumnsType<Trace> = [
    {
      title: t("tracing.operation", "操作"),
      dataIndex: "operation_name",
      key: "operation_name",
      render: (name: string, record: Trace) => (
        <Space>
          {record.has_error ? (
            <CloseCircleOutlined className="text-red-500" />
          ) : (
            <CheckCircleOutlined className="text-green-500" />
          )}
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: t("tracing.service", "服务"),
      dataIndex: "service_name",
      key: "service_name",
      width: 150,
      render: (name: string) => <Text type="secondary">{name}</Text>,
    },
    {
      title: t("common.status", "状态"),
      dataIndex: "has_error",
      key: "status",
      width: 100,
      render: (hasError: boolean) => (
        <Tag color={hasError ? "error" : "success"}>
          {hasError ? "ERROR" : "OK"}
        </Tag>
      ),
    },
    {
      title: t("tracing.duration", "耗时"),
      dataIndex: "total_duration",
      key: "duration",
      width: 120,
      sorter: (a, b) => a.total_duration - b.total_duration,
      render: (duration: number) => (
        <Text type="secondary">{formatDuration(duration)}</Text>
      ),
    },
    {
      title: t("tracing.startTime", "开始时间"),
      dataIndex: "start_time",
      key: "start_time",
      width: 120,
      sorter: (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      render: (time: string) => (
        <Text type="secondary" className="text-xs">
          {formatTime(time)}
        </Text>
      ),
    },
  ];

  // 渲染 Span 树
  const renderSpanTree = (
    spans: Span[],
    parent_span_id?: string,
    depth: number = 0,
  ): React.ReactElement[] => {
    return spans
      .filter((span) => span.parent_span_id === parent_span_id)
      .map((span) => {
        const hasChildren = spans.some(
          (s) => s.parent_span_id === span.span_id,
        );
        const isExpanded = expandedSpans.has(span.span_id);

        return (
          <div key={span.span_id}>
            <div
              className={`flex items-center gap-2 py-2 px-3 hover:bg-[var(--color-bg-tertiary)] cursor-pointer ${
                depth > 0 ? "ml-6" : ""
              }`}
              onClick={() => hasChildren && toggleSpan(span.span_id)}
            >
              {hasChildren ? (
                isExpanded ? (
                  <DownOutlined className="text-xs text-[var(--color-text-tertiary)]" />
                ) : (
                  <RightOutlined className="text-xs text-[var(--color-text-tertiary)]" />
                )
              ) : (
                <span className="w-4" />
              )}

              <Text strong className="text-sm">
                {span.name}
              </Text>

              <Tag
                color={
                  span.status === "OK"
                    ? "success"
                    : span.status === "ERROR"
                      ? "error"
                      : "default"
                }
                className="ml-auto"
              >
                {span.status}
              </Tag>

              <Text type="secondary" className="text-xs">
                {formatDuration(span.duration)}
              </Text>
            </div>

            {hasChildren &&
              isExpanded &&
              renderSpanTree(spans, span.span_id, depth + 1)}
          </div>
        );
      });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("tracing.title", "追踪分析")}
        description={t("tracing.subtitle", "OpenTelemetry 分布式追踪")}
        icon={<FundOutlined className="text-xl" />}
        actions={
          <Space>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "json",
                    label: t("tracing.exportJSON", "导出 JSON"),
                    icon: <DownloadOutlined />,
                    onClick: () => handleExport("json"),
                  },
                  {
                    key: "csv",
                    label: t("tracing.exportCSV", "导出 CSV"),
                    icon: <FileTextOutlined />,
                    onClick: () => handleExport("csv"),
                  },
                ],
              }}
            >
              <Button icon={<DownloadOutlined />}>
                {t("tracing.export", "导出")}
              </Button>
            </Dropdown>
            <Button
              type="primary"
              icon={<ReloadOutlined spin={loading} />}
              onClick={loadTraces}
              loading={loading}
            >
              {t("common.refresh", "刷新")}
            </Button>
          </Space>
        }
      />

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t("tracing.totalTraces", "总追踪数")}
                value={stats.total_traces}
                styles={{ content: { color: "var(--color-text-primary)" } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t("tracing.errorRate", "错误率")}
                value={stats.error_rate.toFixed(1)}
                suffix="%"
                styles={{ content: { color: "#ef4444" } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t("tracing.avgDuration", "平均耗时")}
                value={formatDuration(stats.avg_duration)}
                styles={{ content: { color: "var(--color-text-primary)" } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title={t("tracing.p95Duration", "P95 耗时")}
                value={formatDuration(stats.p95_duration)}
                styles={{ content: { color: "var(--color-text-primary)" } }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 筛选区域 */}
      <Card size="small">
        <Space>
          <Input
            placeholder={t(
              "tracing.searchPlaceholder",
              "搜索 Trace ID、操作名...",
            )}
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            value={statusFilter || undefined}
            onChange={setStatusFilter}
            allowClear
            style={{ width: 140 }}
            placeholder={t("tracing.allStatus", "全部状态")}
            options={[
              { label: t("tracing.statusOK", "成功"), value: "OK" },
              { label: t("tracing.statusError", "错误"), value: "ERROR" },
            ]}
          />
        </Space>
      </Card>

      {/* 追踪表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredTraces}
          rowKey="trace_id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            className: "cursor-pointer hover:bg-[var(--color-bg-secondary)]",
          })}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) =>
              t("pagination.total", `共 ${total} 条`, { total }),
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          locale={{
            emptyText: t("tracing.noTraces", "暂无追踪数据"),
          }}
        />
      </Card>

      {/* 追踪详情抽屉 */}
      <Drawer
        title={t("tracing.traceDetails", "追踪详情")}
        placement="right"
        size={{ width: 450 }}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedTrace && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <Card size="small" title="基本信息">
              <Descriptions column={1} size="small">
                <Descriptions.Item label={t("tracing.traceId", "Trace ID")}>
                  <Text code className="text-xs break-all">
                    {selectedTrace.trace_id}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label={t("tracing.operation", "操作")}>
                  {selectedTrace.operation_name}
                </Descriptions.Item>
                <Descriptions.Item label={t("tracing.spans", "Span 数量")}>
                  {selectedTrace.span_count}
                </Descriptions.Item>
                <Descriptions.Item label={t("tracing.duration", "总耗时")}>
                  {formatDuration(selectedTrace.total_duration)}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Span 树 */}
            <Card size="small" title={t("tracing.spanTree", "Span 树")}>
              <div className="border border-(--color-border) rounded-lg max-h-96 overflow-y-auto">
                {renderSpanTree(selectedTrace.spans || [])}
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}
