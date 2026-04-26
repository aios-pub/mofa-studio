/**
 * Agent 列表页面 - 完整 CRUD 管理
 */

import { useState, useEffect, useCallback } from "react";
import {
  Input,
  Button,
  Dropdown,
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
  App,
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
import {
  agentApi,
  providerApi,
  promptApi,
  clawApi,
  channelApi,
} from "@/services";
import type { Prompt } from "@/services";
import {
  FormModal,
  showDeleteConfirm,
  useFormError,
} from "@/components/common/Modal";
import { PermissionConfig } from "../../components/permission";
import {
  AgentPromptSelector,
  AgentSkillSelector,
  AgentTestSetSelector,
} from "../../components/agent";
import type { Agent, AgentPermission } from "../../types";
import type { ClawType, ClawChannelMapping } from "@/types/claw";
import { clawTypeConfig, channelProxyTypeConfig } from "@/types/claw";
import { channelTypeConfig } from "@/services/mock/channels";
import OctosManagementPanel from "./components/octos/OctosManagementPanel";
import ResizableSidebar from "@/components/layout/ResizableSidebar";

/** 从 agent.custom_params.claw 提取 Agent 类型配置 */
function getClaw(agent: Agent): Record<string, unknown> {
  return (
    ((agent.custom_params as Record<string, unknown>)?.claw as Record<
      string,
      unknown
    >) || {}
  );
}
function clawVal(agent: Agent, key: string): string | undefined {
  const v = getClaw(agent)[key];
  return typeof v === "string" ? v : undefined;
}

// ==================== 自定义参数编辑器（JSON 可视化）===================

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

/** 获取 JSON 值的类型标签 */
function jsonTypeOf(v: JsonValue): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v; // string | number | boolean | object
}

const TYPE_COLOR: Record<string, string> = {
  string: "green",
  number: "blue",
  boolean: "orange",
  null: "default",
  object: "purple",
  array: "cyan",
};

const TYPE_OPTIONS = [
  { label: "字符串", value: "string" },
  { label: "数字", value: "number" },
  { label: "布尔", value: "boolean" },
  { label: "空值", value: "null" },
  { label: "对象", value: "object" },
  { label: "数组", value: "array" },
];

/** 将任意 JSON 值转为指定类型的默认值 */
function castType(val: JsonValue, targetType: string): JsonValue {
  if (targetType === "string")
    return typeof val === "string" ? val : String(val ?? "");
  if (targetType === "number") {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }
  if (targetType === "boolean") return !!val;
  if (targetType === "null") return null;
  if (targetType === "array") return Array.isArray(val) ? val : [];
  // object
  if (val && typeof val === "object" && !Array.isArray(val)) return val;
  return {};
}

/** 单行值编辑器：根据当前类型渲染合适的输入控件 */
function ValueInput({
  value,
  onChange,
  compact,
}: {
  value: JsonValue;
  onChange: (v: JsonValue) => void;
  compact?: boolean;
}) {
  const t = jsonTypeOf(value);
  if (t === "string")
    return (
      <Input
        size="small"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        placeholder="字符串值"
        className={compact ? "flex-1" : "w-full"}
      />
    );
  if (t === "number")
    return (
      <InputNumber
        size="small"
        value={value as number}
        onChange={(v) => onChange(v ?? 0)}
        className={compact ? "flex-1" : "w-full"}
      />
    );
  if (t === "boolean")
    return (
      <Switch
        size="small"
        checked={value as boolean}
        onChange={(v) => onChange(v)}
      />
    );
  // null / object / array — 不可在此行内编辑，交给子节点
  return (
    <Typography.Text type="secondary" className="text-xs">
      {t === "null"
        ? "null"
        : t === "array"
          ? `[${(value as JsonValue[]).length} 项]`
          : `{${Object.keys(value as object).length} 项}`}
    </Typography.Text>
  );
}

/** 递归节点：渲染一个 key-value 对，对象/数组可展开子节点 */
function JsonNode({
  path,
  keyName,
  value,
  depth,
  root,
  onChange,
  onRemove,
}: {
  path: string[];
  keyName: string;
  value: JsonValue;
  depth: number;
  root?: boolean;
  onChange: (path: string[], val: JsonValue) => void;
  onRemove: (path: string[]) => void;
}) {
  const t = jsonTypeOf(value);
  const isContainer = t === "object" || t === "array";
  const [expanded, setExpanded] = useState(depth < 1);
  const entries = isContainer
    ? t === "object"
      ? Object.entries(value as Record<string, JsonValue>)
      : (value as JsonValue[]).map(
          (v, i) => [String(i), v] as [string, JsonValue],
        )
    : [];

  const handleAddChild = () => {
    if (t === "object") {
      const obj = { ...(value as Record<string, JsonValue>) };
      let newKey = "key";
      let n = 1;
      while (newKey in obj) {
        newKey = `key${n}`;
        n++;
      }
      obj[newKey] = "";
      onChange(path, obj);
      if (!expanded) setExpanded(true);
    } else if (t === "array") {
      onChange(path, [...(value as JsonValue[]), ""]);
      if (!expanded) setExpanded(true);
    }
  };

  const handleChildChange = (childPath: string[], val: JsonValue) => {
    if (t === "object") {
      onChange(path, {
        ...(value as Record<string, JsonValue>),
        [childPath[childPath.length - 1]]: val,
      });
    } else {
      const arr = [...(value as JsonValue[])];
      arr[Number(childPath[childPath.length - 1])] = val;
      onChange(path, arr);
    }
  };

  const handleChildRemove = (childPath: string[]) => {
    if (t === "object") {
      const obj = { ...(value as Record<string, JsonValue>) };
      delete obj[childPath[childPath.length - 1]];
      onChange(path, obj);
    } else {
      const arr = [...(value as JsonValue[])];
      arr.splice(Number(childPath[childPath.length - 1]), 1);
      onChange(path, arr);
    }
  };

  const handleTypeChange = (newType: string) => {
    onChange(path, castType(value, newType));
  };

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      <div className="flex items-center gap-1.5 py-0.5 group">
        {/* 展开/折叠 */}
        {isContainer ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-4 h-4 flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors text-xs flex-shrink-0"
          >
            {expanded ? "▼" : "▶"}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* 键名 */}
        {!root && (
          <Typography.Text
            strong
            className="text-xs w-28 flex-shrink-0 truncate"
            title={keyName}
          >
            {keyName}
          </Typography.Text>
        )}

        {/* 类型选择 */}
        <Tag
          color={TYPE_COLOR[t]}
          className="text-xs leading-tight px-1 cursor-pointer m-0"
        >
          <Select
            size="small"
            variant="borderless"
            value={t}
            onChange={handleTypeChange}
            options={TYPE_OPTIONS}
            className="w-16 [&_.ant-select-selector]:!pr-0 [&_.ant-select-selector]:!pl-0 [&_.ant-select-selector]:!min-h-0 h-4 [&_.ant-select-arrow]:!text-[8px]"
            popupMatchSelectWidth={false}
          />
        </Tag>

        {/* 值 */}
        <div className="flex-1 min-w-0">
          <ValueInput
            value={value}
            onChange={(v) => onChange(path, v)}
            compact
          />
        </div>

        {/* 删除按钮 */}
        {!root && (
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            className="opacity-0 group-hover:opacity-100 flex-shrink-0"
            style={{ minWidth: 20, width: 20, height: 20 }}
            onClick={() => onRemove(path)}
          />
        )}
      </div>

      {/* 子节点 */}
      {isContainer && expanded && (
        <div>
          {entries.map(([k, v]) => (
            <JsonNode
              key={k}
              path={[...path, k]}
              keyName={k}
              value={v}
              depth={depth + 1}
              onChange={handleChildChange}
              onRemove={handleChildRemove}
            />
          ))}
          <div style={{ marginLeft: 16 }} className="py-0.5">
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddChild}
            >
              {t === "object" ? "添加属性" : "添加项"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomParamsEditor({
  value,
  onChange,
}: {
  value?: Record<string, unknown>;
  onChange?: (v: Record<string, unknown>) => void;
}) {
  const { message } = App.useApp();
  const [mode, setMode] = useState<"visual" | "raw">("visual");
  const [rawText, setRawText] = useState("");
  const [rawError, setRawError] = useState<string | null>(null);

  const data = (value || {}) as Record<string, JsonValue>;

  const handleChange = (path: string[], val: JsonValue) => {
    const rootKey = path[0];
    if (path.length === 1) {
      onChange?.({ ...data, [rootKey]: val });
    } else {
      // 深层修改：构建新对象
      const newObj = { ...data };
      newObj[rootKey] = val;
      onChange?.(newObj);
    }
  };

  const handleRemove = (path: string[]) => {
    if (path.length !== 1) return;
    const next = { ...data };
    delete next[path[0]];
    onChange?.(next);
  };

  const handleAddRoot = () => {
    let newKey = "key";
    let n = 1;
    while (newKey in data) {
      newKey = `key${n}`;
      n++;
    }
    onChange?.({ ...data, [newKey]: "" });
  };

  // Raw mode
  useEffect(() => {
    if (mode === "raw") {
      setRawText(JSON.stringify(data, null, 2));
      setRawError(null);
    }
  }, [mode, value]);

  const handleRawApply = () => {
    try {
      const parsed = JSON.parse(rawText);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        setRawError("必须是 JSON 对象 {}");
        return;
      }
      setRawError(null);
      onChange?.(parsed as Record<string, unknown>);
      message.success("已应用");
    } catch (e: any) {
      setRawError(e.message);
    }
  };

  return (
    <div className="border border-(--color-border) rounded-lg bg-[var(--color-bg-base)]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-(--color-border) bg-[var(--color-bg-secondary)] rounded-t-lg">
        <span className="text-xs text-[var(--color-text-secondary)]">
          自定义参数
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            type="text"
            className={`text-xs ${mode === "visual" ? "text-[var(--color-primary)]" : ""}`}
            onClick={() => setMode("visual")}
          >
            可视化
          </Button>
          <Button
            size="small"
            type="text"
            className={`text-xs ${mode === "raw" ? "text-[var(--color-primary)]" : ""}`}
            onClick={() => setMode("raw")}
          >
            JSON
          </Button>
        </div>
      </div>
      <div className="p-2">
        {mode === "visual" ? (
          <>
            {Object.entries(data).map(([k, v]) => (
              <JsonNode
                key={k}
                path={[k]}
                keyName={k}
                value={v as JsonValue}
                depth={0}
                root
                onChange={handleChange}
                onRemove={handleRemove}
              />
            ))}
            {Object.keys(data).length === 0 && (
              <Typography.Text
                type="secondary"
                className="text-xs block py-2 text-center"
              >
                暂无参数
              </Typography.Text>
            )}
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddRoot}
              className="mt-1"
            >
              添加属性
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            <Input.TextArea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setRawError(null);
              }}
              rows={8}
              className="font-mono text-xs"
              placeholder="{}"
              status={rawError ? "error" : undefined}
            />
            <div className="flex items-center justify-between">
              {rawError ? (
                <Typography.Text type="danger" className="text-xs">
                  {rawError}
                </Typography.Text>
              ) : (
                <span />
              )}
              <Button size="small" type="primary" onClick={handleRawApply}>
                应用
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
            ? "bg-[var(--color-primary)]/20 border-2 border-(--color-primary) scale-110"
            : "bg-(--color-bg-tertiary) border border-(--color-border) hover:border-(--color-primary)/50"
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
  const { message } = App.useApp();
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
        name: agent.agent_name || "" || "",
        agentCode: agent.agent_code || "" || "",
        avatar: agent.avatar || "🤖",
        providerId: agent.provider?.id,
        modelId: agent.model_id || "",
        temperature: agent.temperature ?? 0.7,
        stream: agent.stream ?? true,
        thinking: agent.thinking ?? { enabled: false },
        enabled: agent.enabled,
        custom_params: agent.custom_params || {},
      });
      setSelectedProviderId(agent.provider?.id);
      // 加载已有的提示词关联
      loadAgentPrompts(agent.id);
    } else if (open && !agent) {
      form.resetFields();
      setSelectedPrompts([]);
      form.setFieldsValue({
        avatar: "🤖",
        temperature: 0.7,
        stream: true,
        thinking: { enabled: false },
        enabled: true,
        custom_params: {},
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

  // 当 availableModels 更新后，确保编辑模式下的 modelId 正确回显
  useEffect(() => {
    if (open && agent && availableModels.length > 0 && agent.model_id) {
      const modelExists = availableModels.some(
        (m: any) => m.id === agent.model_id,
      );
      if (modelExists) {
        form.setFieldValue("modelId", agent.model_id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels, open]);

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
        agent_name: values.name,
        agent_code: values.agentCode,
        avatar: values.avatar,
        provider: {
          id: values.providerId,
          provider_name: provider?.name || "",
        },
        model_id: values.modelId,
        model_name: model?.name || values.modelId,
        temperature: values.temperature,
        stream: values.stream,
        thinking:
          values.thinking && typeof values.thinking === "object"
            ? values.thinking
            : { enabled: !!values.thinking },
        enabled: values.enabled ?? true,
        custom_params:
          values.custom_params && Object.keys(values.custom_params).length > 0
            ? values.custom_params
            : undefined,
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
                label: m.name,
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

          <Form.Item
            name={["thinking", "enabled"]}
            label="思考模式"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </div>

        <Form.Item name="custom_params" label="自定义参数">
          <CustomParamsEditor />
        </Form.Item>
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
  const { message } = App.useApp();
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
    setSelectedProviderId(agent.provider?.id);
    loadLinkedPromptNames();
  }, [agent.provider?.id, agent.id]);

  // 当 editing 或 availableModels 变化时，设置表单值
  useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        name: agent.agent_name || "" || "",
        agentCode: agent.agent_code || "" || "",
        avatar: agent.avatar || "🤖",
        providerId: agent.provider?.id || "",
        modelId: agent.model_id || "",
        temperature: agent.temperature ?? 0.7,
        stream: agent.stream ?? true,
        thinking: agent.thinking ?? { enabled: false },
        enabled: agent.enabled,
        custom_params: agent.custom_params || {},
      });
      loadEditPrompts(agent.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, availableModels]);

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
        agent_name: values.name,
        agent_code: values.agentCode,
        avatar: values.avatar,
        provider: {
          id: values.providerId,
          provider_name: provider?.name || "",
        },
        model_id: values.modelId,
        model_name: model?.name || values.modelId,
        temperature: values.temperature,
        stream: values.stream,
        thinking:
          values.thinking && typeof values.thinking === "object"
            ? values.thinking
            : { enabled: !!values.thinking },
        enabled: values.enabled,
        custom_params:
          values.custom_params && Object.keys(values.custom_params).length > 0
            ? values.custom_params
            : undefined,
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
    providers.find((p) => p.id === id)?.name ||
    agent.provider?.provider_name ||
    id ||
    "";
  const getModelName = (providerId: string, modelId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return (
      provider?.models?.find((m: any) => m.id === modelId)?.name ||
      agent.model_name ||
      modelId ||
      ""
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
                name={["thinking", "enabled"]}
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

          <Form.Item name="custom_params" label="自定义参数">
            <CustomParamsEditor />
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
          <Input value={agent.agent_name || "" || ""} readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            编码
          </label>
          <Input value={agent.agent_code || "" || ""} readOnly />
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
            value={getModelName(agent.provider?.id, agent.model_id)}
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            供应商
          </label>
          <Input value={getProviderName(agent.provider?.id)} readOnly />
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

      {agent.custom_params && Object.keys(agent.custom_params).length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            自定义参数
          </label>
          <div className="space-y-1">
            {Object.entries(agent.custom_params).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <Typography.Text className="text-sm text-[var(--color-text-secondary)] w-32 flex-shrink-0">
                  {key}
                </Typography.Text>
                <Input
                  value={
                    typeof value === "string" ? value : JSON.stringify(value)
                  }
                  readOnly
                  size="small"
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--color-text-tertiary)]">
        {agent.created_at &&
          `创建时间: ${new Date(agent.created_at).toLocaleString()} `}
        {agent.updated_at &&
          `| 更新时间: ${new Date(agent.updated_at).toLocaleString()}`}
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
  const { message } = App.useApp();
  const [permission, setPermission] = useState<AgentPermission | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPermission = async () => {
      try {
        const perm = await agentApi.getPermissions(agent.id);
        setPermission(perm || null);
      } catch (error) {
        console.error("Failed to load permission:", error);
      }
    };
    loadPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

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
  const { message } = App.useApp();
  const [permission, setPermission] = useState<AgentPermission | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPermission = async () => {
      try {
        const perm = await agentApi.getPermissions(agent.id);
        setPermission(perm || null);
      } catch (error) {
        console.error("Failed to load permission:", error);
      }
    };
    loadPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

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
              {agent.agent_name || ""}
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

      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4">
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
      agentName={agent.agent_name || ""}
      onSave={() => {}}
    />
  );
}

// ==================== 主页面 ====================

export default function AgentListPage() {
  const { modal, message } = App.useApp();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [clawCreateOpen, setClawCreateOpen] = useState(false);
  const [preselectedAgentType, setPreselectedAgentType] =
    useState<ClawType | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await agentApi.getAll();
      setAgents(data);
      setSelectedAgent((prev) => {
        if (prev) {
          const updated = data.find((a: Agent) => a.id === prev.id);
          return updated || null;
        }
        return prev;
      });
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, []);

  const handleDelete = (agent: Agent) => {
    showDeleteConfirm(
      {
        title: "确认删除 Agent",
        content: (
          <div>
            <p>
              确定要删除 Agent <strong>{agent.agent_name || ""}</strong> 吗？
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
      },
      modal,
    );
  };

  const handleDuplicate = async (agent: Agent) => {
    try {
      const newAgent = await agentApi.create({
        agent_name: `${agent.agent_name || ""} (副本)`,
        agent_code: `${agent.agent_code || ""}_copy`,
        avatar: agent.avatar,
        model_id: agent.model_id,
        model_name: agent.model_name || "",
        provider: agent.provider,
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
      (a.agent_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.agent_code || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "all" || a.agent_category === typeFilter;
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

  const isClawAgent = (agent: Agent) =>
    agent.agent_category && agent.agent_category !== "native";

  // Create button dropdown items
  const createMenuItems = [
    { key: "native", label: "Native Agent", icon: <RobotOutlined /> },
    { type: "divider" as const },
    ...(
      Object.entries(clawTypeConfig) as [
        ClawType,
        (typeof clawTypeConfig)[ClawType],
      ][]
    ).map(([type, cfg]) => ({
      key: type,
      label: cfg.label,
      icon: <span>{cfg.icon}</span>,
    })),
  ];

  const handleCreateMenu = ({ key }: { key: string }) => {
    if (key === "native") {
      handleOpenCreate();
    } else {
      setPreselectedAgentType(key as ClawType);
      setClawCreateOpen(true);
    }
  };

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <ResizableSidebar className="border-r border-(--color-border) bg-[var(--color-bg-secondary)]" storageKey="sidebar:agents">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Agent 管理
            </h2>
            <Dropdown
              menu={{ items: createMenuItems, onClick: handleCreateMenu }}
              trigger={["click"]}
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
              { label: "全部", value: "all" },
              { label: "Native Agent", value: "native" },
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
              <p>
                {searchQuery || typeFilter !== "all"
                  ? "无匹配结果"
                  : "暂无 Agent"}
              </p>
              {!searchQuery && typeFilter === "all" && (
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
              const clawConfig = isClawAgent(agent)
                ? clawTypeConfig[agent.agent_category as ClawType]
                : null;
              const icon = clawConfig?.icon || agent.avatar || "🤖";
              const statusDot = isClawAgent(agent)
                ? clawStatusDot[clawVal(agent, "clawStatus") || "unknown"]
                : statusColors[
                    agent.status || (agent.enabled ? "idle" : "offline")
                  ];

              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedAgent?.id === agent.id
                      ? "bg-[var(--color-primary)]/10 border border-(--color-primary)/30"
                      : "hover:bg-(--color-bg-tertiary)"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-text-primary)] truncate">
                          {agent.agent_name || ""}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`}
                        />
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {clawConfig ? (
                          <Tag
                            color={clawConfig.color}
                            className="text-xs leading-tight px-1"
                          >
                            {clawConfig.label}
                          </Tag>
                        ) : null}
                        <p className="text-sm text-[var(--color-text-tertiary)] truncate">
                          {agent.model_name || "" || agent.agent_code || ""}
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
      </ResizableSidebar>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto">
        {selectedAgent ? (
          isClawAgent(selectedAgent) ? (
            <ClawAgentDetail
              key={selectedAgent.id}
              agent={selectedAgent}
              onUpdate={loadAgents}
              onDelete={() => setSelectedAgent(null)}
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
        onClose={() => {
          setClawCreateOpen(false);
          setPreselectedAgentType(null);
        }}
        onSuccess={() => {
          setClawCreateOpen(false);
          setPreselectedAgentType(null);
          loadAgents();
        }}
        preselectedType={preselectedAgentType}
      />
    </div>
  );
}

// ==================== Agent 详情面板（外部 Agent 类型）====================

interface ClawAgentDetailProps {
  agent: Agent;
  onUpdate: () => void;
  onDelete?: () => void;
}

function ClawAgentDetail({ agent, onUpdate, onDelete }: ClawAgentDetailProps) {
  const { modal, message } = App.useApp();
  const [activeTab, setActiveTab] = useState<
    "basic" | "connection" | "channel" | "octos"
  >("basic");
  const [editOpen, setEditOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [proxyGuideOpen, setProxyGuideOpen] = useState(false);
  const [proxyGuideMapping, setProxyGuideMapping] =
    useState<ClawChannelMapping | null>(null);

  const agentType = agent.agent_category as ClawType;
  const config = clawTypeConfig[agentType];
  const clawParams = getClaw(agent);
  const mappings = (clawParams.mappings as ClawChannelMapping[]) || [];

  const handleTest = async () => {
    try {
      const result = await clawApi.test(agent.id);
      message.success(result ? "连接成功" : "连接失败");
    } catch {
      message.error("测试失败");
    }
  };

  const handleDelete = () => {
    showDeleteConfirm(
      {
        title: "删除 Agent",
        content: `确定要删除 ${agent.agent_name || ""} 吗？此操作不可恢复。`,
        onOk: async () => {
          try {
            await agentApi.delete(agent.id);
            message.success("已删除");
            onDelete?.();
          } catch (error) {
            console.error("Failed to delete agent:", error);
            message.error("删除失败");
          }
        },
      },
      modal,
    );
  };

  const tabs = [
    { key: "basic", label: "基本信息", icon: RobotOutlined },
    { key: "connection", label: "连接信息", icon: LinkOutlined },
    ...(agent.agent_category !== "native"
      ? [
          {
            key: "channel" as const,
            label: "渠道代理",
            icon: CloudServerOutlined,
          },
        ]
      : []),
    ...(agentType === "octos"
      ? [{ key: "octos" as const, label: "Octos 管理", icon: ApiOutlined }]
      : []),
  ];

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{config?.icon || "🤖"}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {agent.agent_name || ""}
              </h2>
              <Tag color={config?.color}>{config?.label}</Tag>
              <Tag color={agent.enabled ? "green" : "red"}>
                {agent.enabled ? "已启用" : "已禁用"}
              </Tag>
              {clawVal(agent, "clawStatus") && (
                <Tag
                  color={
                    clawVal(agent, "clawStatus") === "online"
                      ? "green"
                      : clawVal(agent, "clawStatus") === "offline"
                        ? "red"
                        : "default"
                  }
                >
                  {clawVal(agent, "clawStatus") === "online"
                    ? "在线"
                    : clawVal(agent, "clawStatus") === "offline"
                      ? "离线"
                      : clawVal(agent, "clawStatus")}
                </Tag>
              )}
            </div>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
              {agent.model_name || ""} · {agent.provider?.provider_name}
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

      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4">
        {activeTab === "basic" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  名称
                </label>
                <Input value={agent.agent_name || ""} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  编码
                </label>
                <Input value={agent.agent_code || ""} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  类型
                </label>
                <Input
                  value={config?.label || agent.agent_category || ""}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  版本
                </label>
                <Input value={clawVal(agent, "version") || "-"} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  供应商
                </label>
                <Input value={agent.provider?.provider_name || "-"} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  模型
                </label>
                <Input value={agent.model_name || "" || "-"} readOnly />
              </div>
              {clawVal(agent, "endpointUrl") && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    端点地址
                  </label>
                  <Input value={clawVal(agent, "endpointUrl")} readOnly />
                </div>
              )}
            </div>

            {/* Auth Config from custom_params.claw */}
            {clawParams?.authConfig &&
              typeof clawParams.authConfig === "object" &&
              Object.keys(clawParams.authConfig as Record<string, unknown>)
                .length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    认证配置
                  </label>
                  <div className="space-y-1">
                    {Object.entries(
                      clawParams.authConfig as Record<string, unknown>,
                    ).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Typography.Text className="text-sm text-[var(--color-text-secondary)] w-32 flex-shrink-0">
                          {key}
                        </Typography.Text>
                        <Input
                          value={
                            typeof value === "string"
                              ? value
                              : JSON.stringify(value)
                          }
                          readOnly
                          size="small"
                          className="flex-1"
                          type={
                            key.toLowerCase().includes("token") ||
                            key.toLowerCase().includes("key") ||
                            key.toLowerCase().includes("secret")
                              ? "password"
                              : undefined
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Connection Config */}
            {clawParams?.connectionConfig &&
              typeof clawParams.connectionConfig === "object" &&
              Object.keys(
                clawParams.connectionConfig as Record<string, unknown>,
              ).length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    连接配置
                  </label>
                  <div className="space-y-1">
                    {Object.entries(
                      clawParams.connectionConfig as Record<string, unknown>,
                    ).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Typography.Text className="text-sm text-[var(--color-text-secondary)] w-32 flex-shrink-0">
                          {key}
                        </Typography.Text>
                        <Input
                          value={
                            typeof value === "string"
                              ? value
                              : JSON.stringify(value)
                          }
                          readOnly
                          size="small"
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </>
        )}

        {activeTab === "connection" && (
          <div className="space-y-4">
            <Card size="small" title="LLM 代理配置">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Typography.Text type="secondary">代理地址</Typography.Text>
                  <Typography.Text code>
                    http://localhost:3001/proxy/v1
                  </Typography.Text>
                </div>
                <div className="flex justify-between">
                  <Typography.Text type="secondary">模式</Typography.Text>
                  <Typography.Text>
                    {config?.mode === "server" ? "Server 模式" : "CLI 模式"}
                  </Typography.Text>
                </div>
              </div>
            </Card>
            <Card size="small" title="环境变量配置">
              <div className="bg-[var(--color-bg-base)] rounded-lg p-3 font-mono text-sm">
                {(config?.setupGuide || []).map((line, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[var(--color-text-tertiary)] select-none">
                      $
                    </span>
                    <span className="flex-1">{line}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "channel" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">已分配渠道</h4>
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAssignOpen(true)}
              >
                分配渠道
              </Button>
            </div>
            {mappings.length === 0 ? (
              <Empty
                description="暂无渠道代理"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              mappings.map((m) => {
                const proxyCfg =
                  channelProxyTypeConfig[m.remoteChannelType] ||
                  channelProxyTypeConfig[m.channelType || ""];
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg border border-(--color-border) bg-[var(--color-bg-base)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{proxyCfg?.icon || "📡"}</span>
                        <Typography.Text strong>
                          {m.channelName || m.remoteChannelId}
                        </Typography.Text>
                        <Tag>{proxyCfg?.label || m.remoteChannelType}</Tag>
                      </div>
                      <Space size="small">
                        <Button
                          size="small"
                          type="link"
                          onClick={() => {
                            setProxyGuideMapping(m);
                            setProxyGuideOpen(true);
                          }}
                        >
                          配置指南
                        </Button>
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
                    {m.proxyInfo && (
                      <div className="text-xs space-y-1">
                        <div>
                          <Typography.Text type="secondary">
                            发送:
                          </Typography.Text>{" "}
                          <Typography.Text code copyable>
                            {m.proxyInfo.sendUrl}
                          </Typography.Text>
                        </div>
                        <div>
                          <Typography.Text type="secondary">
                            Webhook:
                          </Typography.Text>{" "}
                          <Typography.Text code copyable>
                            {m.proxyInfo.receiveUrl}
                          </Typography.Text>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "octos" && agentType === "octos" && (
          <OctosManagementPanel agent={agent} />
        )}
      </div>

      <ClawEditModal
        open={editOpen}
        agent={agent}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          onUpdate();
        }}
      />

      <ConnectionGuideDialog
        open={connectOpen}
        agent={agent}
        onClose={() => setConnectOpen(false)}
      />

      <ChannelAssignModal
        open={assignOpen}
        agentId={agent.id}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {
          setAssignOpen(false);
        }}
      />

      {proxyGuideMapping && (
        <ChannelProxyGuideModal
          open={proxyGuideOpen}
          mapping={proxyGuideMapping}
          onClose={() => {
            setProxyGuideOpen(false);
            setProxyGuideMapping(null);
          }}
        />
      )}
    </div>
  );
}

// ==================== Agent Create Modal (Claw 类型) ====================

function ClawCreateModal({
  open,
  onClose,
  onSuccess,
  preselectedType,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  preselectedType?: ClawType | null;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<ClawType | null>(null);

  useEffect(() => {
    if (open) {
      providerApi
        .getAll()
        .then(setProviders)
        .catch(() => {});
      // 预设置 Agent 类型（如果有）
      if (preselectedType && !selectedType) {
        setSelectedType(preselectedType);
        form.setFieldValue("clawType", preselectedType);
      }
    } else {
      // 关闭时清除选中状态
      setSelectedType(null);
    }
  }, [open, preselectedType]);

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
      const provider = providers.find((p: any) => p.id === values.providerId);
      const model = provider?.models?.find((m: any) => m.id === values.modelId);
      const clawType = selectedType!;
      const shortId = crypto.randomUUID().slice(0, 8);
      const agentData: Partial<Agent> = {
        agent_name: values.instanceName,
        agent_code: `CLAW-${clawType.toUpperCase()}-${shortId}`,
        agent_category: clawType,
        system_prompt: `Claw proxy agent: ${values.instanceName}`,
        provider: {
          id: values.providerId,
          provider_name: provider?.name || "",
        },
        model_id: values.modelId,
        model_name: model?.name || values.modelId,
        enabled: values.enabled ?? true,
        stream: true,
        custom_params: {
          claw: {
            clawType: clawType,
            endpointUrl: values.endpointUrl,
            version: values.version,
            authConfig: values.authToken
              ? { authToken: values.authToken }
              : undefined,
          },
        },
      };
      const result = await agentApi.create(agentData);
      message.success("Agent 创建成功");
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
      title="创建 Agent"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      width={600}
      okText="创建"
      confirmLoading={loading}
    >
      <div className="mb-4">
        <Typography.Text strong className="block mb-2">
          选择类型
        </Typography.Text>
        <div className="flex flex-wrap gap-2">
          {(
            Object.entries(clawTypeConfig) as [
              ClawType,
              (typeof clawTypeConfig)[ClawType],
            ][]
          ).map(([type, cfg]) => (
            <div
              key={type}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all w-28 text-center ${
                selectedType === type
                  ? "border-(--color-primary) bg-(--color-primary-bg)"
                  : "border-(--color-border) hover:border-(--color-primary)"
              }`}
              onClick={() => {
                setSelectedType(type);
                form.setFieldValue("clawType", type);
              }}
            >
              <div className="text-2xl mb-1">{cfg.icon}</div>
              <div className="font-medium text-xs">{cfg.label}</div>
            </div>
          ))}
        </div>
      </div>
      <Form form={form} layout="vertical" initialValues={{ enabled: true }}>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="instanceName"
            label="实例名称"
            rules={[{ required: true, message: "请输入名称" }]}
          >
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
          <Form.Item
            name="authToken"
            label="Auth Token"
            rules={[{ required: true, message: "请输入 Auth Token" }]}
          >
            <Input.Password placeholder="Octos 服务启动时的 auth-token" />
          </Form.Item>
        )}
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
                label: p.name,
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

// ==================== Agent Edit Modal (Claw 类型) ====================

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
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);

  const agentType = agent.agent_category as ClawType;
  const isOctos = agentType === "octos";
  const clawParams = getClaw(agent);
  const existingAuthConfig = clawParams?.authConfig as
    | Record<string, unknown>
    | undefined;

  useEffect(() => {
    if (open) {
      providerApi
        .getAll()
        .then(setProviders)
        .catch(() => {});
      form.setFieldsValue({
        instanceName: agent.agent_name || "",
        agentCode: agent.agent_code || "",
        systemPrompt: agent.system_prompt || `你是${agentType}`,
        version: clawVal(agent, "version") || "",
        endpointUrl: clawVal(agent, "endpointUrl") || "",
        authToken: (existingAuthConfig?.authToken ||
          existingAuthConfig?.token ||
          "") as string,
        providerId: agent.provider?.id || "",
        modelId: agent.model_id || "",
        enabled: agent.enabled,
      });
      if (agent.provider?.id) {
        providerApi
          .getById(agent.provider?.id)
          .then((prov: any) => {
            setModels(prov.models || []);
          })
          .catch(() => setModels([]));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleProviderChange = async (providerId: string) => {
    form.setFieldValue("modelId", undefined);
    try {
      const prov = await providerApi.getById(providerId);
      setModels(prov.models || []);
    } catch {
      setModels([]);
    }
  };

  // 当 models 更新后，确保编辑模式下的 modelId 正确回显
  useEffect(() => {
    if (open && agent && models.length > 0 && agent.model_id) {
      const modelExists = models.some((m: any) => m.id === agent.model_id);
      if (modelExists) {
        form.setFieldValue("modelId", agent.model_id);
      }
    }
  }, [models, open, agent?.model_id]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const provider = providers.find((p: any) => p.id === values.providerId);
      const model = provider?.models?.find((m: any) => m.id === values.modelId);
      await agentApi.update(agent.id, {
        agent_name: values.instanceName,
        agent_code: values.agentCode,
        system_prompt: values.systemPrompt || `你是${agentType}`,
        agent_category: agentType,
        provider: {
          id: values.providerId,
          provider_name: provider?.name || "",
        },
        model_id: values.modelId,
        model_name: model?.name || values.modelId,
        enabled: values.enabled,
        custom_params: {
          ...(agent.custom_params || {}),
          claw: {
            clawType: agentType,
            endpointUrl: values.endpointUrl,
            version: values.version,
            authConfig: values.authToken
              ? { authToken: values.authToken }
              : undefined,
          },
        },
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
      title="编辑 Agent"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      width={600}
      okText="保存"
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="instanceName"
          label="实例名称"
          rules={[{ required: true }]}
        >
          <Input />
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
          <Input />
        </Form.Item>
        <Form.Item
          name="systemPrompt"
          label="系统提示词"
          rules={[{ required: true, message: "请输入系统提示词" }]}
        >
          <Input.TextArea rows={3} placeholder="系统提示词" />
        </Form.Item>
        <Form.Item name="version" label="版本">
          <Input />
        </Form.Item>
        <Form.Item name="endpointUrl" label="端点地址">
          <Input />
        </Form.Item>
        {isOctos && (
          <Form.Item
            name="authToken"
            label="Auth Token"
            tooltip="Octos 服务启动时 --auth-token 参数指定的令牌"
          >
            <Input.Password placeholder="输入 Auth Token" />
          </Form.Item>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="providerId"
            label="供应商"
            rules={[{ required: true }]}
          >
            <Select
              onChange={handleProviderChange}
              options={providers.map((p: any) => ({
                label: p.name,
                value: p.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="modelId" label="模型" rules={[{ required: true }]}>
            <Select
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

// ==================== Agent 连接指南 ====================

function ConnectionGuideDialog({
  open,
  agent,
  onClose,
}: {
  open: boolean;
  agent: Agent;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const agentType = agent.agent_category as ClawType;
  const config = clawTypeConfig[agentType];
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
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(proxyBase);
                    message.success("已复制");
                  }}
                />
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
              <span className="text-[var(--color-text-tertiary)] select-none">
                $
              </span>
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

// ==================== 渠道分配 ====================

function ChannelAssignModal({
  open,
  agentId,
  onClose,
  onAssigned,
}: {
  open: boolean;
  agentId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      channelApi
        .getAll()
        .then(setChannels)
        .catch(() => {});
    }
  }, [open]);

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
        agentId,
        values.channelId,
        values.remoteChannelId,
        values.remoteChannelType,
        values.callbackUrl,
      );
      message.success("渠道分配成功");
      form.resetFields();
      onAssigned();
    } catch {
      // Validation or API error - already handled by form/validation
    } finally {
      setLoading(false);
    }
  };

  const channelTypeOptions = Object.entries(channelTypeConfig).map(
    ([type, cfg]) => ({
      label: `${cfg.icon} ${cfg.name}`,
      value: type,
    }),
  ) as { label: string; value: string }[];

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
              const typeCfg =
                channelTypeConfig[c.type as keyof typeof channelTypeConfig];
              return {
                label: (
                  <div className="flex items-center gap-2">
                    <span>{typeCfg?.icon || "📡"}</span>
                    <span>{c.name || c.channelType}</span>
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
          rules={[{ required: true, message: "请输入远端渠道ID" }]}
        >
          <Input placeholder="如：tg-bot-001" />
        </Form.Item>
        <Form.Item
          name="remoteChannelType"
          label="远端渠道类型"
          rules={[{ required: true, message: "请选择渠道类型" }]}
        >
          <Select placeholder="选择渠道类型" options={channelTypeOptions} />
        </Form.Item>
        <Form.Item name="callbackUrl" label="回调地址">
          <Input placeholder="https://your-claw.example.com/webhook（可选）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ==================== 渠道代理配置指南 ====================

function ChannelProxyGuideModal({
  open,
  mapping,
  onClose,
}: {
  open: boolean;
  mapping: ClawChannelMapping | null;
  onClose: () => void;
}) {
  if (!mapping) return null;
  const proxyCfg =
    channelProxyTypeConfig[mapping.remoteChannelType] ||
    channelProxyTypeConfig[mapping.channelType || ""];
  const proxyInfo = mapping.proxyInfo;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span>
            {mapping.channelName || mapping.remoteChannelId} — 代理配置指南
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
      width={640}
    >
      <Card size="small" className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{proxyCfg?.icon || "📡"}</span>
          <Typography.Text strong>
            {mapping.channelName || mapping.remoteChannelId}
          </Typography.Text>
          <Tag>{proxyCfg?.label || mapping.remoteChannelType}</Tag>
        </div>
        {proxyInfo && (
          <div className="space-y-2">
            <div>
              <Typography.Text type="secondary">发送地址:</Typography.Text>{" "}
              <Typography.Text code copyable>
                {proxyInfo.sendUrl}
              </Typography.Text>
            </div>
            <div>
              <Typography.Text type="secondary">Webhook:</Typography.Text>{" "}
              <Typography.Text code copyable>
                {proxyInfo.receiveUrl}
              </Typography.Text>
            </div>
            <div>
              <Typography.Text type="secondary">代理 Token:</Typography.Text>{" "}
              <Typography.Text code copyable>
                {proxyInfo.proxyToken}
              </Typography.Text>
            </div>
          </div>
        )}
      </Card>
    </Modal>
  );
}
