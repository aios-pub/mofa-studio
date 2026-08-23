/**
 * Resource management page
 * Rebuilt with Ant Design components
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Table,
  Tabs,
  Select,
  Button,
  Tag,
  Space,
  Input,
  Modal,
  Form,
  InputNumber,
  Progress,
  Statistic,
  Row,
  Col,
  Typography,
  Tooltip,
  Popconfirm,
  App,
  Alert,
  DatePicker,
  Switch,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
  KeyOutlined,
  BarChartOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  DollarOutlined,
  MessageOutlined,
  RiseOutlined,
  DollarCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { PageHeader } from "@/components/common";
import type {
  ApiKey,
  ApiKeyStatus,
  ResourceQuota,
  ResourceUsageStats,
  QuotaLimits,
} from "@/services";
import { resourceApi, providerApi } from "@/services";
import type { Provider } from "@/services/real/providers";
import { formatDate } from "@/utils";

const { Text } = Typography;

// Convert the full key to masked display
const maskApiKey = (fullKey?: string): string => {
  if (!fullKey) return "sk-***";
  if (fullKey.length <= 8) return `${fullKey}...`;
  return `${fullKey.slice(0, 8)}...${fullKey.slice(-4)}`;
};

const statusConfig: Record<
  ApiKeyStatus,
  { color: string; label: string; icon: React.ReactNode }
> = {
  active: { color: "success", label: "有效", icon: <CheckCircleOutlined /> },
  expired: {
    color: "warning",
    label: "已过期",
    icon: <ExclamationCircleOutlined />,
  },
  revoked: { color: "error", label: "已撤销", icon: <CloseCircleOutlined /> },
};

export default function ResourceManagementPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState("api-keys");
  const [loading, setLoading] = useState(true);

  // Providers state
  const [providers, setProviders] = useState<Provider[]>([]);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keySearchQuery, setKeySearchQuery] = useState("");
  const [keyFilterProvider, setKeyFilterProvider] = useState<string>("");
  const [keyFilterStatus, setKeyFilterStatus] = useState<ApiKeyStatus | "">("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [editingKeyProvider, setEditingKeyProvider] = useState<ApiKey | null>(
    null,
  );

  // Quotas state
  const [quotas, setQuotas] = useState<ResourceQuota[]>([]);
  const [editingQuota, setEditingQuota] = useState<ResourceQuota | null>(null);
  const [createQuotaModalOpen, setCreateQuotaModalOpen] = useState(false);

  // Usage stats
  const [usageStats, setUsageStats] = useState<ResourceUsageStats | null>(null);

  const loadProviders = useCallback(async () => {
    try {
      const list = await providerApi.getAll();
      setProviders(list);
    } catch (error) {
      console.error("Failed to load providers:", error);
    }
  }, []);

  const loadApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const keys = await resourceApi.getApiKeys({
        provider: keyFilterProvider || undefined,
        status: keyFilterStatus || undefined,
        search: keySearchQuery || undefined,
      });
      setApiKeys(keys);
    } catch (error) {
      console.error("Failed to load api keys:", error);
    } finally {
      setLoading(false);
    }
  }, [keyFilterProvider, keyFilterStatus, keySearchQuery]);

  const loadQuotas = useCallback(async () => {
    setLoading(true);
    try {
      const quotaList = await resourceApi.getQuotas();
      setQuotas(quotaList);
    } catch (error) {
      console.error("Failed to load quotas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsageStats = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await resourceApi.getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error("Failed to load usage stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDataByTab = useCallback(
    (tab: string) => {
      if (tab === "api-keys") loadApiKeys();
      else if (tab === "quotas") loadQuotas();
      else if (tab === "usage") loadUsageStats();
    },
    [loadApiKeys, loadQuotas, loadUsageStats],
  );

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    loadDataByTab(key);
  };

  // Initial load: providers + current tab data
  useEffect(() => {
    loadProviders();
    loadDataByTab(activeTab);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteKey = async (id: string) => {
    try {
      await resourceApi.deleteApiKey(id);
      message.success("密钥已删除");
      loadApiKeys();
    } catch (error) {
      console.error("Failed to delete key:", error);
      message.error("删除失败");
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await resourceApi.revokeApiKey(id);
      message.success("密钥已撤销");
      loadApiKeys();
    } catch (error) {
      console.error("Failed to revoke key:", error);
      message.error("撤销失败");
    }
  };

  const handleValidateKey = async (id: string) => {
    try {
      const result = await resourceApi.validateApiKey(id);
      if (result.valid) {
        message.success("密钥有效");
      } else {
        message.warning(result.message);
      }
    } catch (error) {
      console.error("Failed to validate key:", error);
      message.error("验证失败");
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    message.success("已复制到剪贴板");
  };

  const handleEditProvider = (key: ApiKey) => {
    setEditingKeyProvider(key);
  };

  const handleUpdateProvider = async (id: string, providerId: string) => {
    try {
      await resourceApi.updateApiKey(id, { provider_id: providerId });
      message.success("Provider 已更新");
      setEditingKeyProvider(null);
      loadApiKeys();
    } catch (error) {
      console.error("Failed to update provider:", error);
      message.error("更新失败");
    }
  };

  const handleUpdateQuota = async (
    id: string,
    limits: Partial<QuotaLimits>,
  ) => {
    try {
      await resourceApi.updateQuota(id, { limits });
      setEditingQuota(null);
      message.success("配额已更新");
      loadQuotas();
    } catch (error) {
      console.error("Failed to update quota:", error);
      message.error("更新失败");
    }
  };

  const handleDeleteQuota = async (id: string) => {
    try {
      await resourceApi.deleteQuota(id);
      message.success("配额已删除");
      loadQuotas();
    } catch (error) {
      console.error("Failed to delete quota:", error);
      message.error("删除失败");
    }
  };

  const handleCreateQuota = async (data: {
    name: string;
    targetType: string;
    targetName?: string;
    limits: QuotaLimits;
    period: string;
  }) => {
    try {
      await resourceApi.createQuota(data);
      setCreateQuotaModalOpen(false);
      message.success("配额已创建");
      loadQuotas();
    } catch (error) {
      console.error("Failed to create quota:", error);
      message.error("创建失败");
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => `¥${amount.toFixed(2)}`;

  const getProviderLabel = (
    providerId: string,
    providerName: string | null,
  ) => {
    if (providerName) return providerName;
    const found = providers.find((p) => p.id === providerId);
    return found?.name || providerId;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "#ef4444";
    if (percentage >= 70) return "#f59e0b";
    return "#22c55e";
  };

  // API keys table columns
  const apiKeyColumns: ColumnsType<ApiKey> = [
    {
      title: t("resource.keyName", "名称"),
      dataIndex: "name",
      key: "name",
      render: (name: string, record: ApiKey) => (
        <div>
          <Text strong>{name}</Text>
          {record.description && (
            <div>
              <Text type="secondary" className="text-xs">
                {record.description}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t("resource.provider", "Provider"),
      key: "provider",
      width: 180,
      render: (_, record) => {
        const providerLabel = getProviderLabel(
          record.provider_id,
          record.provider_name,
        );
        const isMissing = !record.provider_name;
        return (
          <div className="flex items-center gap-2">
            <span className={isMissing ? "text-orange-500" : ""}>
              {providerLabel}
            </span>
            {isMissing && (
              <Tooltip title="Provider 已被删除，点击重新选择">
                <Button
                  type="link"
                  size="small"
                  className="!p-0 !h-auto"
                  icon={
                    <ExclamationCircleOutlined className="text-orange-500" />
                  }
                  onClick={() => handleEditProvider(record)}
                />
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "API 密钥",
      key: "fullKey",
      width: 280,
      render: (_, record) => {
        // Show the masked key
        const displayKey = record.keyPrefix || maskApiKey(record.fullKey);
        // Use the full plaintext key when copying
        const copyKey = record.fullKey || record.keyPrefix;
        return (
          <div className="flex items-center gap-2">
            <Text code className="flex-1 break-all font-mono text-xs">
              {displayKey}
            </Text>
            <Tooltip title="复制密钥">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyKey(copyKey)}
              />
            </Tooltip>
          </div>
        );
      },
    },
    {
      title: t("resource.keyStatus.status", "状态"),
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: ApiKeyStatus) => (
        <Tag
          color={statusConfig[status].color}
          icon={statusConfig[status].icon}
        >
          {statusConfig[status].label}
        </Tag>
      ),
    },
    {
      title: t("resource.usageCount", "使用次数"),
      dataIndex: "usageCount",
      key: "usageCount",
      width: 100,
      render: (count: number) => formatNumber(count),
    },
    {
      title: t("resource.lastUsed", "最后使用"),
      dataIndex: "lastUsedAt",
      key: "lastUsedAt",
      width: 120,
      render: (date: Date) => <Text type="secondary">{formatDate(date)}</Text>,
    },
    {
      title: t("common.actions", "操作"),
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="验证密钥">
            <Button
              type="text"
              size="small"
              icon={<SafetyOutlined />}
              onClick={() => handleValidateKey(record.id)}
            />
          </Tooltip>
          {record.status === "active" && (
            <Popconfirm
              title="确定要撤销此密钥吗？"
              onConfirm={() => handleRevokeKey(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="撤销密钥">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<ExclamationCircleOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
          <Popconfirm
            title="确定要删除此密钥吗？"
            onConfirm={() => handleDeleteKey(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除密钥">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Tabs content
  const tabItems = [
    {
      key: "api-keys",
      label: (
        <span>
          <KeyOutlined />
          API 密钥
        </span>
      ),
      children: (
        <div className="space-y-4">
          {/* Newly created key notice */}
          {newlyCreatedKey && (
            <Alert
              type="success"
              showIcon
              title="密钥创建成功"
              description={
                <div>
                  <p>请复制保存以下密钥，此密钥仅显示一次：</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Text code className="flex-1 break-all">
                      {newlyCreatedKey}
                    </Text>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyKey(newlyCreatedKey)}
                    >
                      复制
                    </Button>
                  </div>
                </div>
              }
              closable
              onClose={() => setNewlyCreatedKey(null)}
            />
          )}

          {/* Filter area */}
          <Card size="small">
            <Space wrap>
              <Input
                placeholder={t("common.search", "搜索密钥...")}
                prefix={<SearchOutlined />}
                value={keySearchQuery}
                onChange={(e) => setKeySearchQuery(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
              <Select
                placeholder="选择 Provider"
                value={keyFilterProvider || undefined}
                onChange={setKeyFilterProvider}
                allowClear
                style={{ width: 150 }}
                options={providers.map((p) => ({ label: p.name, value: p.id }))}
              />
              <Select
                placeholder="选择状态"
                value={keyFilterStatus || undefined}
                onChange={setKeyFilterStatus}
                allowClear
                style={{ width: 120 }}
                options={Object.entries(statusConfig).map(
                  ([value, { label }]) => ({
                    label,
                    value,
                  }),
                )}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
              >
                {t("resource.createApiKey", "添加密钥")}
              </Button>
            </Space>
          </Card>

          {/* API keys table */}
          <Card>
            <Table
              columns={apiKeyColumns}
              dataSource={apiKeys}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) =>
                  t("pagination.total", `共 ${total} 条`, { total }),
                pageSizeOptions: ["10", "20", "50", "100"],
              }}
              locale={{
                emptyText: (
                  <div className="py-8">
                    <KeyOutlined className="text-4xl text-gray-300 mb-2" />
                    <p>暂无 API 密钥</p>
                  </div>
                ),
              }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: "quotas",
      label: (
        <span>
          <SafetyOutlined />
          资源配额
        </span>
      ),
      children: (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateQuotaModalOpen(true)}
            >
              新建配额
            </Button>
          </div>

          <Row gutter={[16, 16]}>
            {quotas.map((quota) => {
              const tokenPercentage =
                (quota.usage.tokens / quota.limits.maxTokens) * 100 || 0;
              const requestPercentage =
                (quota.usage.requests / quota.limits.maxRequests) * 100 || 0;
              const costPercentage =
                (quota.usage.cost / quota.limits.maxCost) * 100 || 0;

              return (
                <Col key={quota.id} xs={24} lg={12}>
                  <Card
                    size="small"
                    title={quota.name}
                    extra={
                      <Space>
                        <Tooltip title="编辑配额">
                          <Button
                            type="text"
                            size="small"
                            icon={<SettingOutlined />}
                            onClick={() => setEditingQuota(quota)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="确定要删除此配额吗？"
                          onConfirm={() => handleDeleteQuota(quota.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Tooltip title="删除配额">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    }
                  >
                    <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
                      {quota.targetType === "global"
                        ? "全局配额"
                        : `${quota.targetType === "user" ? "用户" : quota.targetType === "department" ? "部门" : "Agent"}: ${quota.targetName}`}
                    </p>

                    <Space
                      orientation="vertical"
                      className="w-full"
                      size="middle"
                    >
                      {/* Tokens */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Tokens</span>
                          <span>
                            {formatNumber(quota.usage.tokens)} /{" "}
                            {formatNumber(quota.limits.maxTokens)}
                          </span>
                        </div>
                        <Progress
                          percent={Math.min(tokenPercentage, 100)}
                          strokeColor={getUsageColor(tokenPercentage)}
                          showInfo={false}
                          size="small"
                        />
                      </div>

                      {/* Requests */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>请求数</span>
                          <span>
                            {formatNumber(quota.usage.requests)} /{" "}
                            {formatNumber(quota.limits.maxRequests)}
                          </span>
                        </div>
                        <Progress
                          percent={Math.min(requestPercentage, 100)}
                          strokeColor={getUsageColor(requestPercentage)}
                          showInfo={false}
                          size="small"
                        />
                      </div>

                      {/* Cost */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>费用</span>
                          <span>
                            {formatCurrency(quota.usage.cost)} /{" "}
                            {formatCurrency(quota.limits.maxCost)}
                          </span>
                        </div>
                        <Progress
                          percent={Math.min(costPercentage, 100)}
                          strokeColor={getUsageColor(costPercentage)}
                          showInfo={false}
                          size="small"
                        />
                      </div>
                    </Space>

                    <div className="flex justify-between text-xs text-[var(--color-text-tertiary)] mt-4 pt-3 border-t border-(--color-border)">
                      <span>
                        周期:{" "}
                        {quota.period === "daily"
                          ? "每日"
                          : quota.period === "weekly"
                            ? "每周"
                            : "每月"}
                      </span>
                      <span>重置: {formatDate(quota.resetAt)}</span>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      ),
    },
    {
      key: "usage",
      label: (
        <span>
          <BarChartOutlined />
          使用统计
        </span>
      ),
      children: usageStats ? (
        <div className="space-y-4">
          {/* Statistics cards */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="总 Token"
                  value={usageStats.totalTokens}
                  formatter={(value) => formatNumber(Number(value))}
                  prefix={<DollarCircleOutlined className="text-blue-500" />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="总请求"
                  value={usageStats.totalRequests}
                  formatter={(value) => formatNumber(Number(value))}
                  prefix={<MessageOutlined className="text-purple-500" />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="总费用"
                  value={usageStats.totalCost}
                  formatter={(value) => formatCurrency(Number(value))}
                  prefix={<DollarOutlined className="text-green-500" />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="日均 Token"
                  value={Math.round(usageStats.totalTokens / 30)}
                  formatter={(value) => formatNumber(Number(value))}
                  prefix={<RiseOutlined className="text-orange-500" />}
                />
              </Card>
            </Col>
          </Row>

          {/* Provider distribution */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Token 消耗分布">
                <Space orientation="vertical" className="w-full">
                  {Object.entries(usageStats.tokensByProvider ?? {}).map(
                    ([providerId, tokens]) => {
                      const percentage =
                        (tokens / usageStats.totalTokens) * 100 || 0;
                      return (
                        <div key={providerId}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>
                              {getProviderLabel(providerId, providerId)}
                            </span>
                            <span>
                              {formatNumber(tokens)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <Progress
                            percent={Math.min(percentage, 100)}
                            strokeColor="var(--color-primary)"
                            showInfo={false}
                            size="small"
                          />
                        </div>
                      );
                    },
                  )}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="费用分布">
                <Space orientation="vertical" className="w-full">
                  {Object.entries(usageStats.costByProvider ?? {}).map(
                    ([providerId, cost]) => {
                      const percentage =
                        (cost / usageStats.totalCost) * 100 || 0;
                      return (
                        <div key={providerId}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>
                              {getProviderLabel(providerId, providerId)}
                            </span>
                            <span>
                              {formatCurrency(cost)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <Progress
                            percent={Math.min(percentage, 100)}
                            strokeColor="#22c55e"
                            showInfo={false}
                            size="small"
                          />
                        </div>
                      );
                    },
                  )}
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Daily usage trend */}
          <Card title="近 30 天使用趋势">
            <div className="h-48 flex items-end gap-1">
              {(usageStats.dailyUsage ?? []).map((day, index) => {
                const maxTokens = Math.max(
                  ...(usageStats.dailyUsage ?? []).map((d) => d.tokens),
                );
                const height =
                  maxTokens > 0 ? (day.tokens / maxTokens) * 100 : 0;
                return (
                  <Tooltip
                    key={index}
                    title={`${day.date}: ${formatNumber(day.tokens)} tokens`}
                  >
                    <div className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-[var(--color-primary)] rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      {index % 5 === 0 && (
                        <span className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                          {new Date(day.date).getDate()}
                        </span>
                      )}
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </Card>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("resource.title", "资源管理")}
        description="管理 API 密钥、资源配额和使用统计"
        icon={<SafetyOutlined className="text-xl" />}
        actions={
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => loadDataByTab(activeTab)}
            loading={loading}
          >
            {t("common.refresh", "刷新")}
          </Button>
        }
      />

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
        />
      </Card>

      {/* Create API key modal */}
      <CreateKeyModal
        open={createModalOpen}
        providers={providers}
        onClose={() => setCreateModalOpen(false)}
        onSave={async (data) => {
          const result = await resourceApi.createApiKey({
            name: data.name,
            provider_id: data.provider_id,
            keyPrefix: data.key,
            description: data.description,
            expiresAt: data.expiresAt,
            createdBy: "当前用户",
          });
          setCreateModalOpen(false);
          setNewlyCreatedKey(result.fullKey);
          loadApiKeys();
        }}
      />

      {/* Edit quota modal */}
      {editingQuota && (
        <QuotaEditModal
          quota={editingQuota}
          onClose={() => setEditingQuota(null)}
          onSave={handleUpdateQuota}
        />
      )}

      {/* Create quota modal */}
      <CreateQuotaModal
        open={createQuotaModalOpen}
        onClose={() => setCreateQuotaModalOpen(false)}
        onSave={handleCreateQuota}
      />

      {/* Edit provider modal */}
      {editingKeyProvider && (
        <EditProviderModal
          apiKey={editingKeyProvider}
          providers={providers}
          onClose={() => setEditingKeyProvider(null)}
          onSave={handleUpdateProvider}
        />
      )}
    </div>
  );
}

// Create key modal
function CreateKeyModal({
  open,
  providers,
  onClose,
  onSave,
}: {
  open: boolean;
  providers: Provider[];
  onClose: () => void;
  onSave: (data: {
    name: string;
    provider_id: string;
    key?: string;
    keyPrefix?: string;
    description?: string;
    expiresAt?: Date;
    createdBy?: string;
  }) => Promise<void>;
}) {
  const [form] = Form.useForm();
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      setError(null);
      await onSave({
        name: values.name,
        provider_id: values.provider_id,
        key: values.key,
        keyPrefix: values.key ? undefined : "", // if the user entered a key, no prefix needed
        description: values.description,
        expiresAt:
          hasExpiry && values.expiresAt ? values.expiresAt.toDate() : undefined,
        createdBy: "当前用户",
      });
      form.resetFields();
      setHasExpiry(false);
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error("Failed to save:", err);
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setHasExpiry(false);
    setError(null);
    onClose();
  };

  return (
    <Modal
      title="添加 API 密钥"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ provider_id: providers[0]?.id }}
      >
        <Form.Item
          name="name"
          label="密钥名称"
          rules={[{ required: true, message: "请输入密钥名称" }]}
        >
          <Input placeholder="如：生产环境密钥" />
        </Form.Item>

        <Form.Item name="provider_id" label="Provider">
          <Select
            options={providers.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Form.Item>

        <Form.Item
          name="key"
          label={
            <span>
              API 密钥
              <Text type="secondary" className="text-xs ml-2">
                （留空自动生成测试密钥）
              </Text>
            </span>
          }
        >
          <Input
            type={showKey ? "text" : "password"}
            placeholder="输入完整的 API 密钥"
            className="font-mono"
            suffix={
              <Button
                type="text"
                size="small"
                icon={showKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setShowKey(!showKey)}
              />
            }
          />
        </Form.Item>

        <Form.Item name="description" label="描述（可选）">
          <Input placeholder="密钥用途说明" />
        </Form.Item>

        <Form.Item label="设置过期时间">
          <Space>
            <Switch checked={hasExpiry} onChange={setHasExpiry} />
            {hasExpiry && (
              <Form.Item name="expiresAt" noStyle>
                <DatePicker
                  disabledDate={(current) =>
                    current && current < dayjs().startOf("day")
                  }
                />
              </Form.Item>
            )}
          </Space>
        </Form.Item>
      </Form>
      {error && (
        <Alert
          type="error"
          title={error}
          showIcon
          closable
          onClose={() => setError(null)}
          className="mt-3"
        />
      )}
    </Modal>
  );
}

// Quota edit modal
function QuotaEditModal({
  quota,
  onClose,
  onSave,
}: {
  quota: ResourceQuota;
  onClose: () => void;
  onSave: (id: string, limits: Partial<QuotaLimits>) => Promise<void>;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    form.setFieldsValue({
      maxTokens: quota.limits.maxTokens,
      maxRequests: quota.limits.maxRequests,
      maxConversations: quota.limits.maxConversations,
      maxCost: quota.limits.maxCost,
    });
  }, [quota, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      setError(null);
      await onSave(quota.id, values);
      form.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error("Failed to save:", err);
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`编辑配额 - ${quota.name}`}
      open={true}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="maxTokens" label="最大 Tokens">
          <InputNumber min={0} className="w-full" />
        </Form.Item>

        <Form.Item name="maxRequests" label="最大请求数">
          <InputNumber min={0} className="w-full" />
        </Form.Item>

        <Form.Item name="maxConversations" label="最大对话数">
          <InputNumber min={0} className="w-full" />
        </Form.Item>

        <Form.Item name="maxCost" label="最大费用（元）">
          <InputNumber min={0} step={0.01} precision={2} className="w-full" />
        </Form.Item>
      </Form>
      {error && (
        <Alert
          type="error"
          title={error}
          showIcon
          closable
          onClose={() => setError(null)}
          className="mt-3"
        />
      )}
    </Modal>
  );
}

// Create quota modal
function CreateQuotaModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    targetType: string;
    targetName?: string;
    limits: QuotaLimits;
    period: string;
  }) => Promise<void>;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      setError(null);
      await onSave({
        name: values.name,
        targetType: values.targetType,
        targetName: values.targetName,
        limits: {
          maxTokens: values.maxTokens ?? 0,
          maxRequests: values.maxRequests ?? 0,
          maxConversations: values.maxConversations ?? 0,
          maxCost: values.maxCost ?? 0,
        },
        period: values.period ?? "monthly",
      });
      form.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error("Failed to save:", err);
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setError(null);
    onClose();
  };

  return (
    <Modal
      title="新建配额"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      okText="创建"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          targetType: "global",
          period: "monthly",
          maxTokens: 1000000,
          maxRequests: 10000,
          maxConversations: 5000,
          maxCost: 1000,
        }}
      >
        <Form.Item
          name="name"
          label="配额名称"
          rules={[{ required: true, message: "请输入配额名称" }]}
        >
          <Input placeholder="如：全局配额" />
        </Form.Item>

        <Form.Item name="targetType" label="目标类型">
          <Select
            options={[
              { label: "全局", value: "global" },
              { label: "用户", value: "user" },
              { label: "部门", value: "department" },
              { label: "Agent", value: "agent" },
            ]}
          />
        </Form.Item>

        <Form.Item name="targetName" label="目标名称">
          <Input placeholder="用户/部门/Agent 名称（全局配额可留空）" />
        </Form.Item>

        <Form.Item name="period" label="统计周期">
          <Select
            options={[
              { label: "每日", value: "daily" },
              { label: "每周", value: "weekly" },
              { label: "每月", value: "monthly" },
            ]}
          />
        </Form.Item>

        <Form.Item name="maxTokens" label="最大 Tokens">
          <InputNumber min={0} className="w-full" />
        </Form.Item>

        <Form.Item name="maxRequests" label="最大请求数">
          <InputNumber min={0} className="w-full" />
        </Form.Item>

        <Form.Item name="maxConversations" label="最大对话数">
          <InputNumber min={0} className="w-full" />
        </Form.Item>

        <Form.Item name="maxCost" label="最大费用（元）">
          <InputNumber min={0} step={0.01} precision={2} className="w-full" />
        </Form.Item>
      </Form>
      {error && (
        <Alert
          type="error"
          title={error}
          showIcon
          closable
          onClose={() => setError(null)}
          className="mt-3"
        />
      )}
    </Modal>
  );
}

// Import dayjs for DatePicker
import dayjs from "dayjs";

// Edit provider modal
function EditProviderModal({
  apiKey,
  providers,
  onClose,
  onSave,
}: {
  apiKey: ApiKey;
  providers: Provider[];
  onClose: () => void;
  onSave: (id: string, providerId: string) => Promise<void>;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    form.setFieldsValue({
      provider_id: apiKey.provider_id,
    });
  }, [apiKey, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      setError(null);
      await onSave(apiKey.id, values.provider_id);
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error("Failed to save:", err);
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="重新选择 Provider"
      open={true}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnClose
    >
      <Alert
        type="warning"
        title="Provider 已被删除"
        description="请为此 API 密钥重新关联一个有效的 Provider"
        showIcon
        className="mb-4"
      />
      <Form form={form} layout="vertical">
        <Form.Item
          name="provider_id"
          label="选择 Provider"
          rules={[{ required: true, message: "请选择 Provider" }]}
        >
          <Select
            options={providers.map((p) => ({ label: p.name, value: p.id }))}
            placeholder="请选择新的 Provider"
          />
        </Form.Item>
      </Form>
      {error && (
        <Alert
          type="error"
          title={error}
          showIcon
          closable
          onClose={() => setError(null)}
          className="mt-3"
        />
      )}
    </Modal>
  );
}
