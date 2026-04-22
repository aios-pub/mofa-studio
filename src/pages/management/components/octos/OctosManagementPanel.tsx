/**
 * Octos 管理面板 — 嵌入 AgentList 的 Octos 类型详情视图
 * 通过 Octos API 直接管理 Profile、Provider、Channel 等
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Tabs,
  Alert,
  Spin,
  Button,
  Modal,
  Input,
  App,
  Empty,
  Space,
  Tag,
  Popconfirm,
  Typography,
} from "antd";
import {
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  SettingOutlined,
  MessageOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  LineChartOutlined,
  FileTextOutlined,
  TeamOutlined,
  EyeOutlined,
  RocketOutlined,
  ClearOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { Agent } from "@/types";
import type { OctosProfileResponse, OctosProfileConfig } from "@/types/octos";
import { createOctosApiClient } from "@/services";
import { useUserInfo } from "@/stores/useUserStore";

const { Text } = Typography;
import { isMockEnabled, octosMockApi } from "@/services";
import { OctosApiClient } from "@/services/real/octos";
import { initConfig, prepareConfigForSave } from "@/services/real/octosConfigAdapter";
import OctosLlmProviderTab from "./OctosLlmProviderTab";
import OctosChannelsTab from "./OctosChannelsTab";
import OctosGatewaySettingsTab from "./OctosGatewaySettingsTab";
import OctosSkillsTab from "./OctosSkillsTab";
import OctosMetricsTab from "./OctosMetricsTab";
import OctosLogsTab from "./OctosLogsTab";
import OctosSubAccountsTab from "./OctosSubAccountsTab";
import OctosMonitorTab from "./OctosMonitorTab";

interface Props {
  agent: Agent;
}

function getClaw(agent: Agent): Record<string, unknown> {
  return ((agent.customParams as Record<string, unknown>)?.claw as Record<string, unknown>) || {};
}

export default function OctosManagementPanel({ agent }: Props) {
  const [profiles, setProfiles] = useState<OctosProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profiles");
  const [purgeReport, setPurgeReport] = useState<any>(null);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);

  const { message } = App.useApp();
  const { email: userEmail } = useUserInfo();

  const api = useMemo(() => {
    if (isMockEnabled()) return null;
    return createOctosApiClient(agent);
  }, [agent]);

  // Mock or real API call wrapper
  const callApi = useCallback(
    <T,>(fn: (client: OctosApiClient) => Promise<T>): Promise<T> => {
      if (isMockEnabled()) {
        return fn(octosMockApi as any) as Promise<T>;
      }
      if (!api) throw new Error("No API client");
      return fn(api);
    },
    [api],
  );

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const list = await callApi((c) => c.listProfiles());
      // 将后端配置转换为前端格式
      const convertedList = await Promise.all(
        list.map(async (p) => ({
          ...p,
          config: await initConfig(p.config),
        }))
      );
      setProfiles(convertedList);
      setConnected(true);
      if (convertedList.length > 0 && !selectedProfileId) {
        setSelectedProfileId(convertedList[0].id);
      }
    } catch {
      setConnected(false);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [callApi, selectedProfileId]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  const handleConfigChange = useCallback(
    (newConfig: OctosProfileConfig) => {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === selectedProfileId ? { ...p, config: newConfig } : p,
        ),
      );
    },
    [selectedProfileId],
  );

  const handleSave = useCallback(async () => {
    if (!selectedProfile) return;
    try {
      setSaving(true);
      // 将前端配置转换为后端格式
      const backendConfig = await prepareConfigForSave(selectedProfile.config);
      const updated = await callApi((c) =>
        c.updateProfile(selectedProfile.id, {
          id: selectedProfile.id,
          name: selectedProfile.name,
          config: backendConfig,
          email: userEmail, // 使用当前登录用户的邮箱
        }),
      );
      // 将返回的配置转换回前端格式
      const frontendUpdated = {
        ...updated,
        config: await initConfig(updated.config),
      };
      setProfiles((prev) =>
        prev.map((p) => (p.id === frontendUpdated.id ? frontendUpdated : p)),
      );
      message.success("配置已保存");
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }, [selectedProfile, callApi, userEmail]);

  const handleStartStop = useCallback(
    async (profileId: string, action: "start" | "stop" | "restart") => {
      try {
        await callApi((c) => {
          if (action === "start") return c.startGateway(profileId);
          if (action === "stop") return c.stopGateway(profileId);
          return c.restartGateway(profileId);
        });
        message.success(`${action === "start" ? "启动" : action === "stop" ? "停止" : "重启"}成功`);
        fetchProfiles();
      } catch (e: any) {
        message.error(e?.message || "操作失败");
      }
    },
    [callApi, fetchProfiles],
  );

  const handleDelete = useCallback(
    async (profileId: string) => {
      try {
        await callApi((c) => c.deleteProfile(profileId));
        message.success("已删除");
        if (selectedProfileId === profileId) {
          setSelectedProfileId(profiles.find((p) => p.id !== profileId)?.id || null);
        }
        fetchProfiles();
      } catch (e: any) {
        message.error(e?.message || "删除失败");
      }
    },
    [callApi, fetchProfiles, selectedProfileId, profiles],
  );

  const handlePurge = useCallback(
    async (profileId: string) => {
      try {
        const report = await callApi((c) => c.purgeProfile(profileId));
        setPurgeReport(report);
        setPurgeModalOpen(true);
        message.success("清理完成");
      } catch (e: any) {
        message.error(e?.message || "清理失败");
      }
    },
    [callApi],
  );

  // Connecting state
  if (loading && connected === null) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8 gap-3">
          <Spin />
          <Text type="secondary">连接 Octos 服务...</Text>
        </div>
      </Card>
    );
  }

  // Not connected
  if (connected === false) {
    const hasToken = !!((getClaw(agent).authConfig as Record<string, unknown>)?.authToken || (getClaw(agent).authConfig as Record<string, unknown>)?.token);
    return (
      <Alert
        type="error"
        showIcon
        message="无法连接 Octos 服务"
        description={
          <div className="space-y-2 mt-2">
            <p>端点地址：<Typography.Text code>{(getClaw(agent).endpointUrl as string) || "未配置"}</Typography.Text></p>
            <p>Auth Token：{hasToken ? <Tag color="green">已配置</Tag> : <Tag color="red">未配置</Tag>}</p>
            {!hasToken && (
              <p className="text-xs">
                请编辑此 Claw 实例，填入 Octos 服务启动时的 --auth-token 参数值
              </p>
            )}
            <p className="text-xs text-[var(--color-text-tertiary)]">
              启动命令示例：<Typography.Text code className="text-xs">octos serve --host 0.0.0.0 --port 8080 --auth-token YOUR_TOKEN</Typography.Text>
            </p>
          </div>
        }
        action={
          <Button size="small" onClick={fetchProfiles}>
            重试连接
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* System Status Banner */}
      <Card size="small" className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <Space>
          <InfoCircleOutlined className="text-blue-500" />
          <Text type="secondary" className="text-xs">
            Octos 服务状态:
          </Text>
          <Tag color={connected ? "success" : "error"}>
            {connected ? "已连接" : "未连接"}
          </Tag>
          <Text type="secondary" className="text-xs">
            {profiles.length} 个 Profile，{profiles.filter((p) => p.status.running).length} 个运行中
          </Text>
        </Space>
      </Card>

      {/* Profile Selector */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <span>Octos Profiles</span>
            <Space>
              <Popconfirm
                title="确认启动所有 Profile？"
                onConfirm={async () => {
                  try {
                    await callApi((c) => c.startAll());
                    message.success("已全部启动");
                    fetchProfiles();
                  } catch (e: any) {
                    message.error(e?.message || "操作失败");
                  }
                }}
              >
                <Button
                  size="small"
                  icon={<RocketOutlined />}
                >
                  全部启动
                </Button>
              </Popconfirm>
              <Popconfirm
                title="确认停止所有 Profile？"
                onConfirm={async () => {
                  try {
                    await callApi((c) => c.stopAll());
                    message.success("已全部停止");
                    fetchProfiles();
                  } catch (e: any) {
                    message.error(e?.message || "操作失败");
                  }
                }}
              >
                <Button
                  size="small"
                  danger
                  icon={<ClearOutlined />}
                >
                  全部停止
                </Button>
              </Popconfirm>
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setCreateOpen(true)}
              >
                新建
              </Button>
            </Space>
          </div>
        }
        size="small"
      >
        <div className="flex gap-2 flex-wrap">
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                selectedProfileId === p.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
              }`}
              onClick={() => setSelectedProfileId(p.id)}
            >
              <Tag
                color={p.status.running ? "green" : "default"}
                style={{ margin: 0 }}
              >
                {p.status.running ? "运行中" : "已停止"}
              </Tag>
              <span className="text-sm font-medium">{p.name}</span>
              <Space size={4}>
                <Button
                  size="small"
                  type="text"
                  icon={
                    p.status.running ? (
                      <PauseCircleOutlined />
                    ) : (
                      <PlayCircleOutlined />
                    )
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartStop(p.id, p.status.running ? "stop" : "start");
                  }}
                />
                <Popconfirm
                  title="确认删除此 Profile？"
                  onConfirm={() => handleDelete(p.id)}
                >
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
                <Popconfirm
                  title="确认清理此 Profile 数据？"
                  description="此操作将删除 Profile 的所有数据，包括对话历史、缓存等。"
                  onConfirm={() => handlePurge(p.id)}
                >
                  <Button
                    size="small"
                    type="text"
                    icon={<ClearOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </Space>
            </div>
          ))}
          {profiles.length === 0 && (
            <Empty
              description="暂无 Profile"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </Card>

      {/* Profile Configuration Tabs */}
      {selectedProfile && (
        <Card size="small">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "llm",
                label: (
                  <span>
                    <ThunderboltOutlined /> LLM Provider
                  </span>
                ),
                children: (
                  <OctosLlmProviderTab
                    config={selectedProfile.config}
                    onChange={handleConfigChange}
                  />
                ),
              },
              {
                key: "channels",
                label: (
                  <span>
                    <MessageOutlined /> 渠道
                  </span>
                ),
                children: (
                  <OctosChannelsTab
                    config={selectedProfile.config}
                    onChange={handleConfigChange}
                  />
                ),
              },
              {
                key: "gateway",
                label: (
                  <span>
                    <SettingOutlined /> 网关设置
                  </span>
                ),
                children: (
                  <OctosGatewaySettingsTab
                    config={selectedProfile.config}
                    onChange={handleConfigChange}
                  />
                ),
              },
              {
                key: "skills",
                label: (
                  <span>
                    <AppstoreOutlined /> Skills
                  </span>
                ),
                children: (
                  <OctosSkillsTab
                    profileId={selectedProfile.id}
                    apiClient={api || (octosMockApi as any)}
                  />
                ),
              },
              {
                key: "metrics",
                label: (
                  <span>
                    <LineChartOutlined /> 指标
                  </span>
                ),
                children: (
                  <OctosMetricsTab
                    profileId={selectedProfile.id}
                    apiClient={api || (octosMockApi as any)}
                  />
                ),
              },
              {
                key: "logs",
                label: (
                  <span>
                    <FileTextOutlined /> 日志
                  </span>
                ),
                children: (
                  <OctosLogsTab
                    profileId={selectedProfile.id}
                    apiClient={api || (octosMockApi as any)}
                  />
                ),
              },
              {
                key: "subaccounts",
                label: (
                  <span>
                    <TeamOutlined /> 子账户
                  </span>
                ),
                children: (
                  <OctosSubAccountsTab
                    profileId={selectedProfile.id}
                    apiClient={api || (octosMockApi as any)}
                  />
                ),
                // 仅当 Profile 无 parent_id 时显示（非子账户）
                style: { display: selectedProfile.parent_id ? 'none' : undefined },
              },
              {
                key: "monitor",
                label: (
                  <span>
                    <EyeOutlined /> 监控
                  </span>
                ),
                children: (
                  <OctosMonitorTab
                    apiClient={api || (octosMockApi as any)}
                  />
                ),
              },
            ]}
          />

          {/* Save Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => handleStartStop(selectedProfile.id, "restart")}
              >
                重启
              </Button>
            </Space>
            <Button type="primary" loading={saving} onClick={handleSave}>
              保存配置
            </Button>
          </div>
        </Card>
      )}

      {/* Create Profile Modal */}
      <Modal
        title="新建 Octos Profile"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={async () => {
          try {
            const form = document.getElementById("octos-create-form") as HTMLFormElement;
            const formData = new FormData(form);
            const id = formData.get("id") as string;
            const name = formData.get("name") as string;
            if (!id || !name) {
              message.error("请填写 ID 和名称");
              return;
            }
            await callApi((c) =>
              c.createProfile({
                id,
                name,
                enabled: true,
                config: {
                  provider: null,
                  model: null,
                  channels: [],
                  gateway: {},
                  env_vars: {},
                },
              }),
            );
            message.success("创建成功");
            setCreateOpen(false);
            fetchProfiles();
          } catch (e: any) {
            message.error(e?.message || "创建失败");
          }
        }}
      >
        <form id="octos-create-form" className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Profile ID</label>
            <Input name="id" placeholder="my-profile" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">名称</label>
            <Input name="name" placeholder="My Profile" />
          </div>
        </form>
      </Modal>

      {/* Purge Report Modal */}
      <Modal
        title="清理数据报告"
        open={purgeModalOpen}
        onCancel={() => setPurgeModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setPurgeModalOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        {purgeReport && (
          <Space direction="vertical" size={12} className="w-full">
            <div>
              <Text type="secondary">Profile ID:</Text>
              <div className="mt-1">
                <Text code>{purgeReport.profile_id}</Text>
              </div>
            </div>
            <div>
              <Text type="secondary">释放空间:</Text>
              <div className="mt-1">
                <Text strong>{(purgeReport.bytes_freed / 1024 / 1024).toFixed(2)} MB</Text>
              </div>
            </div>
            <div>
              <Text type="secondary">删除文件:</Text>
              <div className="mt-1 max-h-40 overflow-y-auto">
                {purgeReport.files_removed?.length > 0 ? (
                  <ul className="list-disc pl-4 text-xs">
                    {purgeReport.files_removed.map((file: string, idx: number) => (
                      <li key={idx} className="text-gray-600">
                        {file}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text type="secondary">无</Text>
                )}
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}
