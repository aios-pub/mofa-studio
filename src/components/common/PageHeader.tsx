/**
 * 页面头部组件
 * 提供一致的页面标题、描述和操作区域
 */

import React from 'react';
import { Space } from 'antd';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  actions,
  breadcrumbs,
  className = '',
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <div className="mb-2">
          {breadcrumbs}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        {/* Left side: Title and description */}
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--color-primary-lighter)] flex items-center justify-center text-[var(--color-primary)]">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Actions */}
        {actions && (
          <Space>
            {actions}
          </Space>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
