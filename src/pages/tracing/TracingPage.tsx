/**
 * Tracing 追踪页面
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Activity,
  Loader2,
  X,
} from 'lucide-react';
import type { Trace, Span, TracingStats } from '../../types/tracing';
import tracingApi from '../../services/mock/tracing';
import { useFrontendPagination } from '../../hooks/usePagination';
import Pagination from '../../components/common/Pagination';

export default function TracingPage() {
  const { t } = useTranslation();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [stats, setStats] = useState<TracingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());

  // 过滤条件
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadTraces = useCallback(async () => {
    setLoading(true);
    try {
      const [tracesResult, statsResult] = await Promise.all([
        tracingApi.getTraces({
          status: statusFilter as any || undefined,
        }),
        tracingApi.getTracingStats(),
      ]);
      setTraces(tracesResult.data);
      setStats(statsResult);
    } catch (error) {
      console.error('Failed to load traces:', error);
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
      trace.traceId.toLowerCase().includes(query) ||
      trace.operationName.toLowerCase().includes(query) ||
      trace.serviceName.toLowerCase().includes(query)
    );
  });

  // 分页
  const {
    data: paginatedTraces,
    page,
    pageSize,
    total,
    onChange: handlePageChange,
  } = useFrontendPagination(filteredTraces, 20);

  const toggleSpan = (spanId: string) => {
    const newExpanded = new Set(expandedSpans);
    if (newExpanded.has(spanId)) {
      newExpanded.delete(spanId);
    } else {
      newExpanded.add(spanId);
    }
    setExpandedSpans(newExpanded);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 渲染 Span 树
  const renderSpanTree = (spans: Span[], parentSpanId?: string, depth: number = 0): React.ReactElement[] => {
    return spans
      .filter((span) => span.parentSpanId === parentSpanId)
      .map((span) => {
        const hasChildren = spans.some((s) => s.parentSpanId === span.spanId);
        const isExpanded = expandedSpans.has(span.spanId);

        return (
          <div key={span.spanId}>
            <div
              className={`flex items-center gap-2 py-2 px-3 hover:bg-[var(--color-bg-tertiary)] cursor-pointer ${
                depth > 0 ? 'ml-6' : ''
              }`}
              onClick={() => hasChildren && toggleSpan(span.spanId)}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                )
              ) : (
                <span className="w-4" />
              )}

              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {span.name}
              </span>

              <span
                className={`ml-auto text-xs px-2 py-0.5 rounded ${
                  span.status === 'OK'
                    ? 'bg-green-500/10 text-green-500'
                    : span.status === 'ERROR'
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-gray-500/10 text-gray-500'
                }`}
              >
                {span.status}
              </span>

              <span className="text-xs text-[var(--color-text-tertiary)]">
                {formatDuration(span.duration)}
              </span>
            </div>

            {hasChildren && isExpanded && renderSpanTree(spans, span.spanId, depth + 1)}
          </div>
        );
      });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            {t('tracing.title', '追踪分析')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t('tracing.subtitle', 'OpenTelemetry 分布式追踪')}
          </p>
        </div>
        <button
          onClick={loadTraces}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          <div className="p-4 bg-[var(--color-bg-base)] rounded-lg">
            <div className="text-sm text-[var(--color-text-secondary)]">{t('tracing.totalTraces', '总追踪数')}</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.totalTraces}</div>
          </div>
          <div className="p-4 bg-[var(--color-bg-base)] rounded-lg">
            <div className="text-sm text-[var(--color-text-secondary)]">{t('tracing.errorRate', '错误率')}</div>
            <div className="text-2xl font-bold text-red-500">{stats.errorRate.toFixed(1)}%</div>
          </div>
          <div className="p-4 bg-[var(--color-bg-base)] rounded-lg">
            <div className="text-sm text-[var(--color-text-secondary)]">{t('tracing.avgDuration', '平均耗时')}</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">{formatDuration(stats.avgDuration)}</div>
          </div>
          <div className="p-4 bg-[var(--color-bg-base)] rounded-lg">
            <div className="text-sm text-[var(--color-text-secondary)]">{t('tracing.p95Duration', 'P95 耗时')}</div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">{formatDuration(stats.p95Duration)}</div>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder={t('tracing.searchPlaceholder', '搜索 Trace ID、操作名...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
        >
          <option value="">{t('tracing.allStatus', '全部状态')}</option>
          <option value="OK">{t('tracing.statusOK', '成功')}</option>
          <option value="ERROR">{t('tracing.statusError', '错误')}</option>
        </select>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 追踪列表 */}
        <div className={`flex-1 overflow-y-auto ${selectedTrace ? 'border-r border-[var(--color-border)]' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">
                    {t('tracing.operation', '操作')}
                  </th>
                  <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">
                    {t('tracing.service', '服务')}
                  </th>
                  <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">
                    {t('common.status', '状态')}
                  </th>
                  <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">
                    {t('tracing.duration', '耗时')}
                  </th>
                  <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">
                    {t('tracing.startTime', '开始时间')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTraces.map((trace) => (
                  <tr
                    key={trace.traceId}
                    onClick={() => setSelectedTrace(trace)}
                    className={`border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-secondary)] cursor-pointer ${
                      selectedTrace?.traceId === trace.traceId ? 'bg-[var(--color-primary)]/5' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {trace.hasError ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {trace.operationName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">{trace.serviceName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          trace.hasError
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-green-500/10 text-green-500'
                        }`}
                      >
                        {trace.hasError ? 'ERROR' : 'OK'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                      {formatDuration(trace.totalDuration)}
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--color-text-tertiary)]">
                      {formatTime(trace.startTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && filteredTraces.length > 0 && (
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={handlePageChange}
            />
          )}

          {!loading && filteredTraces.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-tertiary)]">
              <Activity className="w-12 h-12 mb-2 opacity-50" />
              <p>{t('tracing.noTraces', '暂无追踪数据')}</p>
            </div>
          )}
        </div>

        {/* 追踪详情 */}
        {selectedTrace && (
          <div className="w-96 flex flex-col bg-[var(--color-bg-secondary)]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h3 className="font-medium text-[var(--color-text-primary)]">
                {t('tracing.traceDetails', '追踪详情')}
              </h3>
              <button
                onClick={() => setSelectedTrace(null)}
                className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded"
              >
                <X className="w-4 h-4 text-[var(--color-text-tertiary)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* 基本信息 */}
              <div className="p-4 border-b border-[var(--color-border)]">
                <div className="text-xs text-[var(--color-text-tertiary)] mb-1">{t('tracing.traceId', 'Trace ID')}</div>
                <div className="text-sm font-mono text-[var(--color-text-primary)] break-all">
                  {selectedTrace.traceId}
                </div>
              </div>

              <div className="p-4 border-b border-[var(--color-border)]">
                <div className="text-xs text-[var(--color-text-tertiary)] mb-1">{t('tracing.operation', '操作')}</div>
                <div className="text-sm text-[var(--color-text-primary)]">{selectedTrace.operationName}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 border-b border-[var(--color-border)]">
                <div>
                  <div className="text-xs text-[var(--color-text-tertiary)] mb-1">{t('tracing.spans', 'Span 数量')}</div>
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">
                    {selectedTrace.spanCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-tertiary)] mb-1">{t('tracing.duration', '总耗时')}</div>
                  <div className="text-sm font-medium text-[var(--color-text-primary)]">
                    {formatDuration(selectedTrace.totalDuration)}
                  </div>
                </div>
              </div>

              {/* Span 树 */}
              <div className="p-4">
                <div className="text-xs text-[var(--color-text-tertiary)] mb-2">{t('tracing.spanTree', 'Span 树')}</div>
                <div className="border border-[var(--color-border)] rounded-lg">
                  {renderSpanTree(selectedTrace.spans)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
