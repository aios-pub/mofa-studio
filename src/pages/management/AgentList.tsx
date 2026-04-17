/**
 * Agent 列表页面 - 完整 CRUD 管理
 */

import { useState, useEffect, useCallback } from "react";
import {
  Input,
  Button,
  Dropdown,
  message,
  Tabs,
  Select,
  Form,
  Tag,
  InputNumber,
  Switch,
  Card,
  Space,
  Empty,
  Typography,
  Modal,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  RobotOutlined,
  SettingOutlined,
  SafetyOutlined,
  SaveOutlined,
  UndoOutlined,
  PlayCircleOutlined,
  ApiOutlined,
  LinkOutlined,
  CloudServerOutlined,
} from "@ant-design/icons";
import { agentApi, providerApi, promptApi, clawApi } from "@/services";
import type { Prompt } from "@/services";
import { FormModal, showDeleteConfirm, useFormError } from "@/components/common/Modal";
import { PermissionConfig } from "../../components/permission";
import {
  AgentPromptSelector,
  AgentSkillSelector,
  AgentTestSetSelector,
} from "../../components/agent";
import type { Agent, AgentPermission } from "../../types";
import type { ClawType, ClawStatus, ClawInstanceReq, ClawChannelMapping } from "@/types/claw";
import { clawTypeConfig } from "@/types/claw";
import OctosManagementPanel from "./components/octos/OctosManagementPanel";

// ==================== Avatar 选择器 ====================

const AVATAR_OPTIONS = [
  "🤖",
  "💻",
  "🌐",
  "📊",
  "✍️",
  "🎨",
  "📝",
  "🔬",
  "🎓",
  "💼",
  "🎯",
  "🧠",
  "🔮",
  "📡",
  "🛡️",
  "⚡",
  "🏗️",
  "🧪",
  "📈",
  "🎵",
];

const AvatarPicker = ({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (v: string) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {AVATAR_OPTIONS.map((emoji) => (
      <button
        key={emoji}
        type="button"
        onClick={() => onChange?.(emoji)}
        className={`w-9 h-9 flex items-center justify-center rounded-lg text-xl transition-all ${
          value === emoji
            ? "bg-[var(--color-primary)]/20 border-2 border-[var(--color-primary)] scale-110"
            : "bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
        }`}
      >
        {emoji}
      </button>
    ))}
  </div>
);

// ==================== 创建/编辑 Agent Modal ====================

interface AgentFormModalProps {
  open: boolean;
  agent?: Agent | null;
  onClose: () => void;
  onSuccess: () => void;
}

function AgentFormModal({
  open,
  agent,
  onClose,
  onSuccess,
}: AgentFormModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const { error, handleError, clearError } = useFormError(open);

  const isEdit = !!agent;

  useEffect(() => {
    if (open) {
      loadProviders();
    }
  }, [open]);

  const loadProviders = async () => {
    try {
      const data = await providerApi.getAll();
      setProviders(data);
    } catch (error) {
      console.error("Failed to load providers:", error);
    }
  };

  // 编辑时初始化表单
  useEffect(() => {
    if (open && agent) {
      form.setFieldsValue({
        name: agent.name,
        agentCode: agent.agentCode,
        avatar: agent.avatar || "🤖",
        providerId: agent.providerId,
        modelId: agent.modelId,
        temperature: agent.temperature ?? 0.7,
        stream: agent.stream ?? true,
        thinking: agent.thinking ?? false,
        enabled: agent.enabled,
      });
      setSelectedProviderId(agent.providerId);
      // 加载已有的提示词关联
      loadAgentPrompts(agent.id);
    } else if (open && !agent) {
      form.resetFields();
      setSelectedPrompts([]);
      form.setFieldsValue({
        avatar: "🤖",
        temperature: 0.7,
        stream: true,
        thinking: false,
        enabled: true,
      });
      setSelectedProviderId("");
    }
  }, [open, agent]);

  const loadAgentPrompts = async (agentId: string) => {
    try {
      const perm = await agentApi.getPermissions(agentId);
      if (perm) {
        setSelectedPrompts(perm.accessiblePrompts);
      }
    } catch (error) {
      console.error("Failed to load agent prompts:", error);
    }
  };

  // provider 变化时加载模型列表
  useEffect(() => {
    if (selectedProviderId) {
      const provider = providers.find((p) => p.id === selectedProviderId);
      setAvailableModels(provider?.models?.filter((m: any) => m.enabled) || []);
    } else {
      setAvailableModels([]);
    }
  }, [selectedProviderId, providers]);

  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);
    form.setFieldValue("modelId", undefined);
  };

  const handleModelChange = (modelId: string) => {
    const model = availableModels.find((m: any) => m.id === modelId);
    if (model) {
      form.setFieldValue("modelName", model.name);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (selectedPrompts.length === 0) {
        message.warning("请至少选择一个提示词");
        return;
      }

      setLoading(true);

      const provider = providers.find((p) => p.id === values.providerId);
      const model = provider?.models?.find((m: any) => m.id === values.modelId);

      const agentData: Partial<Agent> = {
        name: values.name,
        agentCode: values.agentCode,
        avatar: values.avatar,
        providerId: values.providerId,
        modelId: values.modelId,
        modelName: model?.name || values.modelId,
        providerName: provider?.name,
        temperature: values.temperature,
        stream: values.stream,
        thinking: values.thinking,
        enabled: values.enabled ?? true,
      };

      let savedAgent: Agent | undefined;
      if (isEdit) {
        savedAgent = await agentApi.update(agent!.id, agentData);
      } else {
        savedAgent = await agentApi.create(agentData);
      }

      // 保存提示词关联
      if (savedAgent) {
        try {
          const existingPerm = await agentApi.getPermissions(savedAgent.id);
          if (existingPerm) {
            await agentApi.updatePermissions(savedAgent.id, {
              ...existingPerm,
              accessiblePrompts: selectedPrompts,
            });
          } else {
            // 新 agent 没有 permission 记录，创建一条
            const newPerm: Partial<AgentPermission> = {
              agentId: savedAgent.id,
              features: {
                webSearch: false,
                webFetch: false,
                codeExec: false,
                fileRead: false,
                fileWrite: false,
                systemCommand: false,
                databaseAccess: false,
              },
              accessibleSkills: [],
              accessiblePrompts: selectedPrompts,
              dataScope: "self",
              allowSensitiveData: false,
              historyRetentionDays: 30,
            };
            await agentApi.updatePermissions(savedAgent.id, newPerm);
          }
        } catch (permError) {
          // 如果是新建的 agent，关联失败时回滚
          if (!isEdit && savedAgent) {
            try {
              await agentApi.delete(savedAgent.id);
            } catch {}
          }
          throw permError;
        }
      }

      message.success(isEdit ? "Agent 已更新" : "Agent 已创建");
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error("Failed to save agent:", error);
      handleError(error?.message || (isEdit ? "更新失败" : "创建失败"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal
      title={isEdit ? "编辑 Agent" : "创建 Agent"}
      open={open}
      onCancel={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      width={720}
      destroyOnHidden
      error={error}
      onClearError={clearError}
    >
      <Form form={form} layout="vertical" className="space-y-1">
        <Form.Item name="avatar" label="头像">
          <AvatarPicker />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input placeholder="例如：通用助手" maxLength={50} showCount />
          </Form.Item>

          <Form.Item
            name="agentCode"
            label="编码"
            rules={[
              { required: true, message: "请输入编码" },
              {
                pattern: /^[a-zA-Z0-9_-]+$/,
                message: "仅支持英文、数字、下划线和横线",
              },
            ]}
          >
            <Input placeholder="例如：general_assistant" maxLength={50} />
          </Form.Item>
        </div>

        <Form.Item label="关联提示词" required>
          <AgentPromptSelector
            selectedPrompts={selectedPrompts}
            onChange={setSelectedPrompts}
            maxHeight={240}
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="providerId"
            label="模型供应商"
            rules={[{ required: true, message: "请选择供应商" }]}
          >
            <Select
              placeholder="选择供应商"
              onChange={handleProviderChange}
              options={providers
                .filter((p) => p.status === "active")
                .map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>

          <Form.Item
            name="modelId"
            label="模型"
            rules={[{ required: true, message: "请选择模型" }]}
          >
            <Select
              placeholder={selectedProviderId ? "选择模型" : "请先选择供应商"}
              disabled={!selectedProviderId}
              onChange={handleModelChange}
              options={availableModels.map((m: any) => ({
                label: `${m.name} (${m.maxTokens?.toLocaleString() || "-"} tokens)`,
                value: m.id,
              }))}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Form.Item name="temperature" label="温度">
            <InputNumber min={0} max={2} step={0.1} className="w-full" />
          </Form.Item>

          <Form.Item name="stream" label="流式输出" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="thinking" label="思考模式" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
      </Form>
    </FormModal>
  );
}

// ==================== Agent 基本信息（可编辑）====================

function AgentBasicInfo({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [linkedPromptNames, setLinkedPromptNames] = useState<string[]>([]);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    setSelectedProviderId(agent.providerId);
    loadLinkedPromptNames();
  }, [agent.providerId, agent.id]);

  useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        name: agent.name,
        agentCode: agent.agentCode,
        avatar: agent.avatar || "🤖",
        providerId: agent.providerId,
        modelId: agent.modelId,
        temperature: agent.temperature ?? 0.7,
        stream: agent.stream ?? true,
        thinking: agent.thinking ?? false,
        enabled: agent.enabled,
      });
      loadEditPrompts(agent.id);
    }
  }, [editing, agent]);

  const loadLinkedPromptNames = async () => {
    try {
      const perm = await agentApi.getPermissions(agent.id);
      if (perm?.accessiblePrompts.length) {
        const allPrompts: Prompt[] = await promptApi.getAll();
        const names = perm.accessiblePrompts
          .map((id) => allPrompts.find((p: Prompt) => p.id === id)?.name)
          .filter(Boolean) as string[];
        setLinkedPromptNames(names);
      } else {
        setLinkedPromptNames([]);
      }
    } catch {
      setLinkedPromptNames([]);
    }
  };

  const loadEditPrompts = async (agentId: string) => {
    try {
      const perm = await agentApi.getPermissions(agentId);
      if (perm) {
        setSelectedPrompts(perm.accessiblePrompts);
      }
    } catch (error) {
      console.error("Failed to load agent prompts:", error);
    }
  };

  useEffect(() => {
    if (selectedProviderId) {
      const provider = providers.find((p) => p.id === selectedProviderId);
      setAvailableModels(provider?.models?.filter((m: any) => m.enabled) || []);
    } else {
      setAvailableModels([]);
    }
  }, [selectedProviderId, providers]);

  const loadProviders = async () => {
    try {
      const data = await providerApi.getAll();
      setProviders(data);
    } catch (error) {
      console.error("Failed to load providers:", error);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const provider = providers.find((p) => p.id === values.providerId);
      const model = provider?.models?.find((m: any) => m.id === values.modelId);

      await agentApi.update(agent.id, {
        name: values.name,
        agentCode: values.agentCode,
        avatar: values.avatar,
        providerId: values.providerId,
        modelId: values.modelId,
        modelName: model?.name || values.modelId,
        providerName: provider?.name,
        temperature: values.temperature,
        stream: values.stream,
        thinking: values.thinking,
        enabled: values.enabled,
      });

      // 保存提示词关联
      const existingPerm = await agentApi.getPermissions(agent.id);
      if (existingPerm) {
        await agentApi.updatePermissions(agent.id, {
          ...existingPerm,
          accessiblePrompts: selectedPrompts,
        });
      }

      message.success("保存成功");
      setEditing(false);
      onUpdate();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error("Failed to save:", error);
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    form.resetFields();
  };

  const getProviderName = (id: string) =>
    providers.find((p) => p.id === id)?.name || agent.providerName || id;
  const getModelName = (providerId: string, modelId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return (
      provider?.models?.find((m: any) => m.id === modelId)?.name ||
      agent.modelName ||
      modelId
    );
  };

  const statusLabels: Record<string, { text: string; color: string }> = {
    idle: { text: "空闲", color: "green" },
    thinking: { text: "思考中", color: "gold" },
    tool: { text: "使用工具", color: "blue" },
    waiting: { text: "等待中", color: "orange" },
    error: { text: "错误", color: "red" },
    offline: { text: "离线", color: "default" },
  };

  const currentStatus = agent.status || (agent.enabled ? "idle" : "offline");

  if (editing) {
    return (
      <div className="space-y-4">
        <Form form={form} layout="vertical" className="space-y-1">
          <Form.Item name="avatar" label="头像">
            <AvatarPicker />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label="名称"
              rules={[{ required: true, message: "请输入名称" }]}
            >
              <Input maxLength={50} showCount />
            </Form.Item>
            <Form.Item
              name="agentCode"
              label="编码"
              rules={[
                { required: true, message: "请输入编码" },
                {
                  pattern: /^[a-zA-Z0-9_-]+$/,
                  message: "仅支持英文、数字、下划线和横线",
                },
              ]}
            >
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item
              name="providerId"
              label="供应商"
              rules={[{ required: true }]}
            >
              <Select
                onChange={(v) => {
                  setSelectedProviderId(v);
                  form.setFieldValue("modelId", undefined);
                }}
                options={providers
                  .filter((p) => p.status === "active")
                  .map((p) => ({ label: p.name, value: p.id }))}
              />
            </Form.Item>
            <Form.Item name="modelId" label="模型" rules={[{ required: true }]}>
              <Select
                options={availableModels.map((m: any) => ({
                  label: m.name,
                  value: m.id,
                }))}
              />
            </Form.Item>
            <Form.Item name="temperature" label="温度">
              <InputNumber min={0} max={2} step={0.1} className="w-full" />
            </Form.Item>
            <div className="flex items-end gap-4">
              <Form.Item
                name="stream"
                label="流式输出"
                valuePropName="checked"
                className="mb-0"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name="thinking"
                label="思考模式"
                valuePropName="checked"
                className="mb-0"
              >
                <Switch />
              </Form.Item>
            </div>
          </div>

          <Form.Item label="关联提示词" required>
            <AgentPromptSelector
              agentId={agent.id}
              selectedPrompts={selectedPrompts}
              onChange={setSelectedPrompts}
            />
          </Form.Item>
        </Form>

        <div className="flex justify-end gap-2">
          <Button icon={<UndoOutlined />} onClick={handleCancel}>
            取消
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
          >
            保存
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => setEditing(true)}
        >
          编辑
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            名称
          </label>
          <Input value={agent.name} readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            编码
          </label>
          <Input value={agent.agentCode} readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            状态
          </label>
          <div className="flex items-center gap-2 h-8">
            <Tag color={agent.enabled ? "green" : "red"}>
              {agent.enabled ? "已启用" : "已禁用"}
            </Tag>
            <Tag color={statusLabels[currentStatus]?.color}>
              {statusLabels[currentStatus]?.text}
            </Tag>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            模型
          </label>
          <Input
            value={getModelName(agent.providerId, agent.modelId)}
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            供应商
          </label>
          <Input value={getProviderName(agent.providerId)} readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            温度
          </label>
          <Input value={agent.temperature ?? "-"} readOnly />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          关联提示词
        </label>
        {linkedPromptNames.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-1">
            {linkedPromptNames.map((name) => (
              <Tag key={name} color="blue">
                {name}
              </Tag>
            ))}
          </div>
        ) : (
          <span className="text-[var(--color-text-tertiary)]">暂未关联</span>
        )}
      </div>

      <div className="text-xs text-[var(--color-text-tertiary)]">
        {agent.createdAt &&
          `创建时间: ${new Date(agent.createdAt).toLocaleString()} `}
        {agent.updatedAt &&
          `| 更新时间: ${new Date(agent.updatedAt).toLocaleString()}`}
      </div>
    </div>
  );
}

// ==================== Agent 关联提示词 ====================

function AgentPromptsTab({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: () => void;
}) {
  const [permission, setPermission] = useState<AgentPermission | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPermission();
  }, [agent.id]);

  const loadPermission = async () => {
    try {
      const perm = await agentApi.getPermissions(agent.id);
      setPermission(perm || null);
    } catch (error) {
      console.error("Failed to load permission:", error);
    }
  };

  const handleChange = async (prompts: string[]) => {
    if (!permission) return;
    setSaving(true);
    try {
      await agentApi.updatePermissions(agent.id, {
        ...permission,
        accessiblePrompts: prompts,
      });
      setPermission({ ...permission, accessiblePrompts: prompts });
      message.success("提示词关联已保存");
      onUpdate();
    } catch (error) {
      console.error("Failed to save prompts:", error);
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!permission) {
    return (
      <div className="text-center py-8 text-[var(--color-text-tertiary)]">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
          关联提示词
        </h4>
        {saving && (
          <span className="text-xs text-[var(--color-text-tertiary)]">
            保存中...
          </span>
        )}
      </div>
      <AgentPromptSelector
        agentId={agent.id}
        selectedPrompts={permission.accessiblePrompts}
        onChange={handleChange}
      />
    </div>
  );
}

// ==================== Agent 关联 Skills ====================

function AgentSkillsTab({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: () => void;
}) {
  const [permission, setPermission] = useState<AgentPermission | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPermission();
  }, [agent.id]);

  const loadPermission = async () => {
    try {
      const perm = await agentApi.getPermissions(agent.id);
      setPermission(perm || null);
    } catch (error) {
      console.error("Failed to load permission:", error);
    }
  };

  const handleChange = async (skills: string[]) => {
    if (!permission) return;
    setSaving(true);
    try {
      await agentApi.updatePermissions(agent.id, {
        ...permission,
        accessibleSkills: skills,
      });
      setPermission({ ...permission, accessibleSkills: skills });
      message.success("Skills 关联已保存");
      onUpdate();
    } catch (error) {
      console.error("Failed to save skills:", error);
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!permission) {
    return (
      <div className="text-center py-8 text-[var(--color-text-tertiary)]">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
          关联 Skills
        </h4>
        {saving && (
          <span className="text-xs text-[var(--color-text-tertiary)]">
            保存中...
          </span>
        )}
      </div>
      <AgentSkillSelector
        agentId={agent.id}
        selectedSkills={permission.accessibleSkills}
        onChange={handleChange}
      />
    </div>
  );
}

// ==================== Agent 关联测试集 ====================

function AgentTestSetsTab({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: () => void;
}) {
  const [selectedTestSets, setSelectedTestSets] = useState<string[]>([]);

  useEffect(() => {
    // TODO: 后端增加 accessibleTestSets 字段后从 permission 加载
    setSelectedTestSets([]);
  }, [agent.id]);

  const handleChange = (testSetIds: string[]) => {
    setSelectedTestSets(testSetIds);
    onUpdate();
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
        关联测试集
      </h4>
      <AgentTestSetSelector
        agentId={agent.id}
        selectedTestSets={selectedTestSets}
        onChange={handleChange}
      />
    </div>
  );
}

// ==================== Agent 详情 ====================

function AgentDetail({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "basic" | "permission" | "prompts" | "skills" | "tests"
  >("basic");
  const [linkedPromptNames, setLinkedPromptNames] = useState<string[]>([]);

  useEffect(() => {
    const loadNames = async () => {
      try {
        const perm = await agentApi.getPermissions(agent.id);
        if (perm?.accessiblePrompts.length) {
          const allPrompts: Prompt[] = await promptApi.getAll();
          const names = perm.accessiblePrompts
            .map((id) => allPrompts.find((p: Prompt) => p.id === id)?.name)
            .filter(Boolean) as string[];
          setLinkedPromptNames(names);
        } else {
          setLinkedPromptNames([]);
        }
      } catch {
        setLinkedPromptNames([]);
      }
    };
    loadNames();
  }, [agent.id]);

  const tabs = [
    { key: "basic", label: "基本信息", icon: RobotOutlined },
    { key: "permission", label: "权限配置", icon: SafetyOutlined },
    { key: "prompts", label: "关联提示词", icon: EditOutlined },
    { key: "skills", label: "关联 Skills", icon: SettingOutlined },
    { key: "tests", label: "关联测试集", icon: PlayCircleOutlined },
  ];

  return (
    <div className="p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="text-4xl">{agent.avatar || "🤖"}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {agent.name}
            </h2>
            <Tag color={agent.enabled ? "green" : "red"}>
              {agent.enabled ? "已启用" : "已禁用"}
            </Tag>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {linkedPromptNames.length > 0 ? (
              linkedPromptNames.map((name) => (
                <Tag key={name} color="blue">
                  {name}
                </Tag>
              ))
            ) : (
              <span className="text-[var(--color-text-tertiary)]">
                暂未关联提示词
              </span>
            )}
          </div>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        items={tabs.map((tab) => ({
          key: tab.key,
          label: (
            <span className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </span>
          ),
        }))}
      />

      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
        {activeTab === "basic" && (
          <AgentBasicInfo agent={agent} onUpdate={onUpdate} />
        )}
        {activeTab === "permission" && <AgentPermissionTab agent={agent} />}
        {activeTab === "prompts" && (
          <AgentPromptsTab agent={agent} onUpdate={onUpdate} />
        )}
        {activeTab === "skills" && (
          <AgentSkillsTab agent={agent} onUpdate={onUpdate} />
        )}
        {activeTab === "tests" && (
          <AgentTestSetsTab agent={agent} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  );
}

// 权限标签页
function AgentPermissionTab({ agent }: { agent: Agent }) {
  return (
    <PermissionConfig
      agentId={agent.id}
      agentName={agent.name}
      onSave={() => {}}
    />
  );
}

// ==================== 主页面 ====================

export default function AgentListPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [clawCreateOpen, setClawCreateOpen] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agentApi.getAll();
      setAgents(data);
      if (selectedAgent) {
        const updated = data.find((a: Agent) => a.id === selectedAgent.id);
        setSelectedAgent(updated || null);
      }
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  useEffect(() => {
    loadAgents();
  }, []);

  const handleDelete = (agent: Agent) => {
    showDeleteConfirm({
      title: "确认删除 Agent",
      content: (
        <div>
          <p>
            确定要删除 Agent <strong>{agent.name}</strong> 吗？
          </p>
          <p className="mt-1 text-[var(--color-text-tertiary)]">
            此操作不可恢复。
          </p>
        </div>
      ),
      onOk: async () => {
        try {
          await agentApi.delete(agent.id);
          setAgents((prev) => prev.filter((a) => a.id !== agent.id));
          if (selectedAgent?.id === agent.id) {
            setSelectedAgent(null);
          }
          message.success("Agent 已删除");
        } catch (error) {
          console.error("Failed to delete agent:", error);
          message.error("删除失败");
        }
      },
    });
  };

  const handleDuplicate = async (agent: Agent) => {
    try {
      const newAgent = await agentApi.create({
        name: `${agent.name} (副本)`,
        agentCode: `${agent.agentCode}_copy`,
        avatar: agent.avatar,
        modelId: agent.modelId,
        modelName: agent.modelName,
        providerId: agent.providerId,
        providerName: agent.providerName,
        temperature: agent.temperature,
        stream: agent.stream,
        thinking: agent.thinking,
      });

      // 复制提示词和技能关联
      const sourcePerm = await agentApi.getPermissions(agent.id);
      if (sourcePerm && newAgent) {
        const newPerm = await agentApi.getPermissions(newAgent.id);
        await agentApi.updatePermissions(newAgent.id, {
          ...newPerm,
          accessiblePrompts: sourcePerm.accessiblePrompts,
          accessibleSkills: sourcePerm.accessibleSkills,
        });
      }

      setAgents((prev) => [...prev, newAgent]);
      message.success("Agent 已复制");
    } catch (error: any) {
      console.error("Failed to duplicate agent:", error);
      message.error(error?.message || "复制失败");
    }
  };

  const handleOpenCreate = () => {
    setEditingAgent(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadAgents();
  };

  const getActionMenuItems = (agent: Agent) => [
    {
      key: "edit",
      label: "编辑",
      icon: <EditOutlined />,
      onClick: () => handleOpenEdit(agent),
    },
    {
      key: "copy",
      label: "复制",
      icon: <CopyOutlined />,
      onClick: () => handleDuplicate(agent),
    },
    { type: "divider" as const },
    {
      key: "delete",
      label: "删除",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(agent),
    },
  ];

  const filteredAgents = agents.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.agentCode || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "all" || a.agentType === typeFilter;
    return matchSearch && matchType;
  });

  const statusColors: Record<string, string> = {
    idle: "bg-green-500",
    thinking: "bg-yellow-500",
    tool: "bg-blue-500",
    waiting: "bg-orange-500",
    error: "bg-red-500",
    offline: "bg-gray-400",
  };

  // Claw status colors for list display
  const clawStatusDot: Record<string, string> = {
    online: "bg-green-500",
    offline: "bg-red-500",
    degraded: "bg-orange-500",
    unknown: "bg-gray-400",
  };

  const isClawAgent = (agent: Agent) => agent.agentType && agent.agentType !== 'native';

  // Create button dropdown items
  const createMenuItems = [
    { key: 'native', label: 'Native Agent', icon: <RobotOutlined /> },
    { type: 'divider' as const },
    ...(Object.entries(clawTypeConfig) as [ClawType, typeof clawTypeConfig[ClawType]][]).map(
      ([type, cfg]) => ({
        key: type,
        label: cfg.label,
        icon: <span>{cfg.icon}</span>,
      })
    ),
  ];

  const handleCreateMenu = ({ key }: { key: string }) => {
    if (key === 'native') {
      handleOpenCreate();
    } else {
      setClawCreateOpen(true);
    }
  };

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Agent 管理
            </h2>
            <Dropdown
              menu={{ items: createMenuItems, onClick: handleCreateMenu }}
              trigger={['click']}
            >
              <Button type="primary" icon={<PlusOutlined />} />
            </Dropdown>
          </div>
          <Input
            placeholder="搜索 Agent..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            className="w-full"
            options={[
              { label: '全部', value: 'all' },
              { label: 'Native Agent', value: 'native' },
              ...Object.entries(clawTypeConfig).map(([type, cfg]) => ({
                label: `${cfg.icon} ${cfg.label}`,
                value: type,
              })),
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              加载中...
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <RobotOutlined className="text-3xl mb-2 opacity-50" />
              <p>{searchQuery || typeFilter !== 'all' ? "无匹配结果" : "暂无 Agent"}</p>
              {!searchQuery && typeFilter === 'all' && (
                <Button
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={handleOpenCreate}
                >
                  创建第一个 Agent
                </Button>
              )}
            </div>
          ) : (
            filteredAgents.map((agent) => {
              const clawConfig = isClawAgent(agent) ? clawTypeConfig[agent.agentType as ClawType] : null;
              const icon = clawConfig?.icon || agent.avatar || "🤖";
              const statusDot = isClawAgent(agent)
                ? clawStatusDot[agent.clawStatus || 'unknown']
                : statusColors[agent.status || (agent.enabled ? "idle" : "offline")];

              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedAgent?.id === agent.id
                      ? "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30"
                      : "hover:bg-[var(--color-bg-tertiary)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-text-primary)] truncate">
                          {agent.name}
                        </span>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {clawConfig ? (
                          <Tag color={clawConfig.color} className="text-xs leading-tight px-1">
                            {clawConfig.label}
                          </Tag>
                        ) : null}
                        <p className="text-sm text-[var(--color-text-tertiary)] truncate">
                          {agent.modelName || agent.agentCode}
                        </p>
                      </div>
                    </div>
                    <Dropdown
                      menu={{ items: getActionMenuItems(agent) }}
                      trigger={["click"]}
                      placement="bottomRight"
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<MoreOutlined />}
                        className="opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Dropdown>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto">
        {selectedAgent ? (
          isClawAgent(selectedAgent) ? (
            <ClawAgentDetail
              key={selectedAgent.id}
              agent={selectedAgent}
              onUpdate={loadAgents}
            />
          ) : (
            <AgentDetail
              key={selectedAgent.id}
              agent={selectedAgent}
              onUpdate={loadAgents}
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RobotOutlined className="text-5xl text-[var(--color-text-tertiary)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                选择一个 Agent
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                从左侧列表中选择查看详情
              </p>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="mt-4"
                onClick={handleOpenCreate}
              >
                创建 Agent
              </Button>
            </div>
          </div>
        )}
      </div>

      <AgentFormModal
        open={modalOpen}
        agent={editingAgent}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <ClawCreateModal
        open={clawCreateOpen}
        onClose={() => setClawCreateOpen(false)}
        onSuccess={() => { setClawCreateOpen(false); loadAgents(); }}
      />
    </div>
  );
}

// ==================== Claw Agent 详情（claw 类型 Agent 的详情面板）====================

function ClawAgentDetail({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"basic" | "connection" | "channel" | "octos">("basic");
  const [mappings, setMappings] = useState<ClawChannelMapping[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  const clawType = agent.agentType as ClawType;
  const config = clawTypeConfig[clawType];

  useEffect(() => {
    if (agent.clawInstanceId) {
      clawApi.listChannelMappings(agent.clawInstanceId!).then(setMappings).catch(() => {});
    }
  }, [agent.clawInstanceId]);

  const handleTest = async () => {
    if (!agent.clawInstanceId) return;
    try {
      const result = await clawApi.test(agent.clawInstanceId);
      message.success(result ? "连接成功" : "连接失败");
    } catch {
      message.error("测试失败");
    }
  };

  const handleDelete = () => {
    showDeleteConfirm({
      title: "删除 Agent",
      content: `确定要删除 ${agent.name} 吗？此操作不可恢复。`,
      onOk: async () => {
        await agentApi.delete(agent.id);
        message.success("已删除");
        onUpdate();
      },
    });
  };

  const tabs = [
    { key: "basic", label: "基本信息", icon: RobotOutlined },
    { key: "connection", label: "连接信息", icon: LinkOutlined },
    ...(agent.clawInstanceId ? [{ key: "channel" as const, label: "渠道代理", icon: CloudServerOutlined }] : []),
    ...(clawType === "octos" ? [{ key: "octos" as const, label: "Octos 管理", icon: ApiOutlined }] : []),
  ];

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{config?.icon || "🤖"}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {agent.name}
              </h2>
              <Tag color={config?.color}>{config?.label}</Tag>
              <Tag color={agent.enabled ? "green" : "red"}>
                {agent.enabled ? "已启用" : "已禁用"}
              </Tag>
              {agent.clawStatus && (
                <Tag color={agent.clawStatus === "online" ? "green" : agent.clawStatus === "offline" ? "red" : "default"}>
                  {agent.clawStatus === "online" ? "在线" : agent.clawStatus === "offline" ? "离线" : agent.clawStatus}
                </Tag>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
              {agent.modelName} · {agent.providerName}
            </p>
          </div>
        </div>
        <Space>
          <Button icon={<LinkOutlined />} onClick={() => setConnectOpen(true)}>
            连接信息
          </Button>
          <Button icon={<ApiOutlined />} onClick={handleTest}>
            测试连接
          </Button>
          <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
            编辑
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            删除
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        items={tabs.map((tab) => ({
          key: tab.key,
          label: (
            <span className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </span>
          ),
        }))}
      />

      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
        {activeTab === "basic" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">名称</label>
              <Input value={agent.name} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">编码</label>
              <Input value={agent.agentCode} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">类型</label>
              <Input value={config?.label || clawType} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">版本</label>
              <Input value={agent.clawVersion || "-"} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">供应商</label>
              <Input value={agent.providerName || "-"} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">模型</label>
              <Input value={agent.modelName || "-"} readOnly />
            </div>
            {agent.endpointUrl && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">端点地址</label>
                <Input value={agent.endpointUrl} readOnly />
              </div>
            )}
          </div>
        )}

        {activeTab === "connection" && (
          <div className="space-y-4">
            <Card size="small" title="LLM 代理配置">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Typography.Text type="secondary">代理地址</Typography.Text>
                  <Typography.Text code>http://localhost:3001/proxy/v1</Typography.Text>
                </div>
                <div className="flex justify-between">
                  <Typography.Text type="secondary">模式</Typography.Text>
                  <Typography.Text>{config?.mode === "server" ? "Server 模式" : "CLI 模式"}</Typography.Text>
                </div>
              </div>
            </Card>
            <Card size="small" title="环境变量配置">
              <div className="bg-[var(--color-bg-base)] rounded-lg p-3 font-mono text-sm">
                {(config?.setupGuide || []).map((line, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[var(--color-text-tertiary)] select-none">$</span>
                    <span className="flex-1">{line}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "channel" && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">已分配渠道</h4>
            {mappings.length === 0 ? (
              <Empty description="暂无渠道代理" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              mappings.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Typography.Text strong>{m.channelName || m.remoteChannelId}</Typography.Text>
                      <Tag>{m.remoteChannelType}</Tag>
                    </div>
                    <Space size="small">
                      <Button
                        size="small"
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={async () => {
                          await clawApi.unassignChannel(m.id);
                          onUpdate();
                        }}
                      >
                        移除
                      </Button>
                    </Space>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "octos" && clawType === "octos" && agent.clawInstanceId && (
          <OctosManagementPanel claw={{
            id: agent.clawInstanceId,
            agentId: agent.id,
            instanceName: agent.name,
            clawType,
            status: (agent.clawStatus || 'unknown') as ClawStatus,
            enabled: agent.enabled,
            tenantId: '',
            createTime: '',
            updateTime: '',
            providerId: agent.providerId,
            providerName: agent.providerName,
            modelId: agent.modelId,
            modelName: agent.modelName,
          }} />
        )}
      </div>

      {agent.clawInstanceId && (
        <ClawEditModal
          open={editOpen}
          agent={agent}
          onClose={() => setEditOpen(false)}
          onSuccess={() => { setEditOpen(false); onUpdate(); }}
        />
      )}

      <ConnectionGuideDialog
        open={connectOpen}
        agent={agent}
        onClose={() => setConnectOpen(false)}
      />
    </div>
  );
}

// ==================== Claw Create Modal ====================

function ClawCreateModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<ClawType | null>(null);

  useEffect(() => {
    if (open) {
      providerApi.getAll().then(setProviders).catch(() => {});
    }
  }, [open]);

  const clawCfg = selectedType ? clawTypeConfig[selectedType] : null;

  const handleProviderChange = async (providerId: string) => {
    form.setFieldValue("modelId", undefined);
    try {
      const prov = await providerApi.getById(providerId);
      setModels(prov.models || []);
    } catch {
      setModels([]);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const payload: ClawInstanceReq = {
        instanceName: values.instanceName,
        clawType: selectedType!,
        version: values.version,
        endpointUrl: values.endpointUrl,
        authConfig: values.authToken ? { authToken: values.authToken } : undefined,
        providerId: values.providerId,
        modelId: values.modelId,
        enabled: values.enabled ?? true,
      };
      const result = await clawApi.create(payload);
      message.success("Claw Agent 创建成功");
      onSuccess(result);
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error("创建失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="创建 Claw Agent"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      width={600}
      okText="创建"
      confirmLoading={loading}
      destroyOnHidden
    >
      <div className="mb-4">
        <Typography.Text strong className="block mb-2">选择类型</Typography.Text>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(clawTypeConfig) as [ClawType, typeof clawTypeConfig[ClawType]][]).map(
            ([type, cfg]) => (
              <div
                key={type}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all w-28 text-center ${
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
                <div className="font-medium text-xs">{cfg.label}</div>
              </div>
            ),
          )}
        </div>
      </div>
      <Form form={form} layout="vertical" initialValues={{ enabled: true }}>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="instanceName" label="实例名称" rules={[{ required: true, message: "请输入名称" }]}>
            <Input placeholder={`如：生产环境 ${clawCfg?.label || "Claw"}`} />
          </Form.Item>
          <Form.Item name="version" label="版本">
            <Input placeholder="1.0.0（可选）" />
          </Form.Item>
        </div>
        {clawCfg?.mode === "server" && (
          <Form.Item name="endpointUrl" label="端点地址">
            <Input placeholder="http://localhost:8080" />
          </Form.Item>
        )}
        {selectedType === "octos" && (
          <Form.Item name="authToken" label="Auth Token" rules={[{ required: true, message: "请输入 Auth Token" }]}>
            <Input.Password placeholder="Octos 服务启动时的 auth-token" />
          </Form.Item>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="providerId" label="供应商" rules={[{ required: true, message: "请选择供应商" }]}>
            <Select
              placeholder="选择供应商"
              onChange={handleProviderChange}
              options={providers.map((p: any) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="modelId" label="模型" rules={[{ required: true, message: "请选择模型" }]}>
            <Select
              placeholder="选择模型"
              options={models.map((m: any) => ({ label: m.name, value: m.id }))}
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

// ==================== Claw Edit Modal ====================

function ClawEditModal({
  open,
  agent,
  onClose,
  onSuccess,
}: {
  open: boolean;
  agent: Agent;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      providerApi.getAll().then(setProviders).catch(() => {});
      form.setFieldsValue({
        instanceName: agent.name,
        version: agent.clawVersion,
        endpointUrl: agent.endpointUrl,
        providerId: agent.providerId,
        modelId: agent.modelId,
        enabled: agent.enabled,
      });
      if (agent.providerId) {
        providerApi.getById(agent.providerId).then((prov: any) => {
          setModels(prov.models || []);
        }).catch(() => setModels([]));
      }
    }
  }, [open, agent, form]);

  const handleProviderChange = async (providerId: string) => {
    form.setFieldValue("modelId", undefined);
    try {
      const prov = await providerApi.getById(providerId);
      setModels(prov.models || []);
    } catch {
      setModels([]);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await clawApi.update({
        id: agent.clawInstanceId,
        instanceName: values.instanceName,
        clawType: agent.agentType as ClawType,
        version: values.version,
        endpointUrl: values.endpointUrl,
        providerId: values.providerId,
        modelId: values.modelId,
        enabled: values.enabled,
      });
      message.success("更新成功");
      onSuccess();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error("更新失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="编辑 Claw Agent"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      width={600}
      okText="保存"
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="instanceName" label="实例名称" rules={[{ required: true }]}>
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
              onChange={handleProviderChange}
              options={providers.map((p: any) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item name="modelId" label="模型" rules={[{ required: true }]}>
            <Select options={models.map((m: any) => ({ label: m.name, value: m.id }))} />
          </Form.Item>
        </div>
        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ==================== Connection Guide Dialog ====================

function ConnectionGuideDialog({
  open,
  agent,
  onClose,
}: {
  open: boolean;
  agent: Agent;
  onClose: () => void;
}) {
  const config = clawTypeConfig[agent.agentType as ClawType];
  const proxyBase = "http://localhost:3001/proxy/v1";

  return (
    <Modal
      title="连接信息"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={600}
    >
      <div className="space-y-4">
        <Card size="small" title="LLM 代理配置">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Typography.Text type="secondary">API Base</Typography.Text>
              <div className="flex items-center gap-2">
                <Typography.Text code>{proxyBase}</Typography.Text>
                <Button size="small" icon={<CopyOutlined />} onClick={() => {
                  navigator.clipboard.writeText(proxyBase);
                  message.success("已复制");
                }} />
              </div>
            </div>
          </div>
        </Card>
        <div className="mb-2">
          <Typography.Text strong>环境变量配置</Typography.Text>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3 font-mono text-sm">
          {(config?.setupGuide || []).map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[var(--color-text-tertiary)] select-none">$</span>
              <span className="flex-1">{line}</span>
              <CopyOutlined
                className="cursor-pointer text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)]"
                onClick={() => {
                  navigator.clipboard.writeText(line);
                  message.success("已复制");
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
