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
  Tabs,
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
  SendOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { clawApi, providerApi, channelApi, channelTypeConfig } from "@/services";
import OctosManagementPanel from "./components/octos/OctosManagementPanel";
import { showDeleteConfirm } from "@/components/common/Modal";
import type { ClawInstance, ClawType, ClawInstanceReq } from "@/types";
import { clawTypeConfig, channelProxyTypeConfig } from "@/types/claw";
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
  const [proxyGuideOpen, setProxyGuideOpen] = useState(false);
  const [proxyGuideMapping, setProxyGuideMapping] = useState<ClawChannelMapping | null>(null);

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

  const handleCreate = async (values: ClawInstanceReq & { authToken?: string }) => {
    try {
      const { authToken, ...rest } = values;
      const payload: ClawInstanceReq = {
        ...rest,
        authConfig: authToken ? { authToken } : undefined,
      };
      const result = await clawApi.create(payload);
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

  const handleUpdate = async (values: ClawInstanceReq & { authToken?: string }) => {
    try {
      const { authToken, ...rest } = values;
      const payload: ClawInstanceReq = {
        ...rest,
        authConfig: authToken ? { authToken } : undefined,
      };
      await clawApi.update(payload);
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
            onShowProxyGuide={(mapping) => {
              setProxyGuideMapping(mapping);
              setProxyGuideOpen(true);
            }}
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

      {/* Channel Proxy Guide Modal */}
      <ChannelProxyGuideModal
        open={proxyGuideOpen}
        mapping={proxyGuideMapping}
        onClose={() => {
          setProxyGuideOpen(false);
          setProxyGuideMapping(null);
        }}
        onCopy={handleCopy}
      />
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
  onShowProxyGuide,
}: {
  claw: ClawInstance;
  mappings: ClawChannelMapping[];
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onShowConnect: () => void;
  onAssignChannel: () => void;
  onRefresh: () => void;
  onShowProxyGuide: (mapping: ClawChannelMapping) => void;
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

      {/* Octos 管理面板 */}
      {claw.clawType === "octos" && <OctosManagementPanel claw={claw} />}

      {/* Info Cards — 非 Octos 类型显示 */}
      {claw.clawType !== "octos" && (
      <>
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

      {/* Channel Proxy */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <span>渠道代理</span>
            <Button size="small" icon={<PlusOutlined />} onClick={onAssignChannel}>
              分配渠道
            </Button>
          </div>
        }
        size="small"
      >
        {mappings.length === 0 ? (
          <Empty description="暂无渠道代理，请先分配渠道" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="space-y-3">
            {mappings.map((m) => {
              const proxyCfg = channelProxyTypeConfig[m.remoteChannelType] || channelProxyTypeConfig[m.channelType || ""];
              return (
                <div
                  key={m.id}
                  className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{proxyCfg?.icon || "📡"}</span>
                      <Text strong>{m.channelName || m.remoteChannelId}</Text>
                      <Tag>{proxyCfg?.label || m.remoteChannelType}</Tag>
                      <Tag color={
                        m.proxyStatus === "active" ? "green"
                          : m.proxyStatus === "error" ? "red"
                            : "default"
                      }>
                        {m.proxyStatus === "active" ? "代理中"
                          : m.proxyStatus === "error" ? "异常"
                            : "未激活"}
                      </Tag>
                    </div>
                    <Space size="small">
                      {m.messageCount !== undefined && (
                        <Text type="secondary" className="text-xs">
                          {m.messageCount} 条消息
                        </Text>
                      )}
                    </Space>
                  </div>

                  {/* Proxy URLs */}
                  {m.proxyInfo && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <SendOutlined className="text-[var(--color-text-tertiary)]" />
                        <Text type="secondary" className="w-16 flex-shrink-0">发送地址</Text>
                        <Text code className="flex-1 truncate">{m.proxyInfo.sendUrl}</Text>
                        <CopyOutlined
                          className="cursor-pointer text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
                          onClick={() => {
                            navigator.clipboard.writeText(m.proxyInfo!.sendUrl);
                            message.success("已复制发送地址");
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <LinkOutlined className="text-[var(--color-text-tertiary)]" />
                        <Text type="secondary" className="w-16 flex-shrink-0">Webhook</Text>
                        <Text code className="flex-1 truncate">{m.proxyInfo.receiveUrl}</Text>
                        <CopyOutlined
                          className="cursor-pointer text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
                          onClick={() => {
                            navigator.clipboard.writeText(m.proxyInfo!.receiveUrl);
                            message.success("已复制 Webhook 地址");
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border)]">
                    <Text type="secondary" className="text-xs">
                      {m.lastActivity || "无活动记录"}
                    </Text>
                    <Space size="small">
                      <Button
                        size="small"
                        type="link"
                        icon={<BookOutlined />}
                        onClick={() => onShowProxyGuide(m)}
                      >
                        配置指南
                      </Button>
                      <Button
                        size="small"
                        type="link"
                        icon={<ApiOutlined />}
                        onClick={async () => {
                          try {
                            const ok = await clawApi.testChannelProxy(m.id);
                            message.success(ok ? "渠道代理连接正常" : "渠道代理连接失败");
                          } catch {
                            message.error("测试失败");
                          }
                        }}
                      >
                        测试
                      </Button>
                      <Button
                        size="small"
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={async () => {
                          await clawApi.unassignChannel(m.id);
                          onRefresh();
                        }}
                      >
                        移除
                      </Button>
                    </Space>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      </>
      )}
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
            <Input placeholder="http://localhost:8080" />
          </Form.Item>
        )}

        {/* Octos / Server 模式: Auth Token */}
        {selectedType === "octos" && (
          <Form.Item
            name="authToken"
            label="Auth Token"
            tooltip="Octos 服务启动时 --auth-token 参数指定的令牌"
            rules={[{ required: selectedType === "octos", message: "请输入 Octos Auth Token" }]}
          >
            <Input.Password placeholder="如：szZX5LqA2EmjCKhB" />
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
                  label: m.name || m.modelId,
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
  const [models, setModels] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      providerApi.getAll().then(setProviders).catch(() => {});
      form.setFieldsValue({
        id: claw.id,
        instanceName: claw.instanceName,
        clawType: claw.clawType,
        version: claw.version,
        endpointUrl: claw.endpointUrl,
        authToken: claw.authConfig?.authToken || claw.authConfig?.token || "",
        providerId: claw.providerId,
        modelId: claw.modelId,
        enabled: claw.enabled,
      });
      // Load models for current provider
      if (claw.providerId) {
        providerApi.getById(claw.providerId).then((prov: any) => {
          setModels(prov.models || []);
        }).catch(() => setModels([]));
      }
    }
  }, [open, claw, form]);

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

        {claw.clawType === "octos" && (
          <Form.Item
            name="authToken"
            label="Auth Token"
            tooltip="Octos 服务启动时 --auth-token 参数指定的令牌"
          >
            <Input.Password placeholder="如：szZX5LqA2EmjCKhB" />
          </Form.Item>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="providerId" label="供应商" rules={[{ required: true }]}>
            <Select
              onChange={handleProviderChange}
              options={providers.map((p: any) => ({
                label: p.name || p.providerName,
                value: p.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="modelId" label="模型" rules={[{ required: true }]}>
            <Select
              placeholder="选择模型"
              options={models.map((m: any) => ({
                label: m.name || m.modelId,
                value: m.id,
              }))}
            />
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
  const [mappings, setMappings] = useState<ClawChannelMapping[]>([]);

  useEffect(() => {
    if (open && claw) {
      clawApi.listChannelMappings(claw.id).then(setMappings).catch(() => {});
    }
  }, [open, claw]);

  if (!claw) return null;

  const config = clawTypeConfig[claw.clawType];
  const proxyKey = claw.proxyApiKey || "ap-xxxx-xxxx（请重新生成）";
  const proxyBase = claw.proxyApiBase || "http://localhost:3001/proxy/v1";

  const envLines = (config?.setupGuide || []).map((line) =>
    line.replace("{proxyApiKey}", proxyKey).replace("{proxyApiBase}", proxyBase),
  );

  const isNew = !!claw.proxyApiKey;

  // Build channel proxy guide for each mapping
  const channelGuideItems = mappings.filter((m) => m.proxyInfo).map((m) => {
    const proxyCfg = channelProxyTypeConfig[m.remoteChannelType] || channelProxyTypeConfig[m.channelType || ""];
    const proxyInfo = m.proxyInfo!;
    const setupLines = (proxyCfg?.setupGuide || []).map((line) =>
      line
        .replace(/\{proxyApiBase\}/g, proxyBase)
        .replace(/\{mappingId\}/g, m.id)
        .replace(/\{proxyToken\}/g, proxyInfo.proxyToken),
    );
    return { mapping: m, proxyCfg, proxyInfo, setupLines };
  });

  const tabItems = [
    {
      key: "llm",
      label: "LLM 代理",
      children: (
        <>
          {/* LLM Connection Info */}
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

          {/* LLM Setup Guide */}
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
        </>
      ),
    },
    {
      key: "channel",
      label: `渠道代理${channelGuideItems.length > 0 ? ` (${channelGuideItems.length})` : ""}`,
      children: channelGuideItems.length === 0 ? (
        <Empty description="暂无渠道代理，请先在详情页分配渠道" />
      ) : (
        <div className="space-y-4">
          {channelGuideItems.map(({ mapping, proxyCfg, proxyInfo, setupLines }) => (
            <Card
              key={mapping.id}
              size="small"
              title={
                <div className="flex items-center gap-2">
                  <span>{proxyCfg?.icon || "📡"}</span>
                  <span>{mapping.channelName || mapping.remoteChannelId}</span>
                  <Tag>{proxyCfg?.label || mapping.remoteChannelType}</Tag>
                </div>
              }
            >
              {/* Proxy Connection Info */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <Text type="secondary">发送地址</Text>
                  <div className="flex items-center gap-2">
                    <Text code>{proxyInfo.sendUrl}</Text>
                    <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(proxyInfo.sendUrl)} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Text type="secondary">Webhook 地址</Text>
                  <div className="flex items-center gap-2">
                    <Text code>{proxyInfo.receiveUrl}</Text>
                    <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(proxyInfo.receiveUrl)} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Text type="secondary">代理 Token</Text>
                  <div className="flex items-center gap-2">
                    <Text code>
                      {proxyInfo.proxyToken.substring(0, 8)}****{proxyInfo.proxyToken.substring(proxyInfo.proxyToken.length - 4)}
                    </Text>
                    <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(proxyInfo.proxyToken)} />
                  </div>
                </div>
              </div>

              {/* Setup Guide */}
              <div className="mb-2">
                <Text strong>配置方法</Text>
              </div>
              <div className="bg-[var(--color-bg-base)] rounded-lg p-3 font-mono text-sm">
                {setupLines.map((line, i) => (
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

              {/* Curl examples */}
              <div className="mt-3 mb-2">
                <Text strong>API 示例</Text>
              </div>
              <div className="bg-[var(--color-bg-base)] rounded-lg p-3 font-mono text-xs">
                <pre>{`# 发送消息到渠道
curl -X POST ${proxyInfo.sendUrl} \\
  -H "Authorization: Bearer ${proxyInfo.proxyToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Hello!", "chat_id": "${mapping.remoteChannelId}"}'

# 注册 Webhook 回调
curl -X POST ${proxyInfo.receiveUrl} \\
  -H "Authorization: Bearer ${proxyInfo.proxyToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"callback_url": "https://your-claw.example.com/webhook"}'`}</pre>
              </div>
            </Card>
          ))}
        </div>
      ),
    },
  ];

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
      width={680}
    >
      {isNew && (
        <Alert
          type="success"
          message="请妥善保存以下连接信息，Proxy Key 仅在创建时显示一次。"
          className="mb-4"
          showIcon
        />
      )}
      <Tabs items={tabItems} />
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

  // Auto-fill remoteChannelType when channel is selected
  const handleChannelChange = (channelId: string) => {
    const ch = channels.find((c: any) => c.id === channelId);
    if (ch) {
      form.setFieldValue("remoteChannelType", ch.type);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await clawApi.assignChannel(
        clawInstanceId,
        values.channelId,
        values.remoteChannelId,
        values.remoteChannelType,
        values.callbackUrl,
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

  // Build channel type options from channelTypeConfig
  const channelTypeOptions = Object.entries(channelTypeConfig).map(
    ([type, cfg]) => ({
      label: `${cfg.icon} ${cfg.name}`,
      value: type,
    }),
  );

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
            onChange={handleChannelChange}
            options={channels.map((c: any) => {
              const typeCfg = channelTypeConfig[c.type as keyof typeof channelTypeConfig];
              return {
                label: (
                  <div className="flex items-center gap-2">
                    <span>{typeCfg?.icon || "📡"}</span>
                    <span>{c.name || c.channelType}</span>
                    <Tag>{typeCfg?.name || c.type}</Tag>
                  </div>
                ),
                value: c.id,
              };
            })}
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
            placeholder="选择渠道类型（选择渠道后自动填充）"
            options={channelTypeOptions}
          />
        </Form.Item>

        <Form.Item
          name="callbackUrl"
          label="回调地址"
          tooltip="Claw 的消息接收地址，AgentOS 将渠道消息转发到此 URL"
        >
          <Input placeholder="https://your-claw.example.com/webhook（可选）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ==================== Channel Proxy Guide Modal ====================

function ChannelProxyGuideModal({
  open,
  mapping,
  onClose,
  onCopy,
}: {
  open: boolean;
  mapping: ClawChannelMapping | null;
  onClose: () => void;
  onCopy: (text: string) => void;
}) {
  if (!mapping) return null;

  const proxyCfg = channelProxyTypeConfig[mapping.remoteChannelType]
    || channelProxyTypeConfig[mapping.channelType || ""];
  const proxyInfo = mapping.proxyInfo;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <BookOutlined />
          <span>{mapping.channelName || mapping.remoteChannelId} — 代理配置指南</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={640}
    >
      {/* Channel Info */}
      <Card size="small" className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{proxyCfg?.icon || "📡"}</span>
          <Text strong>{mapping.channelName || mapping.remoteChannelId}</Text>
          <Tag>{proxyCfg?.label || mapping.remoteChannelType}</Tag>
          <Tag color={mapping.proxyStatus === "active" ? "green" : "default"}>
            {mapping.proxyStatus === "active" ? "代理中" : "未激活"}
          </Tag>
        </div>
        {proxyInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Text type="secondary">发送地址 (Send)</Text>
              <div className="flex items-center gap-2">
                <Text code>{proxyInfo.sendUrl}</Text>
                <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(proxyInfo.sendUrl)} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary">接收地址 (Webhook)</Text>
              <div className="flex items-center gap-2">
                <Text code>{proxyInfo.receiveUrl}</Text>
                <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(proxyInfo.receiveUrl)} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary">代理 Token</Text>
              <div className="flex items-center gap-2">
                <Text code>
                  {proxyInfo.proxyToken.substring(0, 8)}****{proxyInfo.proxyToken.substring(proxyInfo.proxyToken.length - 4)}
                </Text>
                <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(proxyInfo.proxyToken)} />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* API Usage */}
      {proxyInfo && (
        <>
          <div className="mb-2">
            <Text strong>发送消息到渠道</Text>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3 font-mono text-xs mb-4">
            <pre>{`curl -X POST ${proxyInfo.sendUrl} \\
  -H "Authorization: Bearer ${proxyInfo.proxyToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Hello from Claw!",
    "chat_id": "${mapping.remoteChannelId}"
  }'`}</pre>
          </div>

          <div className="mb-2">
            <Text strong>接收渠道消息</Text>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3 font-mono text-xs mb-4">
            <pre>{`# 1. 注册回调地址（Claw 的消息接收端点）
curl -X POST ${proxyInfo.receiveUrl} \\
  -H "Authorization: Bearer ${proxyInfo.proxyToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "callback_url": "https://your-claw.example.com/webhook"
  }'

# 2. Claw 的 webhook 端点接收数据格式
# POST https://your-claw.example.com/webhook
# {
#   "message_id": "msg-xxx",
#   "channel_type": "${mapping.remoteChannelType}",
#   "chat_id": "${mapping.remoteChannelId}",
#   "content": "用户消息内容",
#   "sender": { "id": "user-xxx", "name": "用户名" },
#   "timestamp": "2026-04-16T10:00:00Z"
# }`}</pre>
          </div>

          <div className="mb-2">
            <Text strong>环境变量配置</Text>
          </div>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3 font-mono text-sm">
            {(proxyCfg?.setupGuide || []).map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[var(--color-text-tertiary)] select-none">$</span>
                <span className="flex-1">
                  {line
                    .replace(/\{proxyApiBase\}/g, "http://localhost:3001/proxy/v1")
                    .replace(/\{mappingId\}/g, mapping.id)
                    .replace(/\{proxyToken\}/g, proxyInfo.proxyToken)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
