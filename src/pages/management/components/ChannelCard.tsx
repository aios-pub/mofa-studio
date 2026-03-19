/**
 * 渠道卡片组件
 */

import { Tag, Dropdown, Button } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, ApiOutlined } from '@ant-design/icons';
import { channelTypeConfig } from '@/services';
import type { Channel, ChannelStatus } from '../../../types';

// 状态配置
const statusConfig: Record<ChannelStatus, { color: string; text: string }> = {
  active: { color: 'green', text: '正常' },
  inactive: { color: 'default', text: '未激活' },
  connecting: { color: 'blue', text: '连接中' },
  error: { color: 'red', text: '异常' },
  disabled: { color: 'default', text: '已禁用' },
};

interface ChannelCardProps {
  channel: Channel;
  selected?: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
}

export default function ChannelCard({
  channel,
  selected,
  onClick,
  onEdit,
  onDelete,
  onTest,
}: ChannelCardProps) {
  const typeInfo = channelTypeConfig[channel.type];

  const menuItems = [
    {
      key: 'test',
      label: '测试连接',
      icon: <ApiOutlined />,
      onClick: onTest,
    },
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: onEdit,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: onDelete,
    },
  ];

  return (
    <div
      onClick={onClick}
      className={`group p-3 rounded-lg cursor-pointer transition-colors ${
        selected
          ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
          : 'hover:bg-[var(--color-bg-tertiary)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">{typeInfo.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--color-text-primary)] truncate">
              {channel.name}
            </span>
            <Tag color={statusConfig[channel.status].color} className="text-xs leading-tight px-1">
              {statusConfig[channel.status].text}
            </Tag>
          </div>
          <p className="text-sm text-[var(--color-text-tertiary)] truncate">{typeInfo.name}</p>
        </div>
        <Dropdown
          menu={{ items: menuItems }}
          trigger={['click']}
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
}
