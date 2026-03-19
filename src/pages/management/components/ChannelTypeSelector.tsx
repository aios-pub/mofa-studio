/**
 * 渠道类型选择器组件
 */

import { Modal } from 'antd';
import { channelTypeConfig } from '@/services';
import type { ChannelType } from '../../../types';

interface ChannelTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ChannelType) => void;
}

export default function ChannelTypeSelector({
  open,
  onClose,
  onSelect,
}: ChannelTypeSelectorProps) {
  const channelTypes = Object.entries(channelTypeConfig) as [ChannelType, typeof channelTypeConfig[ChannelType]][];

  return (
    <Modal
      title="选择渠道类型"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div className="grid grid-cols-3 gap-4 py-4">
        {channelTypes.map(([type, config]) => (
          <div
            key={type}
            onClick={() => onSelect(type)}
            className="flex flex-col items-center p-4 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 cursor-pointer transition-all"
          >
            <span className="text-3xl mb-2">{config.icon}</span>
            <span className="font-medium text-[var(--color-text-primary)]">
              {config.name}
            </span>
            <span className="text-xs text-[var(--color-text-tertiary)] text-center mt-1">
              {config.description}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
