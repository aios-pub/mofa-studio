/**
 * Octos 渠道配置 — 复用渠道管理
 * 从已配置的 Channels 中选择，而不是重新配置
 */

import { useState, useEffect } from "react";
import {
  Typography,
  Alert,
  Card,
  Space,
  Tag,
  Spin,
  Empty,
  Divider,
} from "antd";
import {
  LinkOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import type { OctosProfileConfig } from "@/types/octos";
import { channelApi } from "@/services";
import { channelTypeConfig } from "@/services/mock/channels";
import type { Channel } from "@/types/channel";

const { Text } = Typography;

interface Props {
  config: OctosProfileConfig;
  onChange: (config: OctosProfileConfig) => void;
}

// Octos 支持的渠道类型
const OCTOS_SUPPORTED_CHANNEL_TYPES = [
  'telegram',
  'discord',
  'slack',
  'whatsapp',
  'feishu',
  'email',
  'wecom_bot',
  'qq_bot',
  'wechat',
] as const;

export default function OctosChannelsTab({ config, onChange }: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);

  // 加载 Channels 列表
  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const data = await channelApi.getAll();
      // 只显示 Octos 支持的渠道类型
      const supportedChannels = data.filter((c: Channel) =>
        OCTOS_SUPPORTED_CHANNEL_TYPES.includes(c.type as any)
      );
      setChannels(supportedChannels);

      // 如果当前配置了 channel_ids，则设置选中的 channels
      if (config.channel_ids && config.channel_ids.length > 0) {
        const current = supportedChannels.filter((c: Channel) =>
          config.channel_ids?.includes(c.id)
        );
        setSelectedChannels(current);
      }
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

  // 检查是否使用旧模式配置
  const isLegacyMode = !config.channel_ids && config.channels && config.channels.length > 0;

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
        message="从已配置的渠道中选择，无需重新配置凭据"
        className="text-xs"
      />

      {/* 旧模式提示 */}
      {isLegacyMode && (
        <Alert
          type="warning"
          showIcon
          message="此 Profile 使用旧版渠道配置方式"
          description="建议重新选择渠道以使用新版配置，旧版配置方式可能在未来版本中移除"
          className="text-xs"
          closable
        />
      )}

      {/* 未选择渠道提示 */}
      {!isLegacyMode && (!config.channel_ids || config.channel_ids.length === 0) && (
        <Alert
          type="warning"
          showIcon
          message="未选择任何渠道"
          description={
            <div className="text-xs">
              <p>请至少选择一个渠道以启用消息收发功能。</p>
              <p className="mt-1 text-[var(--color-text-tertiary)]">
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
                <p className="text-[var(--color-text-tertiary)]">暂无可用渠道</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  请先在渠道管理页面添加渠道
                </p>
                <div className="mt-3 p-3 bg-[var(--color-bg-tertiary)] rounded text-left">
                  <p className="text-xs font-medium mb-1">Octos 支持的渠道类型：</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] break-all font-mono">
                    {OCTOS_SUPPORTED_CHANNEL_TYPES.join(', ')}
                  </p>
                </div>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {channels.map((channel) => {
              const isSelected = (config.channel_ids || []).includes(channel.id);
              const typeConfig = channelTypeConfig[channel.type];

              return (
                <Card
                  key={channel.id}
                  size="small"
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
                  }`}
                  onClick={() => handleChannelToggle(channel.id)}
                >
                  <Space direction="vertical" size={4} className="w-full">
                    <div className="flex items-start justify-between">
                      <Space>
                        <span className="text-2xl">{typeConfig?.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <Text strong className="text-[var(--color-text-primary)]">
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
                      <Tag color={channel.status === "active" ? "success" : "default"} className="text-xs">
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
        <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
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

      {/* 旧模式配置显示 (只读) */}
      {isLegacyMode && (
        <>
          <Divider orientation="left" className="text-xs">
            旧版配置 (只读)
          </Divider>
          <div className="space-y-2">
            {config.channels.map((channel, idx) => {
              const type = channel.type as keyof typeof OCTOS_CHANNEL_LABELS;
              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]"
                >
                  <Space>
                    <span>{OCTOS_CHANNEL_ICONS[type] || <LinkOutlined />}</span>
                    <Text>{OCTOS_CHANNEL_LABELS[type] || type}</Text>
                    <Tag color="default" className="text-xs">旧版配置</Tag>
                  </Space>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 说明 */}
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="渠道配置说明"
        description={
          <div className="text-xs mt-2">
            <ul className="space-y-1 list-disc pl-4">
              <li>只有已启用且状态正常的渠道才能被选择</li>
              <li>渠道的具体配置（如 Token、Secret）在渠道管理页面维护</li>
              <li>Octos 会自动将所选渠道的凭据转换为后端所需的格式</li>
            </ul>
            <div className="mt-2 p-2 bg-[var(--color-bg-tertiary)] rounded">
              <p className="font-medium mb-1">后端配置格式示例：</p>
              <pre className="text-xs text-[var(--color-text-tertiary)] overflow-x-auto">
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

// Octos 渠道标签（用于旧版配置显示）
const OCTOS_CHANNEL_LABELS = {
  telegram: 'Telegram',
  discord: 'Discord',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
  feishu: '飞书',
  email: '邮件',
  wecom_bot: '企业微信',
  qq_bot: 'QQ Bot',
  wechat: '微信',
};

const OCTOS_CHANNEL_ICONS = {
  telegram: '✈️',
  discord: '💬',
  slack: '📱',
  whatsapp: '📱',
  feishu: '🐦',
  email: '📧',
  wecom_bot: '💼',
  qq_bot: '🐧',
  wechat: '💚',
};
