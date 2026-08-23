/**
 * Empty state component
 * Empty display for lists, tables, etc.
 */

import { Button } from 'antd';
import React from 'react';
import {
  InboxOutlined,
  SearchOutlined,
  FileTextOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';

export type EmptyType = 'default' | 'search' | 'data' | 'user' | 'settings';

export interface EmptyStateProps {
  type?: EmptyType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const iconMap: Record<EmptyType, React.ReactNode> = {
  default: <InboxOutlined />,
  search: <SearchOutlined />,
  data: <FileTextOutlined />,
  user: <UserOutlined />,
  settings: <SettingOutlined />,
};

const defaultTitles: Record<EmptyType, string> = {
  default: '暂无数据',
  search: '未找到相关内容',
  data: '暂无记录',
  user: '暂无用户',
  settings: '暂无配置',
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'default',
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        py-12 px-4
        text-center
        ${className}
      `}
    >
      {/* Icon */}
      <div className="text-[var(--color-text-tertiary)] text-5xl mb-4">
        {icon || iconMap[type]}
      </div>

      {/* Title */}
      <h3 className="text-base font-medium text-[var(--color-text-primary)] mb-2">
        {title || defaultTitles[type]}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-[var(--color-text-secondary)] mb-4 max-w-sm">
          {description}
        </p>
      )}

      {/* Action */}
      {action && (
        <Button type="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
