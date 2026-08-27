/**
 * Page container component
 * Provides consistent page layout with header and content area
 */

import React from 'react';
import { Card, Space } from 'antd';
import type { CardProps } from 'antd';

export interface PageContainerProps extends Omit<CardProps, 'title'> {
  title?: string;
  description?: string;
  headerActions?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  headerActions,
  bordered = true,
  className = '',
  children,
  ...props
}) => {
  return (
    <Card
      bordered={bordered}
      className={`rounded-xl ${className}`}
      styles={{ body: { padding: 0 } }}
      {...props}
    >
      {(title || headerActions) && (
        <div className="px-6 py-4 border-b border-(--color-border) flex items-center justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {description}
              </p>
            )}
          </div>
          {headerActions && (
            <Space>
              {headerActions}
            </Space>
          )}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </Card>
  );
};

export default PageContainer;
