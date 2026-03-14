/**
 * 数据表格组件
 * 基于 Ant Design Table 封装，提供统一的样式和功能
 */

import { forwardRef, useMemo } from 'react';
import { Table, ConfigProvider } from 'antd';
import type { TableProps, TablePaginationConfig } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { LoadingOutlined } from '@ant-design/icons';
import { EmptyState } from './EmptyState';

// 扩展的表格属性
export interface DataTableProps<T = any> extends Omit<TableProps<T>, 'loading' | 'pagination'> {
  /** 列配置 */
  columns: ColumnsType<T>;
  /** 数据源 */
  dataSource: T[];
  /** 加载状态 */
  loading?: boolean;
  /** 加载提示文字 */
  loadingTip?: string;
  /** 分页配置 */
  pagination?: TablePaginationConfig | false;
  /** 空状态配置 */
  emptyConfig?: {
    type?: 'default' | 'search' | 'data';
    title?: string;
    description?: string;
  };
  /** 是否显示边框 */
  bordered?: boolean;
  /** 表格大小 */
  size?: 'small' | 'middle' | 'large';
  /** 行 key 字段 */
  rowKey?: string | ((record: T) => string);
  /** 是否显示斑马纹 */
  striped?: boolean;
  /** 是否可悬停 */
  hoverable?: boolean;
}

/**
 * 数据表格组件
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
      bordered = false,
      size = 'middle',
      rowKey = 'id',
      striped = false,
      hoverable = true,
      className = '',
      ...restProps
    },
    ref
  ) => {
    // 分页配置
    const paginationConfig: TablePaginationConfig | false = useMemo(() => {
      if (pagination === false) return false;

      return {
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50', '100'],
        ...pagination,
        className: 'px-4 py-3',
      };
    }, [pagination]);

    // 表格类名
    const tableClassName = useMemo(() => {
      const classes = ['data-table'];

      if (striped) classes.push('data-table--striped');
      if (hoverable) classes.push('data-table--hoverable');
      if (bordered) classes.push('data-table--bordered');

      return classes.join(' ');
    }, [striped, hoverable, bordered]);

    // 自定义空状态
    const locale = {
      emptyText: (
        <EmptyState
          type={emptyConfig?.type || 'data'}
          title={emptyConfig?.title}
          description={emptyConfig?.description}
        />
      ),
    };

    // 加载指示器
    const loadingConfig = {
      spinning: loading,
      indicator: <LoadingOutlined style={{ fontSize: 24 }} spin />,
      tip: loadingTip,
    };

    return (
      <ConfigProvider
        renderEmpty={() => (
          <EmptyState
            type={emptyConfig?.type || 'data'}
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
          bordered={bordered}
          size={size}
          rowKey={rowKey}
          locale={locale}
          className={`${tableClassName} ${className}`}
          {...restProps}
        />
      </ConfigProvider>
    );
  }
);

DataTable.displayName = 'DataTable';

export default DataTable;
