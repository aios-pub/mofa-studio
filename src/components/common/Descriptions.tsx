/**
 * Description list component
 * Key-value pair for displaying information
 */

import React from "react";
import { Descriptions as AntDescriptions, Empty, Skeleton } from "antd";
import type { DescriptionsProps } from "antd";

// Description item type
export interface DescriptionItem {
  /** Label */
  label: React.ReactNode;
  /** Value */
  value: React.ReactNode;
  /** Column span */
  span?: number;
  /** Whether to show */
  show?: boolean;
}

export interface DataDescriptionsProps extends Omit<
  DescriptionsProps,
  "items"
> {
  /** Description item list */
  items: DescriptionItem[];
  /** Whether loading */
  loading?: boolean;
  /** Whether empty */
  empty?: boolean;
  /** Empty state text */
  emptyText?: string;
  /** Column count */
  columns?: number;
  /** Tab width */
  labelWidth?: number | string;
  /** Whether to show borders */
  variant?: boolean;
  /** Size */
  size?: "small" | "default" | "middle";
  /** Whether to show colons */
  colon?: boolean;
}

/**
 * Data description list component
 */
export const DataDescriptions: React.FC<DataDescriptionsProps> = ({
  items,
  loading = false,
  empty = false,
  emptyText = "暂无数据",
  columns = 3,
  labelWidth,
  variant = false,
  size = "default",
  colon = true,
  className = "",
  ...restProps
}) => {
  // Loading state
  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <Skeleton
          active
          paragraph={{ rows: Math.ceil(items.length / columns) }}
        />
      </div>
    );
  }

  // Empty state
  if (empty || items.length === 0) {
    return (
      <div className={`py-8 ${className}`}>
        <Empty description={emptyText} />
      </div>
    );
  }

  // Filter displayed items
  const visibleItems = items.filter((item) => item.show !== false);

  // Convert to Ant Design format
  const antdItems = visibleItems.map((item, index) => ({
    key: index,
    label: item.label,
    children: item.value ?? "-",
    span: item.span || 1,
    labelStyle: labelWidth ? { width: labelWidth } : undefined,
  }));

  return (
    <AntDescriptions
      variant={variant}
      size={size}
      colon={colon}
      column={columns}
      items={antdItems}
      className={`data-descriptions ${className}`}
      {...restProps}
    />
  );
};

// Simplified description list
export interface SimpleDescriptionsProps {
  /** Data object */
  data?: Record<string, any>;
  /** Field mapping */
  fields: Array<{
    key: string;
    label: string;
    render?: (value: any, data: Record<string, any>) => React.ReactNode;
    span?: number;
  }>;
  /** Whether loading */
  loading?: boolean;
  /** Column count */
  columns?: number;
  /** Tab width */
  labelWidth?: number | string;
  /** Whether to show borders */
  variant?: boolean;
  /** Size */
  size?: "small" | "default" | "middle";
  /** Class name */
  className?: string;
}

/**
 * Simplified description list
 * Pass data and field configuration directly
 */
export const SimpleDescriptions: React.FC<SimpleDescriptionsProps> = ({
  data,
  fields,
  loading = false,
  columns = 3,
  labelWidth,
  variant = false,
  size = "default",
  className = "",
}) => {
  const items: DescriptionItem[] = fields.map((field) => ({
    label: field.label,
    value: field.render
      ? field.render(data?.[field.key], data || {})
      : (data?.[field.key] ?? "-"),
    span: field.span || 1,
  }));

  return (
    <DataDescriptions
      items={items}
      loading={loading}
      empty={!data}
      columns={columns}
      labelWidth={labelWidth}
      variant={variant}
      size={size}
      className={className}
    />
  );
};

// Vertical descriptions
export interface VerticalDescriptionsProps {
  /** Description item */
  items: DescriptionItem[];
  /** Whether loading */
  loading?: boolean;
  /** Tab width */
  labelWidth?: number | string;
  /** Tab alignment */
  labelAlign?: "left" | "right";
  /** Gap size */
  gutter?: number;
  /** Class name */
  className?: string;
}

/**
 * Vertical descriptions
 * One key-value pair per row
 */
export const VerticalDescriptions: React.FC<VerticalDescriptionsProps> = ({
  items,
  loading = false,
  labelWidth = 100,
  labelAlign = "right",
  gutter = 16,
  className = "",
}) => {
  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: items.length || 3 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton.Button
              active
              size="small"
              style={{ width: labelWidth }}
            />
            <Skeleton.Input active size="small" className="flex-1" />
          </div>
        ))}
      </div>
    );
  }

  const visibleItems = items.filter((item) => item.show !== false);

  return (
    <div className={className} style={{ gap: gutter }}>
      {visibleItems.map((item, index) => (
        <div
          key={index}
          className="flex items-start py-2"
          style={{ gap: gutter }}
        >
          <div
            className="flex-shrink-0 text-[var(--color-text-secondary)]"
            style={{
              width: labelWidth,
              textAlign: labelAlign,
            }}
          >
            {item.label}:
          </div>
          <div className="flex-1 text-[var(--color-text-primary)]">
            {item.value ?? "-"}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DataDescriptions;
