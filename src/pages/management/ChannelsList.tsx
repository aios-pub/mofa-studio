import { useTranslation } from "react-i18next";
/**
 * Channel list page
 */

import { useState, useEffect } from "react";
import {
  Input,
  Button,
  Dropdown,
  message,
  Modal,
  Tag,
  Switch,
  Spin,
  Empty,
  Alert,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { channelApi, channelTypeConfig } from "@/services";
import { agentApi } from "@/services";
import ChannelConfigForm from "./components/ChannelConfigForm";
import ResizableSidebar from "@/components/layout/ResizableSidebar";
import ChannelTypeSelector from "./components/ChannelTypeSelector";
import type { Channel, ChannelStatus, Agent } from "../../types";

// Status configuration
const statusConfig: Record<
  ChannelStatus,
  { color: string; text: string; icon: React.ReactNode }
> = {
  active: { color: "green", text: "正常", icon: <CheckCircleOutlined /> },
  inactive: { color: "default", text: "未激活", icon: <StopOutlined /> },
  connecting: { color: "blue", text: "连接中", icon: <SyncOutlined spin /> },
  error: { color: "red", text: "异常", icon: <ExclamationCircleOutlined /> },
  disabled: { color: "default", text: "已禁用", icon: <StopOutlined /> },
};

export default function ChannelsListPage() {  const { t } = useTranslation();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    channelId: string;
    success: boolean;
    message: string;
  } | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [channelData, agentData] = await Promise.all([
        channelApi.getAll(),
        agentApi.getAll(),
      ]);
      setChannels(channelData);
      setAgents(agentData);
    } catch (error) {
      console.error("Failed to load data:", error);
      message.error(t("加载数据失败"));
    } finally {
      setLoading(false);
    }
  };

  // Delete channel
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: t("确认删除"),
      content: t("删除后无法恢复，确定要删除此渠道吗？"),
      okText: t("删除"),
      cancelText: t("取消"),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await channelApi.delete(id);
          setChannels(channels.filter((c) => c.id !== id));
          if (selectedChannel?.id === id) {
            setSelectedChannel(null);
          }
          message.success(t("渠道已删除"));
        } catch (error) {
          console.error("Failed to delete channel:", error);
          message.error(t("删除失败"));
        }
      },
    });
  };

  // Test connection
  const handleTestConnection = async (channel: Channel) => {
    setTestLoading(channel.id);
    setTestResult(null);
    try {
      const result = await channelApi.testConnection(channel.id);
      if (result.success) {
        const msg = result.message || "连接测试成功";
        message.success(msg);
        setTestResult({ channelId: channel.id, success: true, message: msg });
      } else {
        const msg = result.message || "连接测试失败";
        message.error(msg);
        setTestResult({ channelId: channel.id, success: false, message: msg });
      }
    } catch (error) {
      console.error("Failed to test connection:", error);
      message.error(t("测试失败"));
      setTestResult({
        channelId: channel.id,
        success: false,
        message: t("测试请求失败，请检查网络或后端服务"),
      });
    } finally {
      setTestLoading(null);
    }
  };

  // Toggle state
  const handleToggleStatus = async (channel: Channel) => {
    try {
      const updated = await channelApi.toggleStatus(channel.id);
      if (updated) {
        setChannels((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        if (selectedChannel?.id === updated.id) {
          setSelectedChannel(updated);
        }
        message.success(updated.enabled ? "渠道已启用" : "渠道已禁用");
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
      message.error(t("操作失败"));
    }
  };

  // Get the action menu
  const getActionMenuItems = (channel: Channel) => [
    {
      key: "test",
      label: t("测试连接"),
      icon: <ApiOutlined />,
      onClick: () => handleTestConnection(channel),
    },
    {
      key: "edit",
      label: t("编辑"),
      icon: <EditOutlined />,
      onClick: () => setSelectedChannel(channel),
    },
    {
      type: "divider" as const,
    },
    {
      key: "delete",
      label: t("删除"),
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(channel.id),
    },
  ];

  // Filter channels
  const filteredChannels = channels.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channelTypeConfig[c.type].name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  // Create new channel
  const handleCreateChannel = async (data: Partial<Channel>) => {
    try {
      const newChannel = await channelApi.create(data);
      setChannels((prev) => [...prev, newChannel]);
      setShowCreateModal(false);
      setShowTypeSelector(false);
      setSelectedChannel(newChannel);
      message.success(t("渠道创建成功"));
    } catch (error) {
      console.error("Failed to create channel:", error);
      message.error(t("创建失败"));
    }
  };

  // Update channel
  const handleUpdateChannel = async (id: string, data: Partial<Channel>) => {
    try {
      const updated = await channelApi.update(id, data);
      if (updated) {
        setChannels((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        setSelectedChannel(updated);
        message.success(t("渠道更新成功"));
      }
    } catch (error) {
      console.error("Failed to update channel:", error);
      message.error(t("更新失败"));
    }
  };

  return (
    <div className="flex h-full">
      {/* Left list */}
      <ResizableSidebar className="border-r border-(--color-border) bg-[var(--color-bg-secondary)]" storageKey="sidebar:channels">
        {/* Header */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              渠道管理
            </h2>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowTypeSelector(true)}
            />
          </div>

          <Input
            placeholder={t("搜索渠道...")}
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : filteredChannels.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("暂无渠道")}
              className="py-8"
            />
          ) : (
            filteredChannels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedChannel?.id === channel.id
                    ? "bg-[var(--color-primary)]/10 border border-(--color-primary)/30"
                    : "hover:bg-(--color-bg-tertiary)"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {channelTypeConfig[channel.type].icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--color-text-primary)] truncate">
                        {channel.name}
                      </span>
                      <Tag
                        color={statusConfig[channel.status].color}
                        className="text-xs leading-tight px-1"
                      >
                        {statusConfig[channel.status].text}
                      </Tag>
                    </div>
                    <p className="text-sm text-[var(--color-text-tertiary)] truncate">
                      {channelTypeConfig[channel.type].name}
                    </p>
                  </div>
                  <Dropdown
                    menu={{ items: getActionMenuItems(channel) }}
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
            ))
          )}
        </div>
      </ResizableSidebar>

      {/* Right details */}
      <div className="flex-1 overflow-y-auto">
        {selectedChannel ? (
          <ChannelDetail
            channel={selectedChannel}
            agents={agents}
            testLoading={testLoading === selectedChannel.id}
            testResult={
              testResult?.channelId === selectedChannel.id ? testResult : null
            }
            onTest={() => handleTestConnection(selectedChannel)}
            onToggleStatus={() => handleToggleStatus(selectedChannel)}
            onUpdate={(data) => handleUpdateChannel(selectedChannel.id, data)}
            onRefresh={loadData}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <LinkOutlined className="text-5xl text-[var(--color-text-tertiary)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                选择一个渠道
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                从左侧列表中选择查看详情
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Channel type selector */}
      <ChannelTypeSelector
        open={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        onSelect={(_type) => {
          setShowTypeSelector(false);
          setShowCreateModal(true);
        }}
      />

      {/* Create channel modal */}
      <Modal
        title={t("创建渠道")}
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <ChannelConfigForm
          onSave={handleCreateChannel}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
}

// Channel detail component
function ChannelDetail({
  channel,
  agents,
  testLoading,
  testResult,
  onTest,
  onToggleStatus,
  onUpdate,
  onRefresh,
}: {
  channel: Channel;
  agents: Agent[];
  testLoading: boolean;
  testResult: { success: boolean; message: string } | null;
  onTest: () => void;
  onToggleStatus: () => void;
  onUpdate: (data: Partial<Channel>) => void;
  onRefresh: () => void;
}) {  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"config" | "stats" | "agents">(
    "config",
  );
  const [editing, setEditing] = useState(false);

  const tabs = [
    { key: "config", label: t("配置"), icon: EditOutlined },
    { key: "stats", label: t("统计"), icon: ApiOutlined },
    { key: "agents", label: "Agents", icon: LinkOutlined },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="text-4xl">{channelTypeConfig[channel.type].icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {channel.name}
            </h2>
            <Tag color={statusConfig[channel.status].color}>
              {statusConfig[channel.status].icon}{" "}
              {statusConfig[channel.status].text}
            </Tag>
          </div>
          <p className="text-[var(--color-text-secondary)] mt-1">
            {channel.description || channelTypeConfig[channel.type].description}
          </p>
          {channel.errorMessage && (
            <p className="text-red-500 text-sm mt-1">{channel.errorMessage}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Switch
            checked={channel.enabled}
            onChange={onToggleStatus}
            checkedChildren="启用"
            unCheckedChildren="禁用"
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-4">
        <Button
          type="primary"
          icon={<ApiOutlined />}
          loading={testLoading}
          onClick={onTest}
        >
          测试连接
        </Button>
        <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
          编辑配置
        </Button>
      </div>

      {/* Test results */}
      {testResult && (
        <Alert
          type={testResult.success ? "success" : "error"}
          title={testResult.message}
          showIcon
          closable
          className="mb-6"
        />
      )}

      {/* Statistics cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t("总消息数")}
          value={(channel.stats?.totalMessages ?? 0).toLocaleString()}
        />
        <StatCard
          title={t("成功率")}
          value={`${(channel.stats?.successRate ?? 0).toFixed(1)}%`}
          status={
            (channel.stats?.successRate ?? 0) >= 95
              ? "success"
              : (channel.stats?.successRate ?? 0) >= 80
                ? "warning"
                : "error"
          }
        />
        <StatCard
          title={t("失败消息")}
          value={(channel.stats?.failedMessages ?? 0).toLocaleString()}
        />
        <StatCard
          title={t("平均响应")}
          value={`${channel.stats?.avgResponseTime ?? 0}ms`}
        />
      </div>

      {/* Tabs bar */}
      <div className="flex gap-1 mb-6 border-b border-(--color-border)">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "text-[var(--color-primary)] border-(--color-primary)"
                : "text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4">
        {activeTab === "config" && (
          <ChannelConfigView
            channel={channel}
            editing={editing}
            onUpdate={onUpdate}
            onClose={() => setEditing(false)}
          />
        )}
        {activeTab === "stats" && <ChannelStatsView channel={channel} />}
        {activeTab === "agents" && (
          <ChannelAgentsView
            channel={channel}
            agents={agents}
            onRefresh={onRefresh}
          />
        )}
      </div>
    </div>
  );
}

// Statistics cards
function StatCard({
  title,
  value,
  status,
}: {
  title: string;
  value: string;
  status?: "success" | "warning" | "error";
}) {
  const statusColors = {
    success: "text-green-500",
    warning: "text-orange-500",
    error: "text-red-500",
  };

  return (
    <div className="bg-(--color-bg-tertiary) rounded-lg p-4">
      <div className="text-sm text-[var(--color-text-tertiary)]">{title}</div>
      <div
        className={`text-xl font-semibold mt-1 ${status ? statusColors[status] : "text-[var(--color-text-primary)]"}`}
      >
        {value}
      </div>
    </div>
  );
}

// Configuration view
function ChannelConfigView({
  channel,
  editing,
  onUpdate,
  onClose,
}: {
  channel: Channel;
  editing: boolean;
  onUpdate: (data: Partial<Channel>) => void;
  onClose: () => void;
}) {
  if (editing) {
    return (
      <ChannelConfigForm
        channel={channel}
        onSave={onUpdate}
        onCancel={onClose}
      />
    );
  }

  const configEntries = Object.entries(channel.config).filter(
    ([key]) =>
      ![
        "app_secret",
        "secret",
        "password",
        "token",
        "signing_secret",
        "bot_token",
        "api_key",
        "access_key_secret",
        "smtp_password",
        "client_secret",
        "access_token",
        "channel_secret",
        "channel_access_token",
        "bot_password",
        "encoding_aes_key",
        "encrypt_key",
        "verification_token",
      ].includes(key),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            渠道名称
          </label>
          <div className="text-[var(--color-text-primary)]">{channel.name}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            渠道类型
          </label>
          <div className="text-[var(--color-text-primary)]">
            {channelTypeConfig[channel.type].name}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          描述
        </label>
        <div className="text-[var(--color-text-primary)]">
          {channel.description || "暂无描述"}
        </div>
      </div>

      <div className="border-t border-(--color-border) pt-4">
        <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
          配置信息
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {configEntries.map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm text-[var(--color-text-tertiary)] mb-1">
                {key}
              </label>
              <div className="text-[var(--color-text-primary)] font-mono text-sm">
                {String(value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Statistics view
function ChannelStatsView({ channel }: { channel: Channel }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-(--color-bg-tertiary) rounded-lg p-4">
          <div className="text-sm text-[var(--color-text-tertiary)]">
            今日消息
          </div>
          <div className="text-2xl font-semibold text-[var(--color-text-primary)] mt-1">
            {Math.floor(
              (channel.stats?.totalMessages ?? 0) * 0.05,
            ).toLocaleString()}
          </div>
        </div>
        <div className="bg-(--color-bg-tertiary) rounded-lg p-4">
          <div className="text-sm text-[var(--color-text-tertiary)]">
            本周消息
          </div>
          <div className="text-2xl font-semibold text-[var(--color-text-primary)] mt-1">
            {Math.floor(
              (channel.stats?.totalMessages ?? 0) * 0.2,
            ).toLocaleString()}
          </div>
        </div>
        <div className="bg-(--color-bg-tertiary) rounded-lg p-4">
          <div className="text-sm text-[var(--color-text-tertiary)]">
            本月消息
          </div>
          <div className="text-2xl font-semibold text-[var(--color-text-primary)] mt-1">
            {Math.floor(
              (channel.stats?.totalMessages ?? 0) * 0.8,
            ).toLocaleString()}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
          时间信息
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-[var(--color-text-tertiary)]">
              创建时间
            </div>
            <div className="text-[var(--color-text-primary)] mt-1">
              {channel.createdAt.toLocaleDateString("zh-CN")}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--color-text-tertiary)]">
              更新时间
            </div>
            <div className="text-[var(--color-text-primary)] mt-1">
              {channel.updatedAt.toLocaleDateString("zh-CN")}
            </div>
          </div>
          {channel.lastSyncAt && (
            <div>
              <div className="text-sm text-[var(--color-text-tertiary)]">
                最后同步
              </div>
              <div className="text-[var(--color-text-primary)] mt-1">
                {channel.lastSyncAt.toLocaleString("zh-CN")}
              </div>
            </div>
          )}
          {channel.stats?.lastMessageAt && (
            <div>
              <div className="text-sm text-[var(--color-text-tertiary)]">
                最后消息
              </div>
              <div className="text-[var(--color-text-primary)] mt-1">
                {channel.stats?.lastMessageAt?.toLocaleString("zh-CN")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Agents association view
function ChannelAgentsView({
  channel,
  agents,
  onRefresh,
}: {
  channel: Channel;
  agents: Agent[];
  onRefresh: () => void;
}) {  const { t } = useTranslation();

  const [channelAgents, setChannelAgents] = useState<
    { agentId: string; enabled: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannelAgents();
  }, [channel.id]);

  const loadChannelAgents = async () => {
    try {
      setLoading(true);
      const data = await channelApi.getChannelAgents(channel.id);
      setChannelAgents(
        data.map((ac: { agentId: string; enabled: boolean }) => ({
          agentId: ac.agentId,
          enabled: ac.enabled,
        })),
      );
    } catch (error) {
      console.error("Failed to load channel agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async (agentId: string) => {
    try {
      await channelApi.addAgentToChannel({
        agentId,
        channelId: channel.id,
        priority: 10,
      });
      message.success(t("Agent 已添加到渠道"));
      loadChannelAgents();
      onRefresh();
    } catch (error) {
      console.error("Failed to add agent:", error);
      message.error(t("添加失败"));
    }
  };

  const handleRemoveAgent = async (agentId: string) => {
    try {
      await channelApi.removeAgentFromChannel(agentId, channel.id);
      setChannelAgents(channelAgents.filter((ca) => ca.agentId !== agentId));
      message.success(t("Agent 已从渠道移除"));
      onRefresh();
    } catch (error) {
      console.error("Failed to remove agent:", error);
      message.error(t("移除失败"));
    }
  };

  const linkedAgents = agents.filter((a) =>
    channelAgents.some((ca) => ca.agentId === a.id),
  );
  const availableAgents = agents.filter(
    (a) => !channelAgents.some((ca) => ca.agentId === a.id),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Associated agents */}
      <div>
        <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
          已关联 Agents ({linkedAgents.length})
        </h4>
        {linkedAgents.length === 0 ? (
          <div className="text-[var(--color-text-tertiary)] text-sm">
            暂无关联的 Agent
          </div>
        ) : (
          <div className="space-y-2">
            {linkedAgents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 bg-(--color-bg-tertiary) rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{agent.avatar}</span>
                  <div>
                    <div className="font-medium text-[var(--color-text-primary)]">
                      {agent.agent_name}
                    </div>
                    <div className="text-sm text-[var(--color-text-tertiary)]">
                      {agent.system_prompt?.slice(0, 50) || agent.agent_code}
                    </div>
                  </div>
                </div>
                <Button
                  type="text"
                  danger
                  size="small"
                  onClick={() => handleRemoveAgent(agent.id)}
                >
                  移除
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agents available to add */}
      {availableAgents.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            可添加 Agents
          </h4>
          <div className="space-y-2">
            {availableAgents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 bg-(--color-bg-tertiary) rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{agent.avatar}</span>
                  <div>
                    <div className="font-medium text-[var(--color-text-primary)]">
                      {agent.agent_name}
                    </div>
                    <div className="text-sm text-[var(--color-text-tertiary)]">
                      {agent.system_prompt?.slice(0, 50) || agent.agent_code}
                    </div>
                  </div>
                </div>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => handleAddAgent(agent.id)}
                >
                  添加
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
