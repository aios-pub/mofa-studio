/**
 * 描述列表组件
 * 用于展示信息的Key-value pair
 */

import React from "react";
import { Descriptions as AntDescriptions, Empty, Skeleton } from "antd";
import type { DescriptionsProps } from "antd";

// 描述项类型
export interface DescriptionItem {
  /** Label */
  label: React.ReactNode;
  /** 值 */
  value: React.ReactNode;
  /** 占用列数 */
  span?: number;
  /** 是否显示 */
  show?: boolean;
}

export interface DataDescriptionsProps extends Omit<
  DescriptionsProps,
  "items"
> {
  /** 描述项列表 */
  items: DescriptionItem[];
  /** 是否加载中 */
  loading?: boolean;
  /** 是否为空 */
  empty?: boolean;
  /** Empty state文字 */
  emptyText?: string;
  /** 列数 */
  columns?: number;
  /** Label宽度 */
  labelWidth?: number | string;
  /** 是否显示边框 */
  variant?: boolean;
  /** 尺寸 */
  size?: "small" | "default" | "middle";
  /** 是否显示冒号 */
  colon?: boolean;
}

/**
 * 数据描述列表组件
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

  // 过滤显示的项目
  const visibleItems = items.filter((item) => item.show !== false);

  // 转换为 Ant Design 格式
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

// 简化版描述列表
export interface SimpleDescriptionsProps {
  /** 数据对象 */
  data?: Record<string, any>;
  /** 字段映射 */
  fields: Array<{
    key: string;
    label: string;
    render?: (value: any, data: Record<string, any>) => React.ReactNode;
    span?: number;
  }>;
  /** 是否加载中 */
  loading?: boolean;
  /** 列数 */
  columns?: number;
  /** Label宽度 */
  labelWidth?: number | string;
  /** 是否显示边框 */
  variant?: boolean;
  /** 尺寸 */
  size?: "small" | "default" | "middle";
  /** 类名 */
  className?: string;
}

/**
 * 简化版描述列表
 * 直接传入数据和字段配置
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

// 垂直描述列表
export interface VerticalDescriptionsProps {
  /** 描述项 */
  items: DescriptionItem[];
  /** 是否加载中 */
  loading?: boolean;
  /** Label宽度 */
  labelWidth?: number | string;
  /** Label对齐 */
  labelAlign?: "left" | "right";
  /** 间隙大小 */
  gutter?: number;
  /** 类名 */
  className?: string;
}

/**
 * 垂直描述列表
 * 每行显示一个Key-value pair
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
