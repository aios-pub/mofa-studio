/**
 * Agent evaluation page
 * Rebuilt with Ant Design components
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Table,
  Select,
  Button,
  Tag,
  Statistic,
  Row,
  Col,
  Space,
  Tooltip,
  Typography,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
} from "antd";
import {
  StarOutlined,
  RobotOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  FilterOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type {
  EvaluationMetric,
  EvaluationRecord,
  AgentEvaluationSummary,
} from "../../types/evaluation";
import { evaluationApi } from "@/services";
import type { Evaluation } from "@/services/real/evaluation";
import { formatDate } from "@/utils";

const { Title, Text } = Typography;

export default function EvaluationPage() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<EvaluationMetric[]>([]);
  const [summaries, setSummaries] = useState<AgentEvaluationSummary[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsData, summariesData, evalsData, agentsData] =
        await Promise.all([
          evaluationApi.getEvaluationMetrics(),
          evaluationApi.getAllAgentSummaries(),
          evaluationApi.getAgentEvaluations({
            agentId: selectedAgent || undefined,
          }),
          evaluationApi.getAgents(),
        ]);
      setMetrics(metricsData);
      setSummaries(summariesData);
      // Adapt Evaluation[] → EvaluationRecord[]
      const records: EvaluationRecord[] = (evalsData as Evaluation[]).map(
        (e) => ({
          id: e.id,
          agentId: e.agentId,
          conversationId: e.conversationId || "",
          metrics:
            e.metrics &&
            typeof e.metrics === "object" &&
            !Array.isArray(e.metrics)
              ? Object.entries(e.metrics).map(([metricId, value]) => ({
                  metricId,
                  value: value as number,
                }))
              : Array.isArray(e.metrics)
                ? e.metrics
                : [],
          overallScore: e.overallScore ?? 0,
          evaluatedAt:
            (e.createTime instanceof Date
              ? e.createTime.toISOString()
              : e.createTime) ?? "",
          evaluator: (e.evaluator === "human" ? "human" : "auto") as
            | "auto"
            | "human",
          evaluatorId: e.evaluatorId,
          evaluatorName: e.evaluator,
          feedback: e.feedback,
        }),
      );
      setEvaluations(records);
      setAgents(agentsData);
    } catch (error) {
      console.error("Failed to load evaluation data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create evaluation
  const handleCreateEvaluation = async () => {
    try {
      const values = await createForm.validateFields();
      setCreateLoading(true);
      await evaluationApi.create({
        agentId: values.agentId,
        overallScore: values.overallScore,
        feedback: values.feedback || "",
        metrics: {},
      });
      setShowCreateModal(false);
      createForm.resetFields();
      message.success(t("common.createSuccess", "创建成功"));
      loadData();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.message || t("common.createFailed", "创建失败"));
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete evaluation
  const handleDeleteEvaluation = (record: EvaluationRecord) => {
    Modal.confirm({
      title: t("evaluation.confirmDelete", "确认删除"),
      content: t("evaluation.deleteContent", "确定要删除该评估记录吗？"),
      okText: t("common.delete", "删除"),
      okButtonProps: { danger: true },
      cancelText: t("common.cancel", "取消"),
      onOk: async () => {
        await evaluationApi.delete(record.id);
        setEvaluations((prev) => prev.filter((e) => e.id !== record.id));
        message.success(t("common.deleteSuccess", "已删除"));
      },
    });
  };

  // Get trend icon
  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <RiseOutlined className="text-green-500" />;
      case "down":
        return <FallOutlined className="text-red-500" />;
      default:
        return <MinusOutlined className="text-gray-400" />;
    }
  };

  // Get rating color
  const getScoreColor = (score: number) => {
    if (score >= 8) return "#22c55e";
    if (score >= 6) return "#f59e0b";
    return "#ef4444";
  };

  // Table column configuration
  const columns: ColumnsType<EvaluationRecord> = [
    {
      title: t("evaluation.agent", "Agent"),
      dataIndex: "agentId",
      key: "agentId",
      width: 200,
      render: (agentId: string) => {
        const agent = agents.find((a) => a.id === agentId);
        return (
          <Space>
            <RobotOutlined className="text-[var(--color-primary)]" />
            <Text strong>{agent?.name || "Unknown"}</Text>
          </Space>
        );
      },
    },
    {
      title: t("evaluation.overallScore", "综合评分"),
      dataIndex: "overallScore",
      key: "overallScore",
      width: 150,
      sorter: (a, b) => a.overallScore - b.overallScore,
      render: (score: number) => (
        <Space>
          <StarOutlined style={{ color: getScoreColor(score) }} />
          <Text strong style={{ color: getScoreColor(score) }}>
            {score.toFixed(1)}
          </Text>
        </Space>
      ),
    },
    {
      title: t("evaluation.evaluator", "评估者"),
      dataIndex: "evaluator",
      key: "evaluator",
      width: 150,
      render: (evaluator: string, record: EvaluationRecord) => (
        <Space orientation="vertical" size={0}>
          <Tag color={evaluator === "auto" ? "blue" : "purple"}>
            {evaluator === "auto"
              ? t("evaluation.auto", "自动")
              : t("evaluation.manual", "人工")}
          </Tag>
          {record.evaluatorName && (
            <Text type="secondary" className="text-xs">
              {record.evaluatorName}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t("evaluation.evaluatedAt", "评估时间"),
      dataIndex: "evaluatedAt",
      key: "evaluatedAt",
      width: 180,
      sorter: (a, b) =>
        new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime(),
      render: (date: string) => (
        <Text type="secondary">{formatDate(date)}</Text>
      ),
    },
    {
      title: t("evaluation.feedback", "反馈"),
      dataIndex: "feedback",
      key: "feedback",
      ellipsis: true,
      render: (feedback?: string) =>
        feedback ? (
          <Tooltip title={feedback}>
            <Text className="max-w-[200px] truncate">{feedback}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: t("common.actions", "操作"),
      key: "actions",
      width: 80,
      render: (_: unknown, record: EvaluationRecord) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteEvaluation(record)}
        />
      ),
    },
  ];

  // Expanded row rendering
  const expandedRowRender = (record: EvaluationRecord) => {
    const metricScores = record.metrics || [];

    return (
      <div className="p-4 bg-[var(--color-bg-secondary)]">
        <Row gutter={[16, 16]}>
          {metricScores.map((score) => {
            const metric = metrics.find((m) => m.id === score.metricId);
            return (
              <Col key={score.metricId} xs={12} sm={8} md={6} lg={4}>
                <Card size="small" className="text-center">
                  <Statistic
                    title={metric?.name || score.metricId}
                    value={score.value}
                    precision={1}
                    styles={{
                      content: {
                        color: getScoreColor(score.value),
                        fontSize: "24px",
                      },
                    }}
                    prefix={<StarOutlined />}
                  />
                  {score.reason && (
                    <Text
                      type="secondary"
                      className="text-xs mt-2 block truncate"
                      title={score.reason}
                    >
                      {score.reason}
                    </Text>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <Card>
        <div className="flex items-center justify-between">
          <Space>
            <TrophyOutlined className="text-2xl text-[var(--color-primary)]" />
            <div>
              <Title level={4} className="!mb-0">
                {t("evaluation.title", "Agent 评估")}
              </Title>
              <Text type="secondary">
                {t("evaluation.subtitle", "评估和追踪 Agent 性能表现")}
              </Text>
            </div>
          </Space>
          <Space>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            >
              {t("evaluation.createEvaluation", "新建评估")}
            </Button>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={loadData}
              loading={loading}
            >
              {t("common.refresh", "刷新")}
            </Button>
          </Space>
        </div>
      </Card>

      {/* Agent overview cards */}
      <Row gutter={[16, 16]}>
        {summaries.slice(0, 4).map((summary) => (
          <Col key={summary.agentId} xs={24} sm={12} md={6}>
            <Card
              hoverable
              className={`cursor-pointer transition-all ${
                selectedAgent === summary.agentId
                  ? "ring-2 ring-[var(--color-primary)] border-(--color-primary)"
                  : ""
              }`}
              onClick={() =>
                setSelectedAgent(
                  selectedAgent === summary.agentId ? "" : summary.agentId,
                )
              }
            >
              <div className="flex items-center justify-between mb-2">
                <Text strong className="truncate">
                  {summary.agentName}
                </Text>
                {getTrendIcon(summary.trend)}
              </div>
              <Statistic
                value={summary.avgScore}
                precision={1}
                suffix="/ 10"
                styles={{
                  content: {
                    color: getScoreColor(summary.avgScore),
                    fontSize: "28px",
                  },
                }}
                prefix={<StarOutlined />}
              />
              <Text type="secondary" className="text-xs mt-2">
                {summary.totalEvaluations}{" "}
                {t("evaluation.evaluations", "次评估")}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filter toolbar */}
      <Card size="small">
        <Space>
          <FilterOutlined className="text-[var(--color-text-tertiary)]" />
          <Select
            value={selectedAgent}
            onChange={setSelectedAgent}
            style={{ width: 200 }}
            options={[
              { label: t("evaluation.allAgents", "全部 Agent"), value: "" },
              ...agents.map((agent) => ({
                label: agent.name,
                value: agent.id,
              })),
            ]}
            placeholder={t("evaluation.selectAgent", "选择 Agent")}
          />
        </Space>
      </Card>

      {/* Evaluation records table */}
      <Card>
        <Table
          columns={columns}
          dataSource={evaluations}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) =>
              t("evaluation.total", `共 ${total} 条记录`, { total }),
          }}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) =>
              setExpandedRowKeys(keys as string[]),
            expandedRowRender,
          }}
          locale={{
            emptyText: t("evaluation.noEvaluations", "暂无评估记录"),
          }}
        />
      </Card>

      {/* Create evaluation modal */}
      <Modal
        title={t("evaluation.createEvaluation", "新建评估")}
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false);
          createForm.resetFields();
        }}
        onOk={handleCreateEvaluation}
        confirmLoading={createLoading}
        okText={t("common.create", "创建")}
        width={500}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" className="pt-2">
          <Form.Item
            name="agentId"
            label={t("evaluation.agent", "Agent")}
            rules={[{ required: true, message: "请选择 Agent" }]}
          >
            <Select
              placeholder={t("evaluation.selectAgent", "选择 Agent")}
              options={agents.map((a) => ({ label: a.name, value: a.id }))}
            />
          </Form.Item>
          <Form.Item
            name="overallScore"
            label={t("evaluation.overallScore", "综合评分")}
            rules={[{ required: true, message: "请输入评分" }]}
          >
            <InputNumber
              min={0}
              max={10}
              step={0.1}
              style={{ width: "100%" }}
              placeholder="0 - 10"
            />
          </Form.Item>
          <Form.Item name="feedback" label={t("evaluation.feedback", "反馈")}>
            <Input.TextArea
              rows={3}
              placeholder={t(
                "evaluation.feedbackPlaceholder",
                "输入评估反馈（可选）",
              )}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
