/**
 * Octos Provider QoS metrics
 * Show provider QoS data such as latency, success rate and error rate
 */

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Statistic,
  Row,
  Col,
  Card,
  Typography,
  Spin,
  Alert,
  Progress,
  Space,
} from "antd";
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import type { OctosSharedMetrics, OctosSharedProviderMetrics } from "@/types/octos";
import { OctosApiClient } from "@/services/real/octos";

const { Text } = Typography;

interface Props {
  profileId: string;
  apiClient: OctosApiClient | any;
}

export default function OctosMetricsTab({ profileId, apiClient }: Props) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<OctosSharedMetrics | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProfileMetrics(profileId);
      setMetrics(data);
    } catch (e: any) {
      console.error("加载指标失败:", e);
    } finally {
      setLoading(false);
    }
  }, [apiClient, profileId]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spin description="加载中..." />
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert
        type="info"
        showIcon
        title="暂无指标数据"
        description="Profile 可能尚未运行，或未启用 QoS 指标收集。"
      />
    );
  }

  // Compute summary data
  const totalRequests = metrics.providers.reduce(
    (sum, p) => sum + p.success_count + p.failure_count,
    0
  );
  const totalErrors = metrics.providers.reduce(
    (sum, p) => sum + p.failure_count,
    0
  );
  const avgSuccessRate = metrics.providers.length > 0
    ? metrics.providers.reduce((sum, p) => sum + (1 - p.error_rate), 0) / metrics.providers.length
    : 0;

  const columns = [
    {
      title: "Provider",
      dataIndex: "provider",
      key: "provider",
      width: 120,
      render: (provider: string) => <Text strong>{provider}</Text>,
    },
    {
      title: "Model",
      dataIndex: "model",
      key: "model",
      width: 180,
    },
    {
      title: "分数",
      dataIndex: "score",
      key: "score",
      width: 80,
      render: (score: number) => (
        <Text
          style={{
            color: score >= 90 ? "#52c41a" : score >= 70 ? "#faad14" : "#ff4d4f",
          }}
        >
          {score}
        </Text>
      ),
    },
    {
      title: "延迟",
      key: "latency",
      width: 120,
      render: (_: unknown, r: OctosSharedProviderMetrics) => (
        <Space orientation="vertical" size={0}>
          <Text type="secondary" className="text-xs">
            EMA: {r.latency_ema_ms}ms
          </Text>
          <Text type="secondary" className="text-xs">
            P95: {r.p95_latency_ms}ms
          </Text>
        </Space>
      ),
    },
    {
      title: "成功率",
      dataIndex: ["error_rate"],
      key: "success_rate",
      width: 120,
      render: (errorRate: number) => {
        const successRate = (1 - errorRate) * 100;
        return (
          <Progress
            percent={successRate}
            size="small"
            status={successRate >= 95 ? "success" : successRate >= 80 ? "normal" : "exception"}
            format={(percent) => `${percent?.toFixed(1)}%`}
          />
        );
      },
    },
    {
      title: "请求 / 错误",
      key: "counts",
      width: 100,
      render: (_: unknown, r: OctosSharedProviderMetrics) => (
        <Space orientation="vertical" size={0}>
          <Text className="text-xs">
            <CheckCircleOutlined className="text-green-500 mr-1" />
            {r.success_count}
          </Text>
          <Text className="text-xs">
            <CloseCircleOutlined className="text-red-500 mr-1" />
            {r.failure_count}
          </Text>
        </Space>
      ),
    },
    {
      title: "连续失败",
      dataIndex: "consecutive_failures",
      key: "consecutive_failures",
      width: 80,
      render: (count: number) => (
        <Text
          style={{
            color: count === 0 ? undefined : "#ff4d4f",
          }}
        >
          {count}
        </Text>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary statistics */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总请求数"
              value={totalRequests}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总错误数"
              value={totalErrors}
              prefix={<CloseCircleOutlined />}
              styles={{ content: { color: totalErrors > 0 ? "#ff4d4f" : undefined } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均成功率"
              value={avgSuccessRate * 100}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              styles={{
                content: {
                  color: avgSuccessRate >= 0.95 ? "#52c41a" : avgSuccessRate >= 0.8 ? "#faad14" : "#ff4d4f",
                },
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="更新时间"
              value={new Date(metrics.updated_at).toLocaleTimeString()}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Provider metrics table */}
      <Table
        columns={columns}
        dataSource={metrics.providers}
        rowKey={(r) => `${r.provider}/${r.model}`}
        pagination={false}
        size="small"
      />

      <Text type="secondary" className="text-xs">
        数据每 30 秒自动刷新
      </Text>
    </div>
  );
}
