/**
 * Agent 评估页面
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Filter,
  RefreshCw,
  Loader2,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Bot,
} from 'lucide-react';
import type { EvaluationMetric, EvaluationRecord, AgentEvaluationSummary } from '../../types/evaluation';
import evaluationApi from '../../services/mock/evaluation';
import { useFrontendPagination } from '../../hooks/usePagination';
import Pagination from '../../components/common/Pagination';

export default function EvaluationPage() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<EvaluationMetric[]>([]);
  const [summaries, setSummaries] = useState<AgentEvaluationSummary[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);

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

  // 分页
  const {
    data: paginatedEvaluations,
    page,
    pageSize,
    total,
    onChange: handlePageChange,
  } = useFrontendPagination(evaluations, 20);

  const formatScore = (score: number): string => score.toFixed(1);

  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {t('evaluation.title', 'Agent 评估')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t('evaluation.subtitle', '评估和追踪 Agent 性能表现')}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
        {summaries.slice(0, 4).map((summary) => (
          <div
            key={summary.agentId}
            className={`p-4 bg-[var(--color-bg-base)] rounded-lg border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)] transition-colors ${
              selectedAgent === summary.agentId ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : ''
            }`}
            onClick={() => setSelectedAgent(selectedAgent === summary.agentId ? '' : summary.agentId)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {summary.agentName}
              </span>
              {getTrendIcon(summary.trend)}
            </div>
            <div className="flex items-center gap-2">
              <Star className={`w-5 h-5 ${getScoreColor(summary.avgScore)}`} />
              <span className={`text-2xl font-bold ${getScoreColor(summary.avgScore)}`}>
                {formatScore(summary.avgScore)}
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)]">/10</span>
            </div>
            <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
              {summary.totalEvaluations} {t('evaluation.evaluations', '次评估')}
            </div>
          </div>
        ))}
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--color-text-tertiary)]" />
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-1.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
          >
            <option value="">{t('evaluation.allAgents', '全部 Agent')}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : (
          <div className="p-4">
            {/* 评估记录表格 */}
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--color-border)]">
                  <tr>
                    <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">
                      {t('evaluation.agent', 'Agent')}
                    </th>
                    <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">
                      {t('evaluation.overallScore', '综合评分')}
                    </th>
                    <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">
                      {t('evaluation.evaluator', '评估者')}
                    </th>
                    <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">
                      {t('evaluation.evaluatedAt', '评估时间')}
                    </th>
                    <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">
                      {t('evaluation.feedback', '反馈')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEvaluations.map((evaluation) => {
                    const agent = agents.find((a) => a.id === evaluation.agentId);
                    return (
                      <EvaluationRow
                        key={evaluation.id}
                        evaluation={evaluation}
                        agentName={agent?.name || 'Unknown'}
                        metrics={metrics}
                        getScoreColor={getScoreColor}
                        formatDate={formatDate}
                      />
                    );
                  })}
                </tbody>
              </table>

              {paginatedEvaluations.length > 0 && (
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={handlePageChange}
                />
              )}

              {evaluations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-tertiary)]">
                  <ClipboardCheck className="w-12 h-12 mb-2 opacity-50" />
                  <p>{t('evaluation.noEvaluations', '暂无评估记录')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 评估记录行组件
function EvaluationRow({
  evaluation,
  agentName,
  metrics,
  getScoreColor,
  formatDate,
}: {
  evaluation: EvaluationRecord;
  agentName: string;
  metrics: EvaluationMetric[];
  getScoreColor: (score: number) => string;
  formatDate: (date: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-tertiary)] cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <span className="font-medium text-[var(--color-text-primary)]">{agentName}</span>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Star className={`w-4 h-4 ${getScoreColor(evaluation.overallScore)}`} />
            <span className={`font-medium ${getScoreColor(evaluation.overallScore)}`}>
              {evaluation.overallScore.toFixed(1)}
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                evaluation.evaluator === 'auto'
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'bg-purple-500/10 text-purple-500'
              }`}
            >
              {evaluation.evaluator === 'auto' ? '自动' : '人工'}
            </span>
            {evaluation.evaluatorName && (
              <span className="text-[var(--color-text-secondary)]">{evaluation.evaluatorName}</span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-xs text-[var(--color-text-tertiary)]">
          {formatDate(evaluation.evaluatedAt)}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            {evaluation.feedback ? (
              <span className="text-sm text-[var(--color-text-secondary)] truncate max-w-xs">
                {evaluation.feedback}
              </span>
            ) : (
              <span className="text-sm text-[var(--color-text-tertiary)]">-</span>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[var(--color-bg-tertiary)]">
          <td colSpan={5} className="py-4 px-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {evaluation.metrics.map((score) => {
                const metric = metrics.find((m) => m.id === score.metricId);
                return (
                  <div key={score.metricId} className="text-center">
                    <div className="text-xs text-[var(--color-text-tertiary)] mb-1">
                      {metric?.name || score.metricId}
                    </div>
                    <div className={`text-lg font-bold ${getScoreColor(score.value)}`}>
                      {score.value.toFixed(1)}
                    </div>
                    {score.reason && (
                      <div className="text-xs text-[var(--color-text-tertiary)] mt-1 truncate" title={score.reason}>
                        {score.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
