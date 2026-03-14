/**
 * 资源管理页面
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Key,
  Plus,
  Search,
  Trash2,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  TrendingUp,
  Coins,
  MessageSquare,
  DollarSign,
  BarChart3,
  Settings,
  X,
  Clock,
} from 'lucide-react';
import type {
  ApiKey,
  ApiKeyStatus,
  ResourceQuota,
  ResourceUsageStats,
  QuotaLimits,
} from '../../services/mock/resources';
import { resourceApi, providerOptions } from '../../services/mock/resources';

type TabType = 'api-keys' | 'quotas' | 'usage';

export default function ResourceManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('api-keys');
  const [loading, setLoading] = useState(true);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keySearchQuery, setKeySearchQuery] = useState('');
  const [keyFilterProvider, setKeyFilterProvider] = useState('');
  const [keyFilterStatus, setKeyFilterStatus] = useState<ApiKeyStatus | ''>('');
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  // Quotas state
  const [quotas, setQuotas] = useState<ResourceQuota[]>([]);
  const [editingQuota, setEditingQuota] = useState<ResourceQuota | null>(null);

  // Usage stats
  const [usageStats, setUsageStats] = useState<ResourceUsageStats | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [keys, quotaList, stats] = await Promise.all([
        resourceApi.getApiKeys({
          provider: keyFilterProvider || undefined,
          status: keyFilterStatus || undefined,
          search: keySearchQuery || undefined,
        }),
        resourceApi.getQuotas(),
        resourceApi.getUsageStats(),
      ]);
      setApiKeys(keys);
      setQuotas(quotaList);
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [keyFilterProvider, keyFilterStatus, keySearchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteKey = async (id: string) => {
    if (!confirm('确定要删除这个 API 密钥吗？此操作不可恢复。')) return;
    try {
      await resourceApi.deleteApiKey(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete key:', error);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('确定要撤销这个 API 密钥吗？撤销后将无法恢复。')) return;
    try {
      await resourceApi.revokeApiKey(id);
      loadData();
    } catch (error) {
      console.error('Failed to revoke key:', error);
    }
  };

  const handleValidateKey = async (id: string) => {
    try {
      const result = await resourceApi.validateApiKey(id);
      alert(result.valid ? '密钥有效' : result.message);
    } catch (error) {
      console.error('Failed to validate key:', error);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  const handleUpdateQuota = async (id: string, limits: Partial<QuotaLimits>) => {
    try {
      await resourceApi.updateQuota(id, limits);
      setEditingQuota(null);
      loadData();
    } catch (error) {
      console.error('Failed to update quota:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusBadge = (status: ApiKeyStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-500">
            <CheckCircle className="w-3 h-3" />
            有效
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-yellow-500/10 text-yellow-500">
            <Clock className="w-3 h-3" />
            已过期
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-500">
            <XCircle className="w-3 h-3" />
            已撤销
          </span>
        );
    }
  };

  const getProviderLabel = (provider: string) => {
    return providerOptions.find((p) => p.value === provider)?.label || provider;
  };

  const getUsagePercentage = (usage: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((usage / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">资源管理</h1>
          <p className="text-[var(--color-text-secondary)]">管理 API 密钥、资源配额和使用统计</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-[var(--color-border)] mb-6">
        <button
          onClick={() => setActiveTab('api-keys')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'api-keys'
              ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
              : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Key className="w-4 h-4" />
          API 密钥
        </button>
        <button
          onClick={() => setActiveTab('quotas')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'quotas'
              ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
              : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Shield className="w-4 h-4" />
          资源配额
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'usage'
              ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
              : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          使用统计
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : (
        <>
          {/* API 密钥管理 */}
          {activeTab === 'api-keys' && (
            <div>
              {/* 筛选和搜索 */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="搜索密钥..."
                    value={keySearchQuery}
                    onChange={(e) => setKeySearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                  />
                </div>
                <select
                  value={keyFilterProvider}
                  onChange={(e) => setKeyFilterProvider(e.target.value)}
                  className="px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                >
                  <option value="">全部 Provider</option>
                  {providerOptions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <select
                  value={keyFilterStatus}
                  onChange={(e) => setKeyFilterStatus(e.target.value as ApiKeyStatus | '')}
                  className="px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
                >
                  <option value="">全部状态</option>
                  <option value="active">有效</option>
                  <option value="expired">已过期</option>
                  <option value="revoked">已撤销</option>
                </select>
                <button
                  onClick={() => setShowCreateKeyModal(true)}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
                >
                  <Plus className="w-4 h-4" />
                  添加密钥
                </button>
              </div>

              {/* 新创建的密钥提示 */}
              {newlyCreatedKey && (
                <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-500">密钥创建成功</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        请复制保存以下密钥，此密钥仅显示一次：
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="flex-1 px-3 py-2 bg-[var(--color-bg-tertiary)] rounded text-xs font-mono text-[var(--color-text-primary)] break-all">
                          {newlyCreatedKey}
                        </code>
                        <button
                          onClick={() => handleCopyKey(newlyCreatedKey)}
                          className="p-2 bg-[var(--color-bg-secondary)] rounded hover:bg-[var(--color-bg-tertiary)]"
                        >
                          <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => setNewlyCreatedKey(null)} className="p-1 hover:bg-green-500/20 rounded">
                      <X className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* 密钥列表 */}
              <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">名称</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">Provider</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">密钥前缀</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">状态</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">使用次数</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">最后使用</th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {apiKeys.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-tertiary)]">
                            <Key className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>暂无 API 密钥</p>
                          </td>
                        </tr>
                      ) : (
                        apiKeys.map((key) => (
                          <tr key={key.id} className="hover:bg-[var(--color-bg-tertiary)]">
                            <td className="px-4 py-3">
                              <div>
                                <span className="font-medium text-[var(--color-text-primary)]">{key.name}</span>
                                {key.description && (
                                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{key.description}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                              {getProviderLabel(key.provider)}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-[var(--color-text-secondary)]">
                              {key.keyPrefix}
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(key.status)}</td>
                            <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                              {formatNumber(key.usageCount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                              {formatDate(key.lastUsedAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleValidateKey(key.id)}
                                  className="p-1.5 hover:bg-[var(--color-bg-base)] rounded"
                                  title="验证密钥"
                                >
                                  <Shield className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                                </button>
                                {key.status === 'active' && (
                                  <button
                                    onClick={() => handleRevokeKey(key.id)}
                                    className="p-1.5 hover:bg-[var(--color-bg-base)] rounded"
                                    title="撤销密钥"
                                  >
                                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteKey(key.id)}
                                  className="p-1.5 hover:bg-[var(--color-bg-base)] rounded"
                                  title="删除密钥"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 资源配额 */}
          {activeTab === 'quotas' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {quotas.map((quota) => {
                const tokenPercentage = getUsagePercentage(quota.usage.tokens, quota.limits.maxTokens);
                const requestPercentage = getUsagePercentage(quota.usage.requests, quota.limits.maxRequests);
                const costPercentage = getUsagePercentage(quota.usage.cost, quota.limits.maxCost);

                return (
                  <div
                    key={quota.id}
                    className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-[var(--color-text-primary)]">{quota.name}</h3>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          {quota.targetType === 'global'
                            ? '全局配额'
                            : `${quota.targetType === 'user' ? '用户' : quota.targetType === 'department' ? '部门' : 'Agent'}: ${quota.targetName}`}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingQuota(quota)}
                        className="p-1.5 hover:bg-[var(--color-bg-tertiary)] rounded"
                      >
                        <Settings className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Tokens */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[var(--color-text-secondary)]">Tokens</span>
                          <span className="text-[var(--color-text-primary)]">
                            {formatNumber(quota.usage.tokens)} / {formatNumber(quota.limits.maxTokens)}
                          </span>
                        </div>
                        <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getUsageColor(tokenPercentage)}`}
                            style={{ width: `${tokenPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Requests */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[var(--color-text-secondary)]">请求数</span>
                          <span className="text-[var(--color-text-primary)]">
                            {formatNumber(quota.usage.requests)} / {formatNumber(quota.limits.maxRequests)}
                          </span>
                        </div>
                        <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getUsageColor(requestPercentage)}`}
                            style={{ width: `${requestPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Cost */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[var(--color-text-secondary)]">费用</span>
                          <span className="text-[var(--color-text-primary)]">
                            {formatCurrency(quota.usage.cost)} / {formatCurrency(quota.limits.maxCost)}
                          </span>
                        </div>
                        <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getUsageColor(costPercentage)}`}
                            style={{ width: `${costPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
                      <span>周期: {quota.period === 'daily' ? '每日' : quota.period === 'weekly' ? '每周' : '每月'}</span>
                      <span>重置: {formatDate(quota.resetAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 使用统计 */}
          {activeTab === 'usage' && usageStats && (
            <div>
              {/* 统计卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Coins className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-tertiary)]">总 Token</p>
                      <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                        {formatNumber(usageStats.totalTokens)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-tertiary)]">总请求</p>
                      <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                        {formatNumber(usageStats.totalRequests)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-tertiary)]">总费用</p>
                      <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                        {formatCurrency(usageStats.totalCost)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-tertiary)]">日均 Token</p>
                      <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                        {formatNumber(usageStats.totalTokens / 30)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provider 分布 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">Token 消耗分布</h3>
                  <div className="space-y-3">
                    {Object.entries(usageStats.tokensByProvider).map(([provider, tokens]) => {
                      const percentage = (tokens / usageStats.totalTokens) * 100;
                      return (
                        <div key={provider}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[var(--color-text-secondary)]">{getProviderLabel(provider)}</span>
                            <span className="text-[var(--color-text-primary)]">
                              {formatNumber(tokens)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-primary)] rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">费用分布</h3>
                  <div className="space-y-3">
                    {Object.entries(usageStats.costByProvider).map(([provider, cost]) => {
                      const percentage = (cost / usageStats.totalCost) * 100;
                      return (
                        <div key={provider}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[var(--color-text-secondary)]">{getProviderLabel(provider)}</span>
                            <span className="text-[var(--color-text-primary)]">
                              {formatCurrency(cost)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 每日使用趋势 */}
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">近 30 天使用趋势</h3>
                <div className="h-48 flex items-end gap-1">
                  {usageStats.dailyUsage.map((day, index) => {
                    const maxTokens = Math.max(...usageStats.dailyUsage.map((d) => d.tokens));
                    const height = (day.tokens / maxTokens) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full bg-[var(--color-primary)] rounded-t transition-all hover:bg-[var(--color-primary-hover)]"
                            style={{ height: `${height}%`, minHeight: '2px' }}
                            title={`${day.date}: ${formatNumber(day.tokens)} tokens`}
                          />
                        </div>
                        {index % 5 === 0 && (
                          <span className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                            {new Date(day.date).getDate()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 创建密钥弹窗 */}
      {showCreateKeyModal && (
        <CreateKeyModal
          onClose={() => setShowCreateKeyModal(false)}
          onSave={async (data) => {
            const result = await resourceApi.createApiKey({
              ...data,
              createdBy: '当前用户',
            });
            setShowCreateKeyModal(false);
            setNewlyCreatedKey(result.fullKey);
            loadData();
          }}
        />
      )}

      {/* 编辑配额弹窗 */}
      {editingQuota && (
        <QuotaEditModal
          quota={editingQuota}
          onClose={() => setEditingQuota(null)}
          onSave={handleUpdateQuota}
        />
      )}
    </div>
  );
}

// 创建密钥弹窗
function CreateKeyModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: {
    name: string;
    provider: string;
    key: string;
    description?: string;
    expiresAt?: Date;
  }) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    key: '',
    description: '',
    hasExpiry: false,
    expiryDate: '',
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: formData.name,
        provider: formData.provider,
        key: formData.key,
        description: formData.description || undefined,
        expiresAt: formData.hasExpiry && formData.expiryDate ? new Date(formData.expiryDate) : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-[var(--color-bg-base)] rounded-lg shadow-xl border border-[var(--color-border)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">添加 API 密钥</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded">
            <X className="w-5 h-5 text-[var(--color-text-tertiary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">密钥名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="如：生产环境密钥"
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Provider</label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            >
              {providerOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              API 密钥
              <span className="text-xs text-[var(--color-text-tertiary)] ml-2">（留空自动生成测试密钥）</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="输入完整的 API 密钥"
                className="w-full px-3 py-2 pr-10 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-[var(--color-bg-tertiary)] rounded"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                ) : (
                  <Eye className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">描述（可选）</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="密钥用途说明"
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={formData.hasExpiry}
                onChange={(e) => setFormData({ ...formData, hasExpiry: e.target.checked })}
                className="rounded border-[var(--color-border)]"
              />
              设置过期时间
            </label>
            {formData.hasExpiry && (
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="mt-2 w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 配额编辑弹窗
function QuotaEditModal({
  quota,
  onClose,
  onSave,
}: {
  quota: ResourceQuota;
  onClose: () => void;
  onSave: (id: string, limits: Partial<QuotaLimits>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    maxTokens: quota.limits.maxTokens,
    maxRequests: quota.limits.maxRequests,
    maxConversations: quota.limits.maxConversations,
    maxCost: quota.limits.maxCost,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(quota.id, formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-[var(--color-bg-base)] rounded-lg shadow-xl border border-[var(--color-border)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">编辑配额 - {quota.name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded">
            <X className="w-5 h-5 text-[var(--color-text-tertiary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">最大 Tokens</label>
            <input
              type="number"
              value={formData.maxTokens}
              onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">最大请求数</label>
            <input
              type="number"
              value={formData.maxRequests}
              onChange={(e) => setFormData({ ...formData, maxRequests: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">最大对话数</label>
            <input
              type="number"
              value={formData.maxConversations}
              onChange={(e) => setFormData({ ...formData, maxConversations: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">最大费用（元）</label>
            <input
              type="number"
              step="0.01"
              value={formData.maxCost}
              onChange={(e) => setFormData({ ...formData, maxCost: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
