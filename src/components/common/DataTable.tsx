/**
 * Data table component
 * Wrapper over Ant Design Table providing unified styling and features
 */

import { forwardRef, useMemo } from "react";
import { Table, ConfigProvider } from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import type { ColumnsType } from "antd/es/table";
import { LoadingOutlined } from "@ant-design/icons";
import { EmptyState } from "./EmptyState";

// Extended table props
export interface DataTableProps<T = any> extends Omit<
  TableProps<T>,
  "loading" | "pagination"
> {
  /** Column configuration */
  columns: ColumnsType<T>;
  /** Data source */
  dataSource: T[];
  /** Loading state */
  loading?: boolean;
  /** Loading hint text */
  loadingTip?: string;
  /** Pagination configuration */
  pagination?: TablePaginationConfig | false;
  /** Empty state configuration */
  emptyConfig?: {
    type?: "default" | "search" | "data";
    title?: string;
    description?: string;
  };
  /** Whether to show borders */
  variant?: boolean;
  /** Table size */
  size?: "small" | "middle" | "large";
  /** Row key field */
  rowKey?: string | ((record: T) => string);
  /** Whether to show zebra stripes */
  striped?: boolean;
  /** Hoverable */
  hoverable?: boolean;
}

/**
 * Data table component
 */
export const DataTable = forwardRef<any, DataTableProps<any>>(
  (
    {
      columns,
      dataSource,
      loading = false,
      loadingTip,
      pagination,
      emptyConfig,
      variant = false,
      size = "middle",
      rowKey = "id",
      striped = false,
      hoverable = true,
      className = "",
      ...restProps
    },
    ref,
  ) => {
    // Pagination configuration
    const paginationConfig: TablePaginationConfig | false = useMemo(() => {
      if (pagination === false) return false;

      return {
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
        pageSizeOptions: ["10", "20", "50", "100"],
        ...pagination,
        className: "px-4 py-3",
      };
    }, [pagination]);

    // Table class name
    const tableClassName = useMemo(() => {
      const classes = ["data-table"];

      if (striped) classes.push("data-table--striped");
      if (hoverable) classes.push("data-table--hoverable");
      if (variant) classes.push("data-table--variant");

      return classes.join(" ");
    }, [striped, hoverable, variant]);

    // CustomEmpty state
    const locale = {
      emptyText: (
        <EmptyState
          type={emptyConfig?.type || "data"}
          title={emptyConfig?.title}
          description={emptyConfig?.description}
        />
      ),
    };

    // Loading indicator
    const loadingConfig = {
      spinning: loading,
      indicator: <LoadingOutlined style={{ fontSize: 24 }} spin />,
      tip: loadingTip,
    };

    return (
      <ConfigProvider
        renderEmpty={() => (
          <EmptyState
            type={emptyConfig?.type || "data"}
            title={emptyConfig?.title}
            description={emptyConfig?.description}
          />
        )}
      >
        <Table
          ref={ref}
          columns={columns}
          dataSource={dataSource}
          pagination={paginationConfig}
          loading={loadingConfig}
          variant={variant}
          size={size}
          rowKey={rowKey}
          locale={locale}
          className={`${tableClassName} ${className}`}
          {...restProps}
        />
      </ConfigProvider>
    );
  },
);

DataTable.displayName = "DataTable";

export default DataTable;
