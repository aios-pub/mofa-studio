/**
 * Agent 评估页面
 * 使用 Ant Design 组件重构
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
} from 'antd';
import {
  StarOutlined,
  RobotOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { EvaluationMetric, EvaluationRecord, AgentEvaluationSummary } from '../../types/evaluation';
import { evaluationApi } from '@/services';

const { Title, Text } = Typography;

export default function EvaluationPage() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<EvaluationMetric[]>([]);
  const [summaries, setSummaries] = useState<AgentEvaluationSummary[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsData, summariesData, evalsData, agentsData] = await Promise.all([
        evaluationApi.getEvaluationMetrics(),
        evaluationApi.getAllAgentSummaries(),
        evaluationApi.getAgentEvaluations({ agentId: selectedAgent || undefined }),
        evaluationApi.getAgents(),
      ]);
      setMetrics(metricsData);
      setSummaries(summariesData);
      setEvaluations(evalsData.data);
      setAgents(agentsData);
    } catch (error) {
      console.error('Failed to load evaluation data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 格式化日期
  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取趋势图标
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <RiseOutlined className="text-green-500" />;
      case 'down':
        return <FallOutlined className="text-red-500" />;
      default:
        return <MinusOutlined className="text-gray-400" />;
    }
  };

  // 获取评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 8) return '#22c55e';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
  };

  // 表格列配置
  const columns: ColumnsType<EvaluationRecord> = [
    {
      title: t('evaluation.agent', 'Agent'),
      dataIndex: 'agentId',
      key: 'agentId',
      width: 200,
      render: (agentId: string) => {
        const agent = agents.find((a) => a.id === agentId);
        return (
          <Space>
            <RobotOutlined className="text-[var(--color-primary)]" />
            <Text strong>{agent?.name || 'Unknown'}</Text>
          </Space>
        );
      },
    },
    {
      title: t('evaluation.overallScore', '综合评分'),
      dataIndex: 'overallScore',
      key: 'overallScore',
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
      title: t('evaluation.evaluator', '评估者'),
      dataIndex: 'evaluator',
      key: 'evaluator',
      width: 150,
      render: (evaluator: string, record: EvaluationRecord) => (
        <Space direction="vertical" size={0}>
          <Tag color={evaluator === 'auto' ? 'blue' : 'purple'}>
            {evaluator === 'auto' ? t('evaluation.auto', '自动') : t('evaluation.manual', '人工')}
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
      title: t('evaluation.evaluatedAt', '评估时间'),
      dataIndex: 'evaluatedAt',
      key: 'evaluatedAt',
      width: 180,
      sorter: (a, b) => new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime(),
      render: (date: string) => (
        <Text type="secondary">{formatDate(date)}</Text>
      ),
    },
    {
      title: t('evaluation.feedback', '反馈'),
      dataIndex: 'feedback',
      key: 'feedback',
      ellipsis: true,
      render: (feedback?: string) => (
        feedback ? (
          <Tooltip title={feedback}>
            <Text className="max-w-[200px] truncate">{feedback}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
  ];

  // 展开行渲染
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
                    valueStyle={{ color: getScoreColor(score.value), fontSize: '24px' }}
                    prefix={<StarOutlined />}
                  />
                  {score.reason && (
                    <Text type="secondary" className="text-xs mt-2 block truncate" title={score.reason}>
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
      {/* 页面头部 */}
      <Card>
        <div className="flex items-center justify-between">
          <Space>
            <TrophyOutlined className="text-2xl text-[var(--color-primary)]" />
            <div>
              <Title level={4} className="!mb-0">
                {t('evaluation.title', 'Agent 评估')}
              </Title>
              <Text type="secondary">
                {t('evaluation.subtitle', '评估和追踪 Agent 性能表现')}
              </Text>
            </div>
          </Space>
          <Button
            type="primary"
            icon={<ReloadOutlined spin={loading} />}
            onClick={loadData}
            loading={loading}
          >
            {t('common.refresh', '刷新')}
          </Button>
        </div>
      </Card>

      {/* Agent 概览卡片 */}
      <Row gutter={[16, 16]}>
        {summaries.slice(0, 4).map((summary) => (
          <Col key={summary.agentId} xs={24} sm={12} md={6}>
            <Card
              hoverable
              className={`cursor-pointer transition-all ${
                selectedAgent === summary.agentId
                  ? 'ring-2 ring-[var(--color-primary)] border-[var(--color-primary)]'
                  : ''
              }`}
              onClick={() => setSelectedAgent(selectedAgent === summary.agentId ? '' : summary.agentId)}
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
                valueStyle={{
                  color: getScoreColor(summary.avgScore),
                  fontSize: '28px',
                }}
                prefix={<StarOutlined />}
              />
              <Text type="secondary" className="text-xs mt-2">
                {summary.totalEvaluations} {t('evaluation.evaluations', '次评估')}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 筛选工具栏 */}
      <Card size="small">
        <Space>
          <FilterOutlined className="text-[var(--color-text-tertiary)]" />
          <Select
            value={selectedAgent}
            onChange={setSelectedAgent}
            style={{ width: 200 }}
            options={[
              { label: t('evaluation.allAgents', '全部 Agent'), value: '' },
              ...agents.map((agent) => ({
                label: agent.name,
                value: agent.id,
              })),
            ]}
            placeholder={t('evaluation.selectAgent', '选择 Agent')}
          />
        </Space>
      </Card>

      {/* 评估记录表格 */}
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
            showTotal: (total) => t('evaluation.total', `共 ${total} 条记录`, { total }),
          }}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
            expandedRowRender,
          }}
          locale={{
            emptyText: t('evaluation.noEvaluations', '暂无评估记录'),
          }}
        />
      </Card>
    </div>
  );
}
