/**
 * Provider 管理页面
 */

import { useState, useEffect } from 'react';
import { Input, Button, Tag, message } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  SyncOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import type { Provider, ProviderType } from '../../services/mock/providers';
import { providerApi } from '../../services/mock/providers';

// Provider 类型配置
const providerTypeConfig: Record<ProviderType, { name: string; color: string; icon: string }> = {
  openai: { name: 'OpenAI', color: 'green', icon: '🤖' },
  anthropic: { name: 'Anthropic', color: 'orange', icon: '🧠' },
  zhipu: { name: '智谱 AI', color: 'blue', icon: '🔮' },
  alibaba: { name: '阿里云', color: 'orange', icon: '☁️' },
  baidu: { name: '百度', color: 'blue', icon: '🔵' },
  ollama: { name: 'Ollama (本地)', color: 'purple', icon: '🏠' },
  azure: { name: 'Azure OpenAI', color: 'blue', icon: '☁️' },
  custom: { name: '自定义', color: 'default', icon: '⚙️' },
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
    try {
      await providerApi.delete(id);
      setProviders(providers.filter((p) => p.id !== id));
      if (selectedProvider?.id === id) {
        setSelectedProvider(null);
      }
      message.success('Provider 已删除');
    } catch (error) {
      console.error('Failed to delete provider:', error);
      message.error('删除失败');
    }
  };

  const handleValidateKey = async (id: string) => {
    setValidatingKey(id);
    try {
      const result = await providerApi.validateApiKey(id);
      if (result.valid) {
        message.success(result.message);
      } else {
        message.error(`验证失败: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to validate key:', error);
      message.error('验证失败');
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
      message.success('模型列表已刷新');
    } catch (error) {
      console.error('Failed to refresh models:', error);
      message.error('刷新失败');
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
      message.success(enabled ? '模型已启用' : '模型已禁用');
    } catch (error) {
      console.error('Failed to toggle model:', error);
      message.error('操作失败');
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
            <Button type="primary" icon={<PlusOutlined />} size="small" />
          </div>

          {/* 搜索 */}
          <Input
            placeholder="搜索 Providers..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">加载中...</div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <CloudServerOutlined className="text-3xl mb-2 opacity-50" />
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
                    <div className={`p-1.5 rounded ${
                      providerTypeConfig[provider.type]?.color === 'green' ? 'bg-green-500/10' :
                      providerTypeConfig[provider.type]?.color === 'orange' ? 'bg-orange-500/10' :
                      providerTypeConfig[provider.type]?.color === 'blue' ? 'bg-blue-500/10' :
                      providerTypeConfig[provider.type]?.color === 'purple' ? 'bg-purple-500/10' :
                      'bg-gray-500/10'
                    }`}>
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
                    <Button
                      type="text"
                      size="small"
                      icon={expandedProviders.has(provider.id) ? <CaretDownOutlined /> : <CaretRightOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProvider(provider.id);
                      }}
                    />
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
              <CloudServerOutlined className="text-5xl text-[var(--color-text-tertiary)] mb-4" />
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

  const tabs = [
    { key: 'models', label: '模型列表', icon: ThunderboltOutlined },
    { key: 'usage', label: '使用统计', icon: DollarOutlined },
    { key: 'settings', label: '配置设置', icon: KeyOutlined },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{typeConfig?.icon || '⚙️'}</span>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{provider.name}</h2>
            <Tag color={typeConfig?.color || 'default'}>
              {typeConfig?.name || provider.type}
            </Tag>
          </div>
          <p className="text-[var(--color-text-secondary)] mt-1">
            {provider.status === 'active' ? '运行正常' : provider.status === 'inactive' ? '未激活' : '连接错误'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(provider.id)}
          >
            删除
          </Button>
          <Button type="primary" icon={<EditOutlined />}>
            编辑
          </Button>
        </div>
      </div>

      {/* 元信息 */}
      <div className="grid grid-cols-4 gap-4 px-6 pb-4">
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">状态</span>
          <div className="flex items-center gap-1 mt-1">
            {getStatusIcon(provider.status)}
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
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Icon />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'models' && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">可用模型</h3>
              <Button
                icon={refreshingModels ? <LoadingOutlined /> : <SyncOutlined spin={refreshingModels} />}
                onClick={() => onRefreshModels(provider.id)}
                disabled={refreshingModels}
              >
                刷新模型
              </Button>
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
                  <Button
                    size="small"
                    type={model.enabled ? 'primary' : 'default'}
                    onClick={() => onToggleModel(provider.id, model.id, !model.enabled)}
                    className={model.enabled ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {model.enabled ? '已启用' : '已禁用'}
                  </Button>
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
                  <ThunderboltOutlined />
                  <span className="text-sm">总调用次数</span>
                </div>
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  {provider.usage.totalCalls.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-2">
                  <ClockCircleOutlined />
                  <span className="text-sm">总 Tokens</span>
                </div>
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  {(provider.usage.totalTokens / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-2">
                  <DollarOutlined />
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
                  <Button
                    size="small"
                    icon={validatingKey ? <LoadingOutlined /> : <CheckCircleOutlined />}
                    onClick={() => onValidateKey(provider.id)}
                    disabled={validatingKey}
                  >
                    验证
                  </Button>
                </div>
                {provider.apiKey ? (
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={showApiKey ? provider.apiKey : '••••••••••••••••••••••••'}
                      className="font-mono"
                    />
                    <Button
                      type="text"
                      icon={showApiKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      onClick={() => setShowApiKey(!showApiKey)}
                    />
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        if (provider.apiKey) {
                          navigator.clipboard.writeText(provider.apiKey);
                          message.success('已复制到剪贴板');
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-tertiary)]">未配置 API 密钥</p>
                )}
              </div>

              {/* Base URL */}
              {provider.baseUrl && (
                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Base URL</h4>
                  <Input
                    readOnly
                    value={provider.baseUrl}
                    className="font-mono"
                  />
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

function getStatusIcon(status: Provider['status']) {
  switch (status) {
    case 'active':
      return <CheckCircleOutlined className="text-green-500" />;
    case 'inactive':
      return <CloseCircleOutlined className="text-gray-400" />;
    case 'error':
      return <WarningOutlined className="text-red-500" />;
  }
}
