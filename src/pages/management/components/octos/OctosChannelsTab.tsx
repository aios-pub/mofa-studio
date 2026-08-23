/**
 * Octos 渠道配置 — 复用渠道管理
 * 从已配置的 Channels 中选择，而不是重新配置
 */

import { useState, useEffect } from "react";
import { Typography, Alert, Card, Space, Tag, Spin, Empty } from "antd";
import { InfoCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { OctosProfileConfig } from "@/types/octos";
import { channelApi } from "@/services";
import { channelTypeConfig } from "@/services/mock/channels";
import type { Channel } from "@/types/channel";

const { Text } = Typography;

interface Props {
  config: OctosProfileConfig;
  onChange: (config: OctosProfileConfig) => void;
}

// Octos Supported Channel types
const OCTOS_SUPPORTED_CHANNEL_TYPES = [
  "telegram",
  "discord",
  "slack",
  "whatsapp",
  "feishu",
  "email",
  "wecom_bot",
  "qq_bot",
  "wechat",
] as const;

export default function OctosChannelsTab({ config, onChange }: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);

  // 加载 Channels 列表
  useEffect(() => {
    loadChannels();
  }, []);

  // 当 config.channel_ids 或 channels 变化时，同步更新 selectedChannels
  useEffect(() => {
    if (
      config.channel_ids &&
      config.channel_ids.length > 0 &&
      channels.length > 0
    ) {
      const current = channels.filter((c: Channel) =>
        config.channel_ids?.includes(c.id),
      );
      setSelectedChannels(current);
    } else if (!config.channel_ids || config.channel_ids.length === 0) {
      setSelectedChannels([]);
    }
  }, [config.channel_ids, channels]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const data = await channelApi.getAll();
      // 只显示 Octos Supported Channel types
      const supportedChannels = data.filter((c: Channel) =>
        OCTOS_SUPPORTED_CHANNEL_TYPES.includes(c.type as any),
      );
      setChannels(supportedChannels);
    } catch (error) {
      console.error("Failed to load channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (patch: Partial<OctosProfileConfig>) => {
    onChange({ ...config, ...patch });
  };

  // 选择/取消选择 Channel
  const handleChannelToggle = (channelId: string) => {
    const currentIds = config.channel_ids || [];
    const isSelected = currentIds.includes(channelId);

    let newIds: string[];
    if (isSelected) {
      newIds = currentIds.filter((id) => id !== channelId);
    } else {
      newIds = [...currentIds, channelId];
    }

    // 更新选中的 channels
    const newSelected = channels.filter((c) => newIds.includes(c.id));
    setSelectedChannels(newSelected);

    updateConfig({ channel_ids: newIds });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Space>
          <Spin />
          <Text type="secondary">加载渠道列表...</Text>
        </Space>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        title="从已配置的渠道中选择，无需重新配置凭据"
        className="text-xs"
      />

      {/* 未选择渠道提示 */}
      {(!config.channel_ids || config.channel_ids.length === 0) && (
        <Alert
          type="warning"
          showIcon
          title="未选择任何渠道"
          description={
            <div className="text-xs">
              <p>请至少选择一个渠道以启用消息收发功能。</p>
              <p className="mt-1 text-(--color-text-tertiary)">
                Octos 将使用所选渠道的凭据（如 Token、Secret）进行消息通信。
              </p>
            </div>
          }
        />
      )}

      {/* 渠道选择 */}
      <div>
        <Text type="secondary" className="block mb-3">
          选择可用渠道
        </Text>

        {channels.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="text-center">
                <p className="text-(--color-text-tertiary)">暂无可用渠道</p>
                <p className="text-xs text-(--color-text-tertiary) mt-1">
                  请先在渠道管理页面添加渠道
                </p>
                <div className="mt-3 p-3 bg-(--color-bg-tertiary) rounded text-left">
                  <p className="text-xs font-medium mb-1">
                    Octos 支持的渠道类型：
                  </p>
                  <p className="text-xs text-(--color-text-tertiary) break-all font-mono">
                    {OCTOS_SUPPORTED_CHANNEL_TYPES.join(", ")}
                  </p>
                </div>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {channels.map((channel) => {
              const isSelected = (config.channel_ids || []).includes(
                channel.id,
              );
              const typeConfig = channelTypeConfig[channel.type];

              return (
                <Card
                  key={channel.id}
                  size="small"
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? "border-(--color-primary) bg-(--color-primary-bg)"
                      : "border-(--color-border) hover:border-(--color-primary)/50"
                  }`}
                  onClick={() => handleChannelToggle(channel.id)}
                >
                  <Space orientation="vertical" size={4} className="w-full">
                    <div className="flex items-start justify-between">
                      <Space>
                        <span className="text-2xl">{typeConfig?.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <Text
                              strong
                              className="text-[var(--color-text-primary)]"
                            >
                              {channel.name}
                            </Text>
                            {isSelected && (
                              <CheckCircleOutlined className="text-[var(--color-primary)]" />
                            )}
                          </div>
                          <Text type="secondary" className="text-xs">
                            {typeConfig?.name}
                          </Text>
                        </div>
                      </Space>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag
                        color={channel.enabled ? "success" : "default"}
                        className="text-xs"
                      >
                        {channel.enabled ? "已启用" : "已禁用"}
                      </Tag>
                      <Tag
                        color={
                          channel.status === "active" ? "success" : "default"
                        }
                        className="text-xs"
                      >
                        {channel.status === "active" ? "正常" : "离线"}
                      </Tag>
                    </div>
                  </Space>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 已选渠道汇总 */}
      {selectedChannels.length > 0 && (
        <div className="p-4 rounded-lg border border-(--color-border) bg-[var(--color-bg-secondary)]">
          <Text type="secondary" className="block mb-2">
            已选择 {selectedChannels.length} 个渠道
          </Text>
          <Space wrap>
            {selectedChannels.map((channel) => {
              const typeConfig = channelTypeConfig[channel.type];
              return (
                <Tag
                  key={channel.id}
                  icon={<span>{typeConfig?.icon}</span>}
                  closable
                  onClose={(e) => {
                    e.stopPropagation();
                    handleChannelToggle(channel.id);
                  }}
                  color="blue"
                >
                  {channel.name}
                </Tag>
              );
            })}
          </Space>
        </div>
      )}

      {/* 说明 */}
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        title="渠道配置说明"
        description={
          <div className="text-xs mt-2">
            <ul className="space-y-1 list-disc pl-4">
              <li>只有已启用且状态正常的渠道才能被选择</li>
              <li>渠道的具体配置（如 Token、Secret）在渠道管理页面维护</li>
              <li>Octos 会自动将所选渠道的凭据转换为后端所需的格式</li>
            </ul>
            <div className="mt-2 p-2 bg-(--color-bg-tertiary) rounded">
              <p className="font-medium mb-1">后端配置格式示例：</p>
              <pre className="text-xs text-(--color-text-tertiary) overflow-x-auto">
                {`{
  "channels": [
    {
      "type": "feishu",
      "settings": {
        "app_id_env": "FEISHU_APP_ID",
        "app_secret_env": "FEISHU_APP_SECRET"
      }
    }
  ]
}`}
              </pre>
            </div>
          </div>
        }
      />
    </div>
  );
}
