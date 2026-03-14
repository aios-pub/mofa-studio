/**
 * Provider 管理页面
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Key,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  DollarSign,
  Clock,
  Loader2,
} from 'lucide-react';
import type { Provider, ProviderType } from '../../services/mock/providers';
import { providerApi } from '../../services/mock/providers';

// Provider 类型配置
const providerTypeConfig: Record<ProviderType, { name: string; color: string; icon: string }> = {
  openai: { name: 'OpenAI', color: 'bg-green-500/10 text-green-500', icon: '🤖' },
  anthropic: { name: 'Anthropic', color: 'bg-orange-500/10 text-orange-500', icon: '🧠' },
  zhipu: { name: '智谱 AI', color: 'bg-blue-500/10 text-blue-500', icon: '🔮' },
  alibaba: { name: '阿里云', color: 'bg-orange-500/10 text-orange-500', icon: '☁️' },
  baidu: { name: '百度', color: 'bg-blue-500/10 text-blue-500', icon: '🔵' },
  ollama: { name: 'Ollama (本地)', color: 'bg-purple-500/10 text-purple-500', icon: '🏠' },
  azure: { name: 'Azure OpenAI', color: 'bg-blue-500/10 text-blue-500', icon: '☁️' },
  custom: { name: '自定义', color: 'bg-gray-500/10 text-gray-500', icon: '⚙️' },
};

export default function ProvidersListPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [validatingKey, setValidatingKey] = useState<string | null>(null);
  const [refreshingModels, setRefreshingModels] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await providerApi.getAll();
      setProviders(data);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤 Providers
  const filteredProviders = providers.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const toggleProvider = (id: string) => {
    const newExpanded = new Set(expandedProviders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedProviders(newExpanded);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个 Provider 吗？')) return;
    try {
      await providerApi.delete(id);
      setProviders(providers.filter((p) => p.id !== id));
      if (selectedProvider?.id === id) {
        setSelectedProvider(null);
      }
    } catch (error) {
      console.error('Failed to delete provider:', error);
    }
  };

  const handleValidateKey = async (id: string) => {
    setValidatingKey(id);
    try {
      const result = await providerApi.validateApiKey(id);
      if (result.valid) {
        alert(result.message);
      } else {
        alert(`验证失败: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to validate key:', error);
    } finally {
      setValidatingKey(null);
    }
  };

  const handleRefreshModels = async (id: string) => {
    setRefreshingModels(id);
    try {
      const models = await providerApi.refreshModels(id);
      setProviders(
        providers.map((p) => (p.id === id ? { ...p, models } : p))
      );
      if (selectedProvider?.id === id) {
        setSelectedProvider({ ...selectedProvider, models });
      }
    } catch (error) {
      console.error('Failed to refresh models:', error);
    } finally {
      setRefreshingModels(null);
    }
  };

  const handleToggleModel = async (providerId: string, modelId: string, enabled: boolean) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    const updatedModels = provider.models.map((m) =>
      m.id === modelId ? { ...m, enabled } : m
    );

    try {
      await providerApi.update(providerId, { models: updatedModels });
      setProviders(
        providers.map((p) =>
          p.id === providerId ? { ...p, models: updatedModels } : p
        )
      );
      if (selectedProvider?.id === providerId) {
        setSelectedProvider({ ...selectedProvider, models: updatedModels });
      }
    } catch (error) {
      console.error('Failed to toggle model:', error);
    }
  };

  const getStatusIcon = (status: Provider['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Provider 管理</h2>
            <button className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="搜索 Providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)]"
            />
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">加载中...</div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无 Providers</p>
            </div>
          ) : (
            filteredProviders.map((provider) => (
              <div key={provider.id} className="mb-2">
                <div
                  onClick={() => setSelectedProvider(provider)}
                  className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedProvider?.id === provider.id
                      ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                      : 'hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`p-1.5 rounded ${providerTypeConfig[provider.type]?.color || 'bg-gray-500/10 text-gray-500'}`}>
                      <span className="text-lg">{providerTypeConfig[provider.type]?.icon || '⚙️'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-text-primary)] truncate">
                          {provider.name}
                        </span>
                        {getStatusIcon(provider.status)}
                      </div>
                      <p className="text-sm text-[var(--color-text-tertiary)]">
                        {provider.models.length} 个模型
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {provider.usage.totalCalls} 次调用
                        </span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">•</span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {(provider.usage.totalTokens / 1000).toFixed(0)}K tokens
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProvider(provider.id);
                      }}
                      className="p-1 hover:bg-[var(--color-bg-base)] rounded"
                    >
                      {expandedProviders.has(provider.id) ? (
                        <ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 展开的模型列表 */}
                {expandedProviders.has(provider.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {provider.models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between p-2 bg-[var(--color-bg-tertiary)] rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-text-primary)]">{model.name}</span>
                          {!model.enabled && (
                            <span className="text-xs text-[var(--color-text-tertiary)]">(已禁用)</span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          ${model.pricing.input.toFixed(4)}/1K
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-hidden">
        {selectedProvider ? (
          <ProviderDetail
            provider={selectedProvider}
            onDelete={handleDelete}
            onValidateKey={handleValidateKey}
            onRefreshModels={handleRefreshModels}
            onToggleModel={handleToggleModel}
            validatingKey={validatingKey === selectedProvider.id}
            refreshingModels={refreshingModels === selectedProvider.id}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Server className="w-16 h-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">选择一个 Provider</h3>
              <p className="text-[var(--color-text-secondary)]">从左侧列表中选择查看详情</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Provider 详情组件
function ProviderDetail({
  provider,
  onDelete,
  onValidateKey,
  onRefreshModels,
  onToggleModel,
  validatingKey,
  refreshingModels,
}: {
  provider: Provider;
  onDelete: (id: string) => void;
  onValidateKey: (id: string) => void;
  onRefreshModels: (id: string) => void;
  onToggleModel: (providerId: string, modelId: string, enabled: boolean) => void;
  validatingKey: boolean;
  refreshingModels: boolean;
}) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'models' | 'usage' | 'settings'>('models');

  const typeConfig = providerTypeConfig[provider.type];

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(4)}`;
  };

  // 计算预估费用
  const estimatedCost =
    (provider.usage.totalTokens / 1000) *
    (provider.models[0]?.pricing.input || 0);

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{typeConfig?.icon || '⚙️'}</span>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{provider.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded ${typeConfig?.color || 'bg-gray-500/10 text-gray-500'}`}>
              {typeConfig?.name || provider.type}
            </span>
          </div>
          <p className="text-[var(--color-text-secondary)] mt-1">
            {provider.status === 'active' ? '运行正常' : provider.status === 'inactive' ? '未激活' : '连接错误'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onDelete(provider.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]">
            <Edit2 className="w-4 h-4" />
            编辑
          </button>
        </div>
      </div>

      {/* 元信息 */}
      <div className="grid grid-cols-4 gap-4 px-6 pb-4">
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">状态</span>
          <div className="flex items-center gap-1 mt-1">
            {provider.status === 'active' ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : provider.status === 'inactive' ? (
              <XCircle className="w-4 h-4 text-gray-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-[var(--color-text-primary)]">
              {provider.status === 'active' ? '正常' : provider.status === 'inactive' ? '未激活' : '错误'}
            </span>
          </div>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">模型数</span>
          <p className="text-sm text-[var(--color-text-primary)]">{provider.models.length}</p>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">总调用</span>
          <p className="text-sm text-[var(--color-text-primary)]">{provider.usage.totalCalls}</p>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">预估费用</span>
          <p className="text-sm text-[var(--color-text-primary)]">{formatCurrency(estimatedCost)}</p>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="flex gap-1 px-6 border-b border-[var(--color-border)]">
        {[
          { key: 'models', label: '模型列表', icon: Zap },
          { key: 'usage', label: '使用统计', icon: DollarSign },
          { key: 'settings', label: '配置设置', icon: Key },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'models' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">可用模型</h3>
              <button
                onClick={() => onRefreshModels(provider.id)}
                disabled={refreshingModels}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50"
              >
                {refreshingModels ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                刷新模型
              </button>
            </div>

            <div className="space-y-2">
              {provider.models.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${model.enabled ? 'bg-green-500' : 'bg-gray-400'}`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {model.name}
                        </span>
                        <code className="text-xs px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-tertiary)]">
                          {model.id}
                        </code>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-tertiary)]">
                        <span>最大 {model.maxTokens.toLocaleString()} tokens</span>
                        <span>•</span>
                        <span>
                          输入: {formatCurrency(model.pricing.input)}/1K
                        </span>
                        <span>•</span>
                        <span>
                          输出: {formatCurrency(model.pricing.output)}/1K
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleModel(provider.id, model.id, !model.enabled)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      model.enabled
                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                        : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
                    }`}
                  >
                    {model.enabled ? '已启用' : '已禁用'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">总调用次数</span>
                </div>
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  {provider.usage.totalCalls.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">总 Tokens</span>
                </div>
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  {(provider.usage.totalTokens / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">预估费用</span>
                </div>
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  {formatCurrency(estimatedCost)}
                </p>
              </div>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">使用历史</h4>
              <div className="text-center text-[var(--color-text-tertiary)] py-8">
                <p>使用历史图表开发中...</p>
                <p className="text-xs mt-1">将显示调用趋势和 Token 消耗</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">最后使用时间</span>
                <span className="text-sm text-[var(--color-text-primary)]">
                  {formatDate(provider.usage.lastUsed)}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="space-y-4">
              {/* API Key */}
              <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)]">API 密钥</h4>
                  <button
                    onClick={() => onValidateKey(provider.id)}
                    disabled={validatingKey}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-base)] disabled:opacity-50"
                  >
                    {validatingKey ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    验证
                  </button>
                </div>
                {provider.apiKey ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-[var(--color-bg-tertiary)] rounded font-mono text-sm">
                      {showApiKey ? provider.apiKey : '••••••••••••••••••••••••'}
                    </div>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      ) : (
                        <Eye className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      )}
                    </button>
                    <button className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded">
                      <Copy className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-tertiary)]">未配置 API 密钥</p>
                )}
              </div>

              {/* Base URL */}
              {provider.baseUrl && (
                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Base URL</h4>
                  <div className="px-3 py-2 bg-[var(--color-bg-tertiary)] rounded font-mono text-sm">
                    {provider.baseUrl}
                  </div>
                </div>
              )}

              {/* Provider 类型 */}
              <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
                <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Provider 类型</h4>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{typeConfig?.icon}</span>
                  <span className="text-sm text-[var(--color-text-primary)]">{typeConfig?.name}</span>
                </div>
              </div>

              {/* 创建/更新时间 */}
              <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
                <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">时间信息</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-tertiary)]">创建时间</span>
                    <span className="text-[var(--color-text-primary)]">{formatDate(provider.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-tertiary)]">更新时间</span>
                    <span className="text-[var(--color-text-primary)]">{formatDate(provider.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
