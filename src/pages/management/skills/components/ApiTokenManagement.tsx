/**
 * API Token Management Component
 * 管理个人 API 访问令牌
 */

import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Popconfirm,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { skillHubV2Api } from '@/services';

const { Text, Paragraph } = Typography;

interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export function ApiTokenManagement() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<{ token: string } | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const data = await skillHubV2Api.getTokens();
      setTokens(data.items);
    } catch (error) {
      message.error('加载令牌失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async (values: any) => {
    try {
      const result = await skillHubV2Api.createToken(values);
      setNewToken(result);
      message.success('令牌创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadTokens();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleDeleteToken = async (id: string) => {
    try {
      await skillHubV2Api.deleteToken(id);
      message.success('令牌已删除');
      loadTokens();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const getExpirationStatus = (expiresAt: string | null) => {
    if (!expiresAt) {
      return { color: 'green', text: '永不过期' };
    }
    const now = new Date();
    const exp = new Date(expiresAt);
    const daysLeft = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { color: 'red', text: '已过期' };
    } else if (daysLeft < 7) {
      return { color: 'orange', text: `${daysLeft}天后过期` };
    } else if (daysLeft < 30) {
      return { color: 'blue', text: `${daysLeft}天后过期` };
    } else {
      return { color: 'default', text: `${Math.ceil(daysLeft / 30)}个月后过期` };
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '令牌前缀',
      dataIndex: 'tokenPrefix',
      key: 'tokenPrefix',
      render: (prefix: string) => (
        <code className="bg-gray-100 px-2 py-1 rounded">{prefix}...</code>
      ),
    },
    {
      title: '权限范围',
      dataIndex: 'scopes',
      key: 'scopes',
      render: (scopes: string[]) => (
        <Space size={4} wrap>
          {scopes?.map(scope => (
            <Tag key={scope} color="blue">{scope}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '过期时间',
      key: 'expiresAt',
      render: (_: unknown, record: ApiToken) => {
        const status = getExpirationStatus(record.expiresAt);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (date: string | null) => (
        <span className="text-sm">
          {date ? new Date(date).toLocaleString('zh-CN') : '从未使用'}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: ApiToken) => (
        <Space>
          <Popconfirm
            title="确认删除此令牌？"
            onConfirm={() => handleDeleteToken(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card
        title={
          <Space>
            <KeyOutlined />
            <span>API 令牌管理</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建令牌
          </Button>
        }
      >
        <Paragraph type="secondary" className="mb-4">
          API 令牌用于 CLI 或外部工具访问 Skill Hub。请妥善保管您的令牌，创建后将只显示一次。
        </Paragraph>

        <Table
          columns={columns}
          dataSource={tokens}
          rowKey="id"
          loading={loading}
          pagination={false}
        />

        {tokens.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">
            <KeyOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>还没有创建任何令牌</div>
          </div>
        )}
      </Card>

      {/* Create Token Modal */}
      <Modal
        title="创建 API 令牌"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateToken}
        >
          <Form.Item
            name="name"
            label="令牌名称"
            rules={[{ required: true, message: '请输入令牌名称' }]}
          >
            <Input placeholder="例如：我的 CLI 令牌" />
          </Form.Item>

          <Form.Item
            name="scopes"
            label="权限范围"
            rules={[{ required: true, message: '请选择权限范围' }]}
            tooltip="选择此令牌可以访问的 API 范围"
          >
            <Select
              mode="multiple"
              placeholder="选择权限"
              options={[
                { label: '读取技能', value: 'skill:read' },
                { label: '写入技能', value: 'skill:write' },
                { label: '删除技能', value: 'skill:delete' },
                { label: '发布技能', value: 'skill:publish' },
                { label: '管理命名空间', value: 'namespace:manage' },
                { label: '审核权限', value: 'review:manage' },
                { label: '管理员权限', value: 'admin' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="expirationMode"
            label="过期时间"
            initialValue="never"
            rules={[{ required: true, message: '请选择过期时间' }]}
          >
            <Select
              options={[
                { label: '永不过期', value: 'never' },
                { label: '30 天', value: '30d' },
                { label: '90 天', value: '90d' },
                { label: '180 天', value: '180d' },
                { label: '1 年', value: '365d' },
                { label: '自定义', value: 'custom' },
              ]}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => {
              return currentValues.expirationMode === 'custom';
            }}
          >
            <Form.Item
              name="customExpiresAt"
              label="自定义过期日期"
              rules={[
                {
                  validator: (_, value) => {
                    if (form.getFieldValue('expirationMode') === 'custom' && !value) {
                      return Promise.reject('请选择过期日期');
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input type="date" />
            </Form.Item>
          </Form.Item>
        </Form>
      </Modal>

      {/* New Token Display Modal */}
      <Modal
        title="令牌创建成功"
        open={!!newToken}
        onCancel={() => setNewToken(null)}
        footer={[
          <Button key="close" onClick={() => setNewToken(null)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {newToken && (
          <div className="space-y-4">
            <Paragraph type="warning" strong>
              ⚠️ 请立即复制并妥善保存此令牌！关闭此窗口后将无法再次查看完整令牌。
            </Paragraph>

            <div>
              <Text strong>令牌：</Text>
              <div className="mt-2 p-3 bg-gray-50 rounded border">
                <code className="break-all text-sm">{newToken.token}</code>
              </div>
            </div>

            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(newToken.token, 'new')}
            >
              {copiedTokenId === 'new' ? '已复制！' : '复制令牌'}
            </Button>

            <div className="text-sm text-gray-500">
              <p>• 使用 <code>amos-cli auth login --token YOUR_TOKEN</code> 配置 CLI</p>
              <p>• 在 HTTP 请求头中使用：<code>Authorization: Bearer YOUR_TOKEN</code></p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
