/**
 * Claw 管理页面 — 注册、配置、监控外部 Claw 工具
 * Claw 通过 AgentOS 代理 LLM 调用和渠道配置
 */

import { useState, useEffect, useCallback } from "react";
import {
  Input,
  Button,
  Card,
  Tag,
  message,
  Modal,
  Form,
  Select,
  Switch,
  Space,
  Empty,
  Spin,
  Typography,
  Dropdown,
  Alert,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { clawApi, providerApi, channelApi } from "@/services";
import { showDeleteConfirm } from "@/components/common/Modal";
import type { ClawInstance, ClawType, ClawInstanceReq } from "@/types";
import { clawTypeConfig } from "@/types/claw";
import type { ClawChannelMapping } from "@/types/claw";

const { Text } = Typography;

// ==================== Status Tag ====================

const statusColors: Record<string, string> = {
  online: "green",
  offline: "red",
  degraded: "orange",
  unknown: "default",
};

const statusLabels: Record<string, string> = {
  online: "在线",
  offline: "离线",
  degraded: "降级",
  unknown: "未知",
};

function StatusTag({ status }: { status: string }) {
  return (
    <Tag color={statusColors[status] || "default"}>
      {statusLabels[status] || status}
    </Tag>
  );
}

// ==================== Main Component ====================

export default function ClawsList() {
  const [claws, setClaws] = useState<ClawInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectClaw, setConnectClaw] = useState<ClawInstance | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [mappings, setMappings] = useState<ClawChannelMapping[]>([]);

  const selected = claws.find((c) => c.id === selectedId);

  const loadClaws = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clawApi.getAll();
      setClaws(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch {
      message.error("加载 Claw 列表失败");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadClaws();
  }, [loadClaws]);

  // Load channel mappings when selecting a claw
  useEffect(() => {
    if (selectedId) {
      clawApi.listChannelMappings(selectedId).then(setMappings).catch(() => {});
    }
  }, [selectedId]);

  const filtered = claws.filter(
    (c) =>
      c.instanceName.toLowerCase().includes(search.toLowerCase()) ||
      c.clawType.toLowerCase().includes(search.toLowerCase()),
  );

  // ==================== Handlers ====================

  const handleCreate = async (values: ClawInstanceReq) => {
    try {
      const result = await clawApi.create(values);
      message.success("Claw 注册成功");
      setCreateOpen(false);
      // Show connection guide
      setConnectClaw(result);
      setConnectOpen(true);
      loadClaws();
    } catch {
      message.error("注册失败");
    }
  };

  const handleUpdate = async (values: ClawInstanceReq) => {
    try {
      await clawApi.update(values);
      message.success("更新成功");
      setEditOpen(false);
      loadClaws();
    } catch {
      message.error("更新失败");
    }
  };

  const handleDelete = async (id: string) => {
    showDeleteConfirm({
      title: "删除 Claw",
      content: "删除后将同时移除关联的 Agent 记录，此操作不可撤销。",
      onOk: async () => {
        await clawApi.delete(id);
        message.success("已删除");
        if (selectedId === id) setSelectedId(null);
        loadClaws();
      },
    });
  };

  const handleTest = async (id: string) => {
    try {
      const result = await clawApi.test(id);
      message.success(result ? "连接成功" : "连接失败");
    } catch {
      message.error("测试失败");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success("已复制到剪贴板");
  };

  // ==================== Render ====================

  return (
    <div className="flex h-full gap-4">
      {/* Left Panel — Claw List */}
      <div className="w-80 flex-shrink-0 flex flex-col border rounded-lg bg-[var(--color-bg-base)]">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <Text strong>Claw 管理</Text>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              注册
            </Button>
          </div>
          <Input
            placeholder="搜索 Claw..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            size="small"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spin />
            </div>
          ) : filtered.length === 0 ? (
            <Empty description="暂无 Claw" className="mt-10" />
          ) : (
            filtered.map((claw) => {
              const config = clawTypeConfig[claw.clawType];
              return (
                <div
                  key={claw.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-[var(--color-bg-secondary)] ${
                    selectedId === claw.id
                      ? "bg-[var(--color-bg-secondary)] border border-[var(--color-primary)]"
                      : "border border-transparent"
                  }`}
                  onClick={() => setSelectedId(claw.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config?.icon}</span>
                      <div>
                        <div className="font-medium text-sm leading-tight">
                          {claw.instanceName}
                        </div>
                        <div className="text-xs text-[var(--color-text-tertiary)]">
                          {config?.label || claw.clawType}
                          {claw.version && ` v${claw.version}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusTag status={claw.status} />
                      {!claw.enabled && (
                        <Tag color="default">禁用</Tag>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel — Detail */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <ClawDetail
            claw={selected}
            mappings={mappings}
            onEdit={() => setEditOpen(true)}
            onDelete={() => handleDelete(selected.id)}
            onTest={() => handleTest(selected.id)}
            onShowConnect={() => {
              setConnectClaw(selected);
              setConnectOpen(true);
            }}
            onAssignChannel={() => setAssignOpen(true)}
            onRefresh={loadClaws}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Empty description="选择一个 Claw 查看详情" />
          </div>
        )}
      </div>

      {/* Create Modal */}
      <ClawCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Edit Modal */}
      {selected && (
        <ClawEditModal
          open={editOpen}
          claw={selected}
          onClose={() => setEditOpen(false)}
          onSubmit={handleUpdate}
        />
      )}

      {/* Connection Guide Modal */}
      <ConnectionGuideModal
        open={connectOpen}
        claw={connectClaw}
        onClose={() => {
          setConnectOpen(false);
          setConnectClaw(null);
        }}
        onCopy={handleCopy}
      />

      {/* Channel Assign Modal */}
      {selected && (
        <ChannelAssignModal
          open={assignOpen}
          clawInstanceId={selected.id}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => {
            setAssignOpen(false);
            if (selectedId) {
              clawApi.listChannelMappings(selectedId).then(setMappings);
            }
          }}
        />
      )}
    </div>
  );
}

// ==================== Claw Detail ====================

function ClawDetail({
  claw,
  mappings,
  onEdit,
  onDelete,
  onTest,
  onShowConnect,
  onAssignChannel,
  onRefresh,
}: {
  claw: ClawInstance;
  mappings: ClawChannelMapping[];
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onShowConnect: () => void;
  onAssignChannel: () => void;
  onRefresh: () => void;
}) {
  const config = clawTypeConfig[claw.clawType];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{config?.icon}</span>
            <div>
              <div className="text-xl font-semibold">{claw.instanceName}</div>
              <div className="flex items-center gap-2 mt-1">
                <Tag color={config?.color}>{config?.label}</Tag>
                <StatusTag status={claw.status} />
                {claw.version && <Text type="secondary">v{claw.version}</Text>}
                <Tag>{config?.mode === "server" ? "Server 模式" : "CLI 模式"}</Tag>
              </div>
            </div>
          </div>
          <Space>
            <Button icon={<LinkOutlined />} onClick={onShowConnect}>
              连接信息
            </Button>
            <Button icon={<ApiOutlined />} onClick={onTest}>
              测试连接
            </Button>
            <Button icon={<EditOutlined />} onClick={onEdit}>
              编辑
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "delete",
                    label: "删除",
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: onDelete,
                  },
                ],
              }}
            >
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        </div>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card title="LLM 配置" size="small">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Text type="secondary">Provider</Text>
              <Text>{claw.providerName || "-"}</Text>
            </div>
            <div className="flex justify-between">
              <Text type="secondary">模型</Text>
              <Text>{claw.modelName || "-"}</Text>
            </div>
            <div className="flex justify-between">
              <Text type="secondary">代理地址</Text>
              <Text code>http://localhost:3001/proxy/v1</Text>
            </div>
          </div>
        </Card>

        <Card title="连接信息" size="small">
          <div className="space-y-2">
            {claw.endpointUrl ? (
              <div className="flex justify-between">
                <Text type="secondary">端点</Text>
                <Text code>{claw.endpointUrl}</Text>
              </div>
            ) : (
              <div className="flex justify-between">
                <Text type="secondary">模式</Text>
                <Text>CLI（无服务端）</Text>
              </div>
            )}
            <div className="flex justify-between">
              <Text type="secondary">健康检查</Text>
              <Text>{claw.lastHealthCheck || "从未检查"}</Text>
            </div>
            <div className="flex justify-between">
              <Text type="secondary">最后同步</Text>
              <Text>{claw.lastSyncTime || "从未同步"}</Text>
            </div>
          </div>
        </Card>
      </div>

      {/* Channel Mappings */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <span>渠道映射</span>
            <Button size="small" icon={<PlusOutlined />} onClick={onAssignChannel}>
              分配渠道
            </Button>
          </div>
        }
        size="small"
      >
        {mappings.length === 0 ? (
          <Empty description="暂无渠道映射" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="space-y-2">
            {mappings.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-secondary)]"
              >
                <div>
                  <Text strong>{m.remoteChannelId}</Text>
                  <Tag className="ml-2">{m.remoteChannelType}</Tag>
                </div>
                <Space>
                  <Tag color={m.syncStatus === "synced" ? "green" : "orange"}>
                    {m.syncStatus}
                  </Tag>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={async () => {
                      await clawApi.unassignChannel(m.id);
                      onRefresh();
                    }}
                  />
                </Space>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ==================== Create Modal ====================

function ClawCreateModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ClawInstanceReq) => void;
}) {
  const [form] = Form.useForm();
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<ClawType | null>(null);

  useEffect(() => {
    if (open) {
      providerApi.getAll().then(setProviders).catch(() => {});
    }
  }, [open]);

  const clawType = selectedType ? clawTypeConfig[selectedType] : null;

  const handleProviderChange = async (providerId: string) => {
    form.setFieldValue("modelId", undefined);
    try {
      const prov = await providerApi.getById(providerId);
      setModels(prov.models || []);
    } catch {
      setModels([]);
    }
  };

  return (
    <Modal
      title="注册新 Claw"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      width={600}
      okText="注册"
    >
      {/* Step 1: Type Selection */}
      <div className="mb-4">
        <Text strong className="block mb-2">
          选择类型
        </Text>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(clawTypeConfig) as [ClawType, typeof clawTypeConfig[ClawType]][]).map(
            ([type, cfg]) => (
              <div
                key={type}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all w-32 text-center ${
                  selectedType === type
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                }`}
                onClick={() => {
                  setSelectedType(type);
                  form.setFieldValue("clawType", type);
                }}
              >
                <div className="text-2xl mb-1">{cfg.icon}</div>
                <div className="font-medium text-sm">{cfg.label}</div>
                <Tag className="mt-1" color={cfg.mode === "server" ? "blue" : "orange"}>
                  {cfg.mode === "server" ? "Server" : "CLI"}
                </Tag>
              </div>
            ),
          )}
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ enabled: true }}
      >
        <Form.Item name="clawType" hidden rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="instanceName"
            label="实例名称"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input placeholder={`如：生产环境 ${clawType?.label || "Claw"}`} />
          </Form.Item>

          <Form.Item name="version" label="版本">
            <Input placeholder="1.0.0（可选）" />
          </Form.Item>
        </div>

        {/* Server mode: show endpoint */}
        {clawType?.mode === "server" && (
          <Form.Item name="endpointUrl" label="端点地址">
            <Input placeholder="http://localhost:3001" />
          </Form.Item>
        )}

        <div className="border-t pt-4 mt-2">
          <Text strong className="block mb-3">
            LLM 配置（通过本服务代理）
          </Text>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="providerId"
              label="供应商"
              rules={[{ required: true, message: "请选择供应商" }]}
            >
              <Select
                placeholder="选择供应商"
                onChange={handleProviderChange}
                options={providers.map((p: any) => ({
                  label: p.name || p.providerName,
                  value: p.id,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="modelId"
              label="模型"
              rules={[{ required: true, message: "请选择模型" }]}
            >
              <Select
                placeholder="选择模型"
                options={models.map((m: any) => ({
                  label: m.modelId || m.name,
                  value: m.id,
                }))}
              />
            </Form.Item>
          </div>
        </div>

        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ==================== Edit Modal ====================

function ClawEditModal({
  open,
  claw,
  onClose,
  onSubmit,
}: {
  open: boolean;
  claw: ClawInstance;
  onClose: () => void;
  onSubmit: (values: ClawInstanceReq) => void;
}) {
  const [form] = Form.useForm();
  const [providers, setProviders] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      providerApi.getAll().then(setProviders).catch(() => {});
      form.setFieldsValue({
        id: claw.id,
        instanceName: claw.instanceName,
        clawType: claw.clawType,
        version: claw.version,
        endpointUrl: claw.endpointUrl,
        providerId: claw.providerId,
        modelId: claw.modelId,
        enabled: claw.enabled,
      });
    }
  }, [open, claw, form]);

  return (
    <Modal
      title="编辑 Claw"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      width={600}
      okText="保存"
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="clawType" hidden>
          <Input />
        </Form.Item>

        <Form.Item
          name="instanceName"
          label="实例名称"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="version" label="版本">
          <Input />
        </Form.Item>

        <Form.Item name="endpointUrl" label="端点地址">
          <Input />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="providerId" label="供应商" rules={[{ required: true }]}>
            <Select
              options={providers.map((p: any) => ({
                label: p.name || p.providerName,
                value: p.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="modelId" label="模型" rules={[{ required: true }]}>
            <Select placeholder="选择模型" />
          </Form.Item>
        </div>

        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ==================== Connection Guide Modal ====================

function ConnectionGuideModal({
  open,
  claw,
  onClose,
  onCopy,
}: {
  open: boolean;
  claw: ClawInstance | null;
  onClose: () => void;
  onCopy: (text: string) => void;
}) {
  if (!claw) return null;

  const config = clawTypeConfig[claw.clawType];
  const proxyKey = claw.proxyApiKey || "ap-xxxx-xxxx（请重新生成）";
  const proxyBase = claw.proxyApiBase || "http://localhost:3001/proxy/v1";

  const envLines = (config?.setupGuide || []).map((line) =>
    line.replace("{proxyApiKey}", proxyKey).replace("{proxyApiBase}", proxyBase),
  );

  const isNew = !!claw.proxyApiKey;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <CheckCircleOutlined className="text-green-500" />
          <span>{isNew ? "注册成功" : "连接信息"}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>完成</Button>}
      width={640}
    >
      {isNew && (
        <Alert
          type="success"
          message="请妥善保存以下连接信息，Proxy Key 仅在创建时显示一次。"
          className="mb-4"
          showIcon
        />
      )}

      {/* Connection Info */}
      <Card size="small" className="mb-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Text type="secondary">API Base</Text>
            <div className="flex items-center gap-2">
              <Text code>{proxyBase}</Text>
              <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(proxyBase)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Text type="secondary">API Key</Text>
            <div className="flex items-center gap-2">
              <Text code>
                {proxyKey.substring(0, 12)}****{proxyKey.substring(proxyKey.length - 4)}
              </Text>
              <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(proxyKey)} />
            </div>
          </div>
        </div>
      </Card>

      {/* Setup Guide */}
      <div className="mb-2">
        <Text strong>配置方法</Text>
      </div>
      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3 font-mono text-sm">
        {envLines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[var(--color-text-tertiary)] select-none">$</span>
            <span className="flex-1">{line}</span>
            <CopyOutlined
              className="cursor-pointer text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
              onClick={() => onCopy(line)}
            />
          </div>
        ))}
      </div>

      {/* Config file alternative */}
      {config?.mode === "server" && (
        <>
          <div className="mt-4 mb-2">
            <Text strong>或修改配置文件</Text>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3 font-mono text-xs">
            <pre>{`{
  "providers": {
    "openai": {
      "apiKey": "${proxyKey}",
      "apiBase": "${proxyBase}"
    }
  }
}`}</pre>
          </div>
        </>
      )}
    </Modal>
  );
}

// ==================== Channel Assign Modal ====================

function ChannelAssignModal({
  open,
  clawInstanceId,
  onClose,
  onAssigned,
}: {
  open: boolean;
  clawInstanceId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [form] = Form.useForm();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      channelApi.getAll().then(setChannels).catch(() => {});
    }
  }, [open]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await clawApi.assignChannel(
        clawInstanceId,
        values.channelId,
        values.remoteChannelId,
        values.remoteChannelType,
      );
      message.success("渠道分配成功");
      form.resetFields();
      onAssigned();
    } catch {
      // validation error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="分配渠道"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="分配"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="channelId"
          label="AgentOS 渠道"
          rules={[{ required: true, message: "请选择渠道" }]}
        >
          <Select
            placeholder="选择本地渠道"
            options={channels.map((c: any) => ({
              label: c.name || c.channelType,
              value: c.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="remoteChannelId"
          label="远端渠道 ID"
          rules={[{ required: true, message: "请输入远端渠道标识" }]}
        >
          <Input placeholder="如：tg-bot-001" />
        </Form.Item>

        <Form.Item
          name="remoteChannelType"
          label="远端渠道类型"
          rules={[{ required: true }]}
        >
          <Select
            placeholder="选择渠道类型"
            options={[
              { label: "Telegram", value: "telegram" },
              { label: "Discord", value: "discord" },
              { label: "Slack", value: "slack" },
              { label: "WeChat", value: "wechat" },
              { label: "DingTalk", value: "dingtalk" },
              { label: "Feishu", value: "feishu" },
              { label: "HTTP API", value: "http" },
              { label: "其他", value: "other" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
