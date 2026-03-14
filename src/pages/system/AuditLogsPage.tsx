/**
 * 审计日志页面
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  ChevronDown,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { AuditLog, AuditAction } from '../../services/mock/auditLogs';
import { auditLogApi } from '../../services/mock/auditLogs';

const actionLabels: Record<AuditAction, string> = {
  login: '登录',
  logout: '退出',
  create: '创建',
  update: '更新',
  delete: '删除',
  view: '查看',
  export: '导出',
  import: '导入',
  execute: '执行',
  config_change: '配置变更',
};

const actionColors: Record<AuditAction, string> = {
  login: 'bg-green-500/10 text-green-500',
  logout: 'bg-gray-500/10 text-gray-500',
  create: 'bg-blue-500/10 text-blue-500',
  update: 'bg-yellow-500/10 text-yellow-500',
  delete: 'bg-red-500/10 text-red-500',
  view: 'bg-purple-500/10 text-purple-500',
  export: 'bg-cyan-500/10 text-cyan-500',
  import: 'bg-indigo-500/10 text-indigo-500',
  execute: 'bg-orange-500/10 text-orange-500',
  config_change: 'bg-pink-500/10 text-pink-500',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    success: number;
    failure: number;
  } | null>(null);

  // 筛选状态
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterResource, setFilterResource] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // 选项数据
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [actionTypes, setActionTypes] = useState<AuditAction[]>([]);

  const loadOptions = useCallback(async () => {
    const [resources, actions] = await Promise.all([
      auditLogApi.getResourceTypes(),
      auditLogApi.getActionTypes(),
    ]);
    setResourceTypes(resources);
    setActionTypes(actions);
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        auditLogApi.getLogs({
          action: filterAction as AuditAction || undefined,
          resource: filterResource || undefined,
          status: filterStatus as 'success' | 'failure' || undefined,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
          search: searchQuery || undefined,
        }),
        auditLogApi.getStats({
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
        }),
      ]);
      setLogs(logsData);
      setStats({
        total: statsData.total,
        success: statsData.success,
        failure: statsData.failure,
      });
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterResource, filterStatus, dateRange, searchQuery]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExport = async (format: 'csv' | 'json') => {
    const data = await auditLogApi.exportLogs(format, {
      action: filterAction as AuditAction || undefined,
      resource: filterResource || undefined,
      status: filterStatus as 'success' | 'failure' || undefined,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
      search: searchQuery || undefined,
    });

    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterAction('');
    setFilterResource('');
    setFilterStatus('');
    setDateRange({ start: '', end: '' });
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">审计日志</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">查看系统操作记录和审计追踪</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg ${
              showFilters
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]'
            }`}
          >
            <Filter className="w-4 h-4" />
            筛选
          </button>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <div className="relative group">
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">
              <Download className="w-4 h-4" />
              导出
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 mt-1 w-32 py-1 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-[var(--color-bg-tertiary)]"
              >
                导出 CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-[var(--color-bg-tertiary)]"
              >
                导出 JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-base)] rounded-lg">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)]">总记录数</p>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">{stats.total}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-base)] rounded-lg">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)]">成功操作</p>
              <p className="text-lg font-semibold text-green-500">{stats.success}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-base)] rounded-lg">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)]">失败操作</p>
              <p className="text-lg font-semibold text-red-500">{stats.failure}</p>
            </div>
          </div>
        </div>
      )}

      {/* 筛选器 */}
      {showFilters && (
        <div className="p-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* 搜索 */}
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                placeholder="搜索用户、资源、详情..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
              />
            </div>

            {/* 操作类型 */}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            >
              <option value="">全部操作</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {actionLabels[action]}
                </option>
              ))}
            </select>

            {/* 资源类型 */}
            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            >
              <option value="">全部资源</option>
              {resourceTypes.map((resource) => (
                <option key={resource} value={resource}>
                  {resource}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {/* 状态 */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            >
              <option value="">全部状态</option>
              <option value="success">成功</option>
              <option value="failure">失败</option>
            </select>

            {/* 开始日期 */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
              />
            </div>

            {/* 结束日期 */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
              />
            </div>

            {/* 重置 */}
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-base)]"
            >
              重置筛选
            </button>
          </div>
        </div>
      )}

      {/* 日志列表 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* 左侧列表 */}
          <div className={`${selectedLog ? 'w-1/2' : 'w-full'} overflow-y-auto border-r border-[var(--color-border)]`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-tertiary)]">
                <FileText className="w-12 h-12 mb-2 opacity-50" />
                <p>暂无审计日志</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">时间</th>
                    <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">用户</th>
                    <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">操作</th>
                    <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">资源</th>
                    <th className="py-3 px-4 text-left text-[var(--color-text-tertiary)] font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`border-b border-[var(--color-border)]/50 cursor-pointer transition-colors ${
                        selectedLog?.id === log.id
                          ? 'bg-[var(--color-primary)]/10'
                          : 'hover:bg-[var(--color-bg-secondary)]'
                      }`}
                    >
                      <td className="py-3 px-4 text-[var(--color-text-tertiary)] whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-[var(--color-primary)]">
                              {log.userName.charAt(0)}
                            </span>
                          </div>
                          <span className="text-[var(--color-text-primary)]">{log.userName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded ${actionColors[log.action]}`}>
                          {actionLabels[log.action]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="text-[var(--color-text-primary)]">{log.resource}</span>
                          {log.resourceName && (
                            <span className="text-[var(--color-text-tertiary)] ml-1">
                              / {log.resourceName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {log.status === 'success' ? (
                          <span className="flex items-center gap-1 text-green-500">
                            <CheckCircle className="w-4 h-4" />
                            成功
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500">
                            <XCircle className="w-4 h-4" />
                            失败
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 右侧详情 */}
          {selectedLog && (
            <div className="w-1/2 overflow-y-auto p-6 bg-[var(--color-bg-secondary)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">日志详情</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                >
                  关闭
                </button>
              </div>

              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="bg-[var(--color-bg-base)] rounded-lg border border-[var(--color-border)] p-4">
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">基本信息</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-tertiary)]">时间</span>
                      <span className="text-sm text-[var(--color-text-primary)]">
                        {formatDateTime(selectedLog.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-tertiary)]">用户</span>
                      <span className="text-sm text-[var(--color-text-primary)]">{selectedLog.userName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-tertiary)]">操作</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${actionColors[selectedLog.action]}`}>
                        {actionLabels[selectedLog.action]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-tertiary)]">状态</span>
                      {selectedLog.status === 'success' ? (
                        <span className="flex items-center gap-1 text-green-500 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          成功
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 text-sm">
                          <XCircle className="w-4 h-4" />
                          失败
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 资源信息 */}
                <div className="bg-[var(--color-bg-base)] rounded-lg border border-[var(--color-border)] p-4">
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">资源信息</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-tertiary)]">资源类型</span>
                      <span className="text-sm text-[var(--color-text-primary)]">{selectedLog.resource}</span>
                    </div>
                    {selectedLog.resourceName && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-tertiary)]">资源名称</span>
                        <span className="text-sm text-[var(--color-text-primary)]">
                          {selectedLog.resourceName}
                        </span>
                      </div>
                    )}
                    {selectedLog.resourceId && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text-tertiary)]">资源ID</span>
                        <code className="text-xs px-2 py-0.5 bg-[var(--color-bg-tertiary)] rounded">
                          {selectedLog.resourceId}
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                {/* 详情 */}
                <div className="bg-[var(--color-bg-base)] rounded-lg border border-[var(--color-border)] p-4">
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">操作详情</h4>
                  <p className="text-sm text-[var(--color-text-secondary)]">{selectedLog.details}</p>
                </div>

                {/* 客户端信息 */}
                <div className="bg-[var(--color-bg-base)] rounded-lg border border-[var(--color-border)] p-4">
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">客户端信息</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-tertiary)]">IP 地址</span>
                      <code className="text-xs px-2 py-0.5 bg-[var(--color-bg-tertiary)] rounded">
                        {selectedLog.ipAddress}
                      </code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-tertiary)]">User Agent</span>
                      <span className="text-sm text-[var(--color-text-primary)]">{selectedLog.userAgent}</span>
                    </div>
                    {selectedLog.metadata && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--color-text-tertiary)]">浏览器</span>
                          <span className="text-sm text-[var(--color-text-primary)]">
                            {selectedLog.metadata.browser as string}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--color-text-tertiary)]">操作系统</span>
                          <span className="text-sm text-[var(--color-text-primary)]">
                            {selectedLog.metadata.os as string}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
