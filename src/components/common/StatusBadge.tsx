/**
 * 状态徽章组件
 * 参考 slash-admin 的 Badge 组件设计
 */

import { Tag } from 'antd';
import type { TagProps } from 'antd';
import React from 'react';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'default' | 'processing';

export interface StatusBadgeProps extends Omit<TagProps, 'color'> {
  status?: StatusType;
  dot?: boolean;
}

const statusConfig: Record<StatusType, { color: string; bgClass: string; textClass: string }> = {
  success: {
    color: 'success',
    bgClass: 'bg-[var(--color-success-lighter)]',
    textClass: 'text-[var(--color-success-dark)]',
  },
  warning: {
    color: 'warning',
    bgClass: 'bg-[var(--color-warning-lighter)]',
    textClass: 'text-[var(--color-warning-dark)]',
  },
  error: {
    color: 'error',
    bgClass: 'bg-[var(--color-error-lighter)]',
    textClass: 'text-[var(--color-error-dark)]',
  },
  info: {
    color: 'processing',
    bgClass: 'bg-[var(--color-info-lighter)]',
    textClass: 'text-[var(--color-info-dark)]',
  },
  default: {
    color: 'default',
    bgClass: 'bg-[var(--color-bg-tertiary)]',
    textClass: 'text-[var(--color-text-secondary)]',
  },
  processing: {
    color: 'processing',
    bgClass: 'bg-[var(--color-primary-lighter)]',
    textClass: 'text-[var(--color-primary-dark)]',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'default',
  dot = false,
  children,
  className = '',
  ...props
}) => {
  const config = statusConfig[status];

  if (dot) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'success'
              ? 'bg-[var(--color-success)]'
              : status === 'warning'
                ? 'bg-[var(--color-warning)]'
                : status === 'error'
                  ? 'bg-[var(--color-error)]'
                  : status === 'processing'
                    ? 'bg-[var(--color-primary)] animate-pulse'
                    : 'bg-[var(--color-gray-400)]'
          }`}
        />
        {children}
      </span>
    );
  }

  return (
    <Tag
      color={config.color}
      className={`
        inline-flex items-center px-2 py-0.5
        text-xs font-medium rounded-md
        border-none
        ${config.bgClass} ${config.textClass}
        ${className}
      `}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default StatusBadge;
