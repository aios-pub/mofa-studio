/**
 * 系统日志页面
 * 显示系统操作日志、错误日志等
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Tag, Input, Select, Button, Space, DatePicker, Card, Badge, Tooltip, Popover } from 'antd';
import { SearchOutlined, ReloadOutlined, FilterOutlined, ExportOutlined, EyeOutlined } from '@ant-design/icons';
import {
  FileTextOutlined,
  AlertOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  BugOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/common';
import { auditLogApi } from '@/services';

const { RangePicker } = DatePicker;

// 日志级别类型
type LogLevel = 'info' | 'warning' | 'error' | 'debug' | 'success';

// 日志数据类型
interface LogItem {
  id: string;
  level: LogLevel;
  module: string;
  action: string;
  message: string;
  user?: string;
  ip?: string;
  duration?: number;
  createdAt: Date | string;
  details?: Record<string, any>;
}

// 从 AuditLog 映射到 LogItem
function auditToLog(raw: any): LogItem {
  return {
    id: raw.id,
    level: (raw.action === 'delete' || raw.action === 'error') ? 'error'
      : (raw.action === 'update' || raw.action === 'warning') ? 'warning'
      : (raw.action === 'create' || raw.action === 'success') ? 'success'
      : (raw.action === 'debug') ? 'debug' : 'info',
    module: raw.resource || 'System',
    action: raw.action || '',
    message: `${raw.action || ''} ${raw.resource || ''}${raw.resourceId ? ' ' + raw.resourceId : ''}`.trim(),
    user: raw.userName || raw.userId || undefined,
    ip: raw.ipAddress || undefined,
    details: raw.details,
    createdAt: raw.createdAt || '',
  };
}

// 日志级别配置
const levelConfig: Record<LogLevel, { color: string; icon: React.ReactNode; label: string }> = {
  info: { color: 'blue', icon: <InfoCircleOutlined />, label: '信息' },
  warning: { color: 'orange', icon: <WarningOutlined />, label: '警告' },
  error: { color: 'red', icon: <AlertOutlined />, label: '错误' },
  debug: { color: 'purple', icon: <BugOutlined />, label: '调试' },
  success: { color: 'green', icon: <CheckCircleOutlined />, label: '成功' },
};

// 模块配置
const moduleOptions = [
  { label: '全部模块', value: '' },
  { label: 'Agent', value: 'Agent' },
  { label: 'API', value: 'API' },
  { label: 'Conversation', value: 'Conversation' },
  { label: 'User', value: 'User' },
  { label: 'Token', value: 'Token' },
  { label: 'Provider', value: 'Provider' },
  { label: 'System', value: 'System' },
  { label: 'Prompt', value: 'Prompt' },
];

export default function LogsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('');

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await auditLogApi.getAll();
      setLogs(data.map(auditToLog));
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // 过滤日志
  const filteredLogs = logs.filter((log) => {
    const matchSearch = !searchText ||
      log.message.toLowerCase().includes(searchText.toLowerCase()) ||
      log.module.toLowerCase().includes(searchText.toLowerCase()) ||
      log.user?.toLowerCase().includes(searchText.toLowerCase());
    const matchLevel = !levelFilter || log.level === levelFilter;
    const matchModule = !moduleFilter || log.module === moduleFilter;
    return matchSearch && matchLevel && matchModule;
  });

  // 刷新日志
  const handleRefresh = () => {
    loadLogs();
  };

  // 表格列配置
  const columns: ColumnsType<LogItem> = [
    {
      title: t('logs.level', '级别'),
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: LogLevel) => {
        const config = levelConfig[level];
        return (
          <Tag color={config.color} className="flex items-center gap-1 w-fit">
            {config.icon}
            <span>{config.label}</span>
          </Tag>
        );
      },
    },
    {
      title: t('logs.time', '时间'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: Date) => (
        <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
          <ClockCircleOutlined />
          {dayjs(date).format('YYYY-MM-DD HH:mm:ss')}
        </div>
      ),
    },
    {
      title: t('logs.module', '模块'),
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (module: string) => <Badge status="processing" text={module} />,
    },
    {
      title: t('logs.action', '操作'),
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => (
        <Tag color="default">{action}</Tag>
      ),
    },
    {
      title: t('logs.message', '消息'),
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string) => (
        <Tooltip title={message}>
          <span className="text-[var(--color-text-primary)]">{message}</span>
        </Tooltip>
      ),
    },
    {
      title: t('logs.user', '用户'),
      dataIndex: 'user',
      key: 'user',
      width: 140,
      render: (user?: string) => (
        user ? (
          <div className="flex items-center gap-1">
            <UserOutlined className="text-[var(--color-text-tertiary)]" />
            <span>{user}</span>
          </div>
        ) : <span className="text-[var(--color-text-tertiary)]">-</span>
      ),
    },
    {
      title: t('logs.ip', 'IP'),
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
      render: (ip?: string) => ip || <span className="text-[var(--color-text-tertiary)]">-</span>,
    },
    {
      title: t('logs.duration', '耗时'),
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration?: number) =>
        duration ? `${(duration / 1000).toFixed(2)}s` : '-',
    },
    {
      title: t('common.actions', '操作'),
      key: 'actions',
      width: 80,
      render: (_, record) => (
        record.details && (
          <Popover
            content={
              <div className="max-w-sm">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(record.details, null, 2)}
                </pre>
              </div>
            }
            title={t('logs.details', '详情')}
          >
            <Button type="text" size="small" icon={<EyeOutlined />} />
          </Popover>
        )
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('logs.title', '系统日志')}
        description={t('logs.subtitle', '查看系统操作日志和错误记录')}
        icon={<FileTextOutlined className="text-2xl" />}
        actions={
          <Space>
            <Button icon={<ExportOutlined />}>
              {t('common.export', '导出')}
            </Button>
            <Button type="primary" icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
              {t('common.refresh', '刷新')}
            </Button>
          </Space>
        }
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(levelConfig).map(([level, config]) => {
          const count = logs.filter(l => l.level === level).length;
          return (
            <Card key={level} size="small" className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLevelFilter(levelFilter === level ? '' : level)}>
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-${config.color}-100 text-${config.color}-600`}>
                  {config.icon}
                </div>
                <div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-[var(--color-text-secondary)]">{config.label}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 筛选区域 */}
      <Card size="small">
        <Space wrap>
          <Input
            placeholder={t('logs.searchPlaceholder', '搜索消息、模块、用户...')}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder={t('logs.selectModule', '选择模块')}
            options={moduleOptions}
            value={moduleFilter}
            onChange={setModuleFilter}
            style={{ width: 140 }}
          />
          <Select
            placeholder={t('logs.selectLevel', '选择级别')}
            options={[
              { label: t('logs.allLevels', '全部级别'), value: '' },
              ...Object.entries(levelConfig).map(([key, val]) => ({
                label: val.label,
                value: key,
              })),
            ]}
            value={levelFilter}
            onChange={setLevelFilter}
            style={{ width: 140 }}
          />
          <RangePicker showTime />
          <Button icon={<FilterOutlined />}>
            {t('common.filter', '筛选')}
          </Button>
        </Space>
      </Card>

      {/* 日志表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => t('logs.total', `共 ${total} 条日志`, { total }),
          }}
          size="small"
        />
      </Card>
    </div>
  );
}
