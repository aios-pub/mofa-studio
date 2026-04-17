/**
 * Octos 管理面板 — 嵌入 ClawsList 的 Octos 类型详情视图
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
  message,
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
} from "@ant-design/icons";
import type { ClawInstance } from "@/types/claw";
import type { OctosProfileResponse, OctosProfileConfig } from "@/types/octos";
import { createOctosApiClient } from "@/services";
import { isMockEnabled, octosMockApi } from "@/services";
import { OctosApiClient } from "@/services/real/octos";
import OctosLlmProviderTab from "./OctosLlmProviderTab";
import OctosChannelsTab from "./OctosChannelsTab";
import OctosGatewaySettingsTab from "./OctosGatewaySettingsTab";

interface Props {
  claw: ClawInstance;
}

export default function OctosManagementPanel({ claw }: Props) {
  const [profiles, setProfiles] = useState<OctosProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profiles");

  const api = useMemo(() => {
    if (isMockEnabled()) return null;
    return createOctosApiClient(claw);
  }, [claw]);

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
      setProfiles(list);
      setConnected(true);
      if (list.length > 0 && !selectedProfileId) {
        setSelectedProfileId(list[0].id);
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
      const updated = await callApi((c) =>
        c.updateProfile(selectedProfile.id, { config: selectedProfile.config }),
      );
      setProfiles((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
      message.success("配置已保存");
    } catch (e: any) {
      message.error(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }, [selectedProfile, callApi]);

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

  // Connecting state
  if (loading && connected === null) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Spin tip="连接 Octos 服务..." />
        </div>
      </Card>
    );
  }

  // Not connected
  if (connected === false) {
    const hasToken = !!(claw.authConfig?.authToken || claw.authConfig?.token);
    return (
      <Alert
        type="error"
        showIcon
        message="无法连接 Octos 服务"
        description={
          <div className="space-y-2 mt-2">
            <p>端点地址：<Typography.Text code>{claw.endpointUrl || "未配置"}</Typography.Text></p>
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
      {/* Profile Selector */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <span>Octos Profiles</span>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              新建
            </Button>
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
                    profileId={selectedProfile.id}
                    apiClient={api || (octosMockApi as any)}
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
    </div>
  );
}
