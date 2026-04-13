/**
 * 资源管理页面
 * 使用 Ant Design 组件重构
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  message,
  Alert,
  DatePicker,
  Switch,
} from 'antd';
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
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/common';
import type {
  ApiKey,
  ApiKeyStatus,
  ResourceQuota,
  ResourceUsageStats,
  QuotaLimits,
} from '@/services';
import { resourceApi, providerOptions } from '@/services';
import { formatDate } from '@/utils';

const { Text } = Typography;

const statusConfig: Record<ApiKeyStatus, { color: string; label: string; icon: React.ReactNode }> = {
  active: { color: 'success', label: '有效', icon: <CheckCircleOutlined /> },
  expired: { color: 'warning', label: '已过期', icon: <ExclamationCircleOutlined /> },
  revoked: { color: 'error', label: '已撤销', icon: <CloseCircleOutlined /> },
};

export default function ResourceManagementPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('api-keys');
  const [loading, setLoading] = useState(true);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keySearchQuery, setKeySearchQuery] = useState('');
  const [keyFilterProvider, setKeyFilterProvider] = useState<string>('');
  const [keyFilterStatus, setKeyFilterStatus] = useState<ApiKeyStatus | ''>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
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
    try {
      await resourceApi.deleteApiKey(id);
      message.success('密钥已删除');
      loadData();
    } catch (error) {
      console.error('Failed to delete key:', error);
      message.error('删除失败');
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await resourceApi.revokeApiKey(id);
      message.success('密钥已撤销');
      loadData();
    } catch (error) {
      console.error('Failed to revoke key:', error);
      message.error('撤销失败');
    }
  };

  const handleValidateKey = async (id: string) => {
    try {
      const result = await resourceApi.validateApiKey(id);
      if (result.valid) {
        message.success('密钥有效');
      } else {
        message.warning(result.message);
      }
    } catch (error) {
      console.error('Failed to validate key:', error);
      message.error('验证失败');
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    message.success('已复制到剪贴板');
  };

  const handleUpdateQuota = async (id: string, limits: Partial<QuotaLimits>) => {
    try {
      await resourceApi.updateQuota(id, limits);
      setEditingQuota(null);
      message.success('配额已更新');
      loadData();
    } catch (error) {
      console.error('Failed to update quota:', error);
      message.error('更新失败');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => `¥${amount.toFixed(2)}`;

  const getProviderLabel = (provider: string) => {
    return providerOptions.find((p) => p.value === provider)?.label || provider;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#22c55e';
  };

  // API Keys 表格列
  const apiKeyColumns: ColumnsType<ApiKey> = [
    {
      title: t('resource.keyName', '名称'),
      dataIndex: 'name',
      key: 'name',
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
      title: t('resource.provider', 'Provider'),
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (provider: string) => getProviderLabel(provider),
    },
    {
      title: t('resource.keyPrefix', '密钥前缀'),
      dataIndex: 'keyPrefix',
      key: 'keyPrefix',
      width: 140,
      render: (prefix: string) => <Text code>{prefix}</Text>,
    },
    {
      title: t('resource.keyStatus.status', '状态'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ApiKeyStatus) => (
        <Tag color={statusConfig[status].color} icon={statusConfig[status].icon}>
          {statusConfig[status].label}
        </Tag>
      ),
    },
    {
      title: t('resource.usageCount', '使用次数'),
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 100,
      render: (count: number) => formatNumber(count),
    },
    {
      title: t('resource.lastUsed', '最后使用'),
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      width: 120,
      render: (date: Date) => <Text type="secondary">{formatDate(date)}</Text>,
    },
    {
      title: t('common.actions', '操作'),
      key: 'actions',
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
          {record.status === 'active' && (
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
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Tabs 内容
  const tabItems = [
    {
      key: 'api-keys',
      label: (
        <span>
          <KeyOutlined />
          API 密钥
        </span>
      ),
      children: (
        <div className="space-y-4">
          {/* 新创建的密钥提示 */}
          {newlyCreatedKey && (
            <Alert
              type="success"
              showIcon
              message="密钥创建成功"
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

          {/* 筛选区域 */}
          <Card size="small">
            <Space wrap>
              <Input
                placeholder={t('common.search', '搜索密钥...')}
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
                options={providerOptions}
              />
              <Select
                placeholder="选择状态"
                value={keyFilterStatus || undefined}
                onChange={setKeyFilterStatus}
                allowClear
                style={{ width: 120 }}
                options={Object.entries(statusConfig).map(([value, { label }]) => ({
                  label,
                  value,
                }))}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
              >
                {t('resource.createApiKey', '添加密钥')}
              </Button>
            </Space>
          </Card>

          {/* 密钥表格 */}
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
                showTotal: (total) => t('pagination.total', `共 ${total} 条`, { total }),
                pageSizeOptions: ['10', '20', '50', '100'],
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
      key: 'quotas',
      label: (
        <span>
          <SafetyOutlined />
          资源配额
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          {quotas.map((quota) => {
            const tokenPercentage = (quota.usage.tokens / quota.limits.maxTokens) * 100 || 0;
            const requestPercentage = (quota.usage.requests / quota.limits.maxRequests) * 100 || 0;
            const costPercentage = (quota.usage.cost / quota.limits.maxCost) * 100 || 0;

            return (
              <Col key={quota.id} xs={24} lg={12}>
                <Card
                  size="small"
                  title={quota.name}
                  extra={
                    <Button
                      type="text"
                      size="small"
                      icon={<SettingOutlined />}
                      onClick={() => setEditingQuota(quota)}
                    />
                  }
                >
                  <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
                    {quota.targetType === 'global'
                      ? '全局配额'
                      : `${quota.targetType === 'user' ? '用户' : quota.targetType === 'department' ? '部门' : 'Agent'}: ${quota.targetName}`}
                  </p>

                  <Space direction="vertical" className="w-full" size="middle">
                    {/* Tokens */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Tokens</span>
                        <span>
                          {formatNumber(quota.usage.tokens)} / {formatNumber(quota.limits.maxTokens)}
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
                          {formatNumber(quota.usage.requests)} / {formatNumber(quota.limits.maxRequests)}
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
                          {formatCurrency(quota.usage.cost)} / {formatCurrency(quota.limits.maxCost)}
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

                  <div className="flex justify-between text-xs text-[var(--color-text-tertiary)] mt-4 pt-3 border-t border-[var(--color-border)]">
                    <span>
                      周期: {quota.period === 'daily' ? '每日' : quota.period === 'weekly' ? '每周' : '每月'}
                    </span>
                    <span>重置: {formatDate(quota.resetAt)}</span>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      ),
    },
    {
      key: 'usage',
      label: (
        <span>
          <BarChartOutlined />
          使用统计
        </span>
      ),
      children: usageStats ? (
        <div className="space-y-4">
          {/* 统计卡片 */}
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

          {/* Provider 分布 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Token 消耗分布">
                <Space direction="vertical" className="w-full">
                  {Object.entries(usageStats.tokensByProvider).map(([provider, tokens]) => {
                    const percentage = (tokens / usageStats.totalTokens) * 100 || 0;
                    return (
                      <div key={provider}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{getProviderLabel(provider)}</span>
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
                  })}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="费用分布">
                <Space direction="vertical" className="w-full">
                  {Object.entries(usageStats.costByProvider).map(([provider, cost]) => {
                    const percentage = (cost / usageStats.totalCost) * 100 || 0;
                    return (
                      <div key={provider}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{getProviderLabel(provider)}</span>
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
                  })}
                </Space>
              </Card>
            </Col>
          </Row>

          {/* 每日使用趋势 */}
          <Card title="近 30 天使用趋势">
            <div className="h-48 flex items-end gap-1">
              {usageStats.dailyUsage.map((day, index) => {
                const maxTokens = Math.max(...usageStats.dailyUsage.map((d) => d.tokens));
                const height = maxTokens > 0 ? (day.tokens / maxTokens) * 100 : 0;
                return (
                  <Tooltip key={index} title={`${day.date}: ${formatNumber(day.tokens)} tokens`}>
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
        title={t('resource.title', '资源管理')}
        description="管理 API 密钥、资源配额和使用统计"
        icon={<SafetyOutlined className="text-xl" />}
        actions={
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={loadData}
            loading={loading}
          >
            {t('common.refresh', '刷新')}
          </Button>
        }
      />

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* 创建密钥弹窗 */}
      <CreateKeyModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={async (data) => {
          const result = await resourceApi.createApiKey({
            ...data,
            createdBy: '当前用户',
          });
          setCreateModalOpen(false);
          setNewlyCreatedKey(result.fullKey);
          loadData();
        }}
      />

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
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    provider: string;
    key: string;
    description?: string;
    expiresAt?: Date;
  }) => Promise<void>;
}) {
  const [form] = Form.useForm();
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasExpiry, setHasExpiry] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await onSave({
        name: values.name,
        provider: values.provider,
        key: values.key,
        description: values.description,
        expiresAt: hasExpiry && values.expiresAt ? values.expiresAt.toDate() : undefined,
      });
      form.resetFields();
      setHasExpiry(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setHasExpiry(false);
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
        initialValues={{ provider: 'openai' }}
      >
        <Form.Item
          name="name"
          label="密钥名称"
          rules={[{ required: true, message: '请输入密钥名称' }]}
        >
          <Input placeholder="如：生产环境密钥" />
        </Form.Item>

        <Form.Item name="provider" label="Provider">
          <Select options={providerOptions} />
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
            type={showKey ? 'text' : 'password'}
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
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            )}
          </Space>
        </Form.Item>
      </Form>
    </Modal>
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
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

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
      await onSave(quota.id, values);
      form.resetFields();
    } catch (error) {
      console.error('Failed to save:', error);
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
    </Modal>
  );
}

// Import dayjs for DatePicker
import dayjs from 'dayjs';
