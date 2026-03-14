/**
 * 审计日志页面
 * 使用 Ant Design 组件重构
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  Select,
  Button,
  Tag,
  Space,
  DatePicker,
  Input,
  Drawer,
  Descriptions,
  Badge,
  Dropdown,
  Typography,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  FundOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/common';
import type { AuditLog, AuditAction } from '../../services/mock/auditLogs';
import { auditLogApi } from '../../services/mock/auditLogs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const actionLabels: Record<AuditAction, string> = {
  login: '登录',
  logout: '退出',
  create: '创建',
  update: '更新',
  delete: '删除',
  view: '查看',
  export: '导出',
  import: '导入',
  execute: '执行',
  config_change: '配置变更',
};

const actionColors: Record<AuditAction, string> = {
  login: 'green',
  logout: 'default',
  create: 'blue',
  update: 'orange',
  delete: 'red',
  view: 'purple',
  export: 'cyan',
  import: 'geekblue',
  execute: 'gold',
  config_change: 'pink',
};

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    success: number;
    failure: number;
  } | null>(null);

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterResource, setFilterResource] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // 选项数据
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [actionTypes, setActionTypes] = useState<AuditAction[]>([]);

  const loadOptions = useCallback(async () => {
    const [resources, actions] = await Promise.all([
      auditLogApi.getResourceTypes(),
      auditLogApi.getActionTypes(),
    ]);
    setResourceTypes(resources);
    setActionTypes(actions);
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        auditLogApi.getLogs({
          action: (filterAction as AuditAction) || undefined,
          resource: filterResource || undefined,
          status: (filterStatus as 'success' | 'failure') || undefined,
          startDate: dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
          endDate: dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
          search: searchQuery || undefined,
        }),
        auditLogApi.getStats({
          startDate: dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
          endDate: dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
        }),
      ]);
      setLogs(logsData);
      setStats({
        total: statsData.total,
        success: statsData.success,
        failure: statsData.failure,
      });
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterResource, filterStatus, dateRange, searchQuery]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExport = async (format: 'csv' | 'json') => {
    const data = await auditLogApi.exportLogs(format, {
      action: (filterAction as AuditAction) || undefined,
      resource: filterResource || undefined,
      status: (filterStatus as 'success' | 'failure') || undefined,
      startDate: dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
      endDate: dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
      search: searchQuery || undefined,
    });

    const blob = new Blob([data], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterAction('');
    setFilterResource('');
    setFilterStatus('');
    setDateRange(null);
  };

  const handleRowClick = (record: AuditLog) => {
    setSelectedLog(record);
    setDrawerOpen(true);
  };

  const formatDateTime = (date: Date) => {
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  };

  // 表格列配置
  const columns: ColumnsType<AuditLog> = [
    {
      title: t('auditLog.timestamp', '时间'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      render: (date: Date) => (
        <Text type="secondary">{formatDateTime(date)}</Text>
      ),
    },
    {
      title: t('auditLog.user', '用户'),
      dataIndex: 'userName',
      key: 'userName',
      width: 140,
      render: (name: string) => (
        <Space>
          <div className="w-6 h-6 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
            <span className="text-xs font-medium text-[var(--color-primary)]">
              {name?.charAt(0) || '?'}
            </span>
          </div>
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: t('auditLog.action', '操作'),
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: AuditAction) => (
        <Tag color={actionColors[action]}>{actionLabels[action]}</Tag>
      ),
    },
    {
      title: t('auditLog.resource', '资源'),
      key: 'resource',
      render: (_, record) => (
        <div>
          <Text>{record.resource}</Text>
          {record.resourceName && (
            <Text type="secondary" className="ml-1">
              / {record.resourceName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: t('auditLog.status', '状态'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) =>
        status === 'success' ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            {t('common.success', '成功')}
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            {t('common.error', '失败')}
          </Tag>
        ),
    },
  ];

  // 统计卡片
  const statCards = stats && (
    <div className="grid grid-cols-3 gap-4 mb-4">
      <Card size="small">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <FundOutlined className="text-xl text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)]">总记录数</p>
            <p className="text-lg font-semibold">{stats.total}</p>
          </div>
        </div>
      </Card>
      <Card size="small">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <CheckCircleOutlined className="text-xl text-green-500" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)]">成功操作</p>
            <p className="text-lg font-semibold text-green-500">{stats.success}</p>
          </div>
        </div>
      </Card>
      <Card size="small">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <CloseCircleOutlined className="text-xl text-red-500" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)]">失败操作</p>
            <p className="text-lg font-semibold text-red-500">{stats.failure}</p>
          </div>
        </div>
      </Card>
    </div>
  );

  // 导出下拉菜单
  const exportMenuItems = [
    {
      key: 'csv',
      label: '导出 CSV',
      onClick: () => handleExport('csv'),
    },
    {
      key: 'json',
      label: '导出 JSON',
      onClick: () => handleExport('json'),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('auditLog.title', '审计日志')}
        description={t('auditLog.subtitle', '查看系统操作记录和审计追踪')}
        icon={<FileTextOutlined className="text-xl" />}
        actions={
          <Space>
            <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
              <Button icon={<DownloadOutlined />}>
                {t('common.export', '导出')}
              </Button>
            </Dropdown>
            <Button
              type="primary"
              icon={<ReloadOutlined spin={loading} />}
              onClick={loadLogs}
              loading={loading}
            >
              {t('common.refresh', '刷新')}
            </Button>
          </Space>
        }
      />

      {/* 统计卡片 */}
      {statCards}

      {/* 筛选区域 */}
      <Card size="small">
        <Space wrap>
          <Input
            placeholder={t('auditLog.searchPlaceholder', '搜索用户、资源、详情...')}
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder={t('auditLog.filterByAction', '选择操作')}
            value={filterAction || undefined}
            onChange={setFilterAction}
            allowClear
            style={{ width: 140 }}
            options={actionTypes.map((action) => ({
              label: actionLabels[action],
              value: action,
            }))}
          />
          <Select
            placeholder={t('auditLog.filterByResource', '选择资源')}
            value={filterResource || undefined}
            onChange={setFilterResource}
            allowClear
            style={{ width: 140 }}
            options={resourceTypes.map((resource) => ({
              label: resource,
              value: resource,
            }))}
          />
          <Select
            placeholder={t('auditLog.status', '选择状态')}
            value={filterStatus || undefined}
            onChange={setFilterStatus}
            allowClear
            style={{ width: 120 }}
            options={[
              { label: t('common.success', '成功'), value: 'success' },
              { label: t('common.error', '失败'), value: 'failure' },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
          />
          <Button icon={<FilterOutlined />} onClick={handleResetFilters}>
            {t('common.reset', '重置')}
          </Button>
        </Space>
      </Card>

      {/* 日志表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            className: 'cursor-pointer hover:bg-[var(--color-bg-secondary)]',
          })}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => t('pagination.total', `共 ${total} 条`, { total }),
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          locale={{
            emptyText: t('auditLog.noLogs', '暂无审计日志'),
          }}
        />
      </Card>

      {/* 日志详情抽屉 */}
      <Drawer
        title={t('auditLog.details', '日志详情')}
        placement="right"
        width={500}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <Card size="small" title="基本信息">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="时间">
                  {formatDateTime(selectedLog.timestamp)}
                </Descriptions.Item>
                <Descriptions.Item label="用户">
                  {selectedLog.userName}
                </Descriptions.Item>
                <Descriptions.Item label="操作">
                  <Tag color={actionColors[selectedLog.action]}>
                    {actionLabels[selectedLog.action]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  {selectedLog.status === 'success' ? (
                    <Badge status="success" text="成功" />
                  ) : (
                    <Badge status="error" text="失败" />
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 资源信息 */}
            <Card size="small" title="资源信息">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="资源类型">
                  {selectedLog.resource}
                </Descriptions.Item>
                {selectedLog.resourceName && (
                  <Descriptions.Item label="资源名称">
                    {selectedLog.resourceName}
                  </Descriptions.Item>
                )}
                {selectedLog.resourceId && (
                  <Descriptions.Item label="资源ID">
                    <code className="text-xs px-2 py-0.5 bg-[var(--color-bg-tertiary)] rounded">
                      {selectedLog.resourceId}
                    </code>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* 操作详情 */}
            <Card size="small" title="操作详情">
              <Text className="text-sm">{selectedLog.details}</Text>
            </Card>

            {/* 客户端信息 */}
            <Card size="small" title="客户端信息">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="IP 地址">
                  <code className="text-xs px-2 py-0.5 bg-[var(--color-bg-tertiary)] rounded">
                    {selectedLog.ipAddress}
                  </code>
                </Descriptions.Item>
                <Descriptions.Item label="User Agent">
                  <Tooltip title={selectedLog.userAgent}>
                    <Text className="max-w-[300px] truncate block">
                      {selectedLog.userAgent}
                    </Text>
                  </Tooltip>
                </Descriptions.Item>
                {selectedLog.metadata && (
                  <>
                    <Descriptions.Item label="浏览器">
                      {selectedLog.metadata.browser as string}
                    </Descriptions.Item>
                    <Descriptions.Item label="操作系统">
                      {selectedLog.metadata.os as string}
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}
