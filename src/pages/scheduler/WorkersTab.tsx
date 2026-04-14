/**
 * Worker 监控 Tab
 * 参考 apalis-board Workers 页面：Worker 状态 + Handler 列表
 * Phase 1 使用本地 mock 数据
 */

import { useState } from 'react';
import { Table, Tag, Badge } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  TeamOutlined,
  ApiOutlined,
} from '@ant-design/icons';

// Worker 信息
interface WorkerInfo {
  id: string;
  name: string;
  status: 'running' | 'stopped';
  startedAt: string;
  lastHeartbeat: string;
  backend: string;
  concurrency: number;
}

// Handler 信息
interface HandlerInfo {
  taskType: string;
  taskName: string;
  status: 'active' | 'inactive';
  workerId: string;
}

// Mock Worker 数据
const mockWorkers: WorkerInfo[] = [
  {
    id: 'w-001',
    name: 'scheduled-task-worker',
    status: 'running',
    startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lastHeartbeat: new Date(Date.now() - 30 * 1000).toISOString(),
    backend: 'CronStream',
    concurrency: 1,
  },
];

// Mock Handler 数据
const mockHandlers: HandlerInfo[] = [
  { taskType: 'agent_test', taskName: 'Agent 测试任务', status: 'active', workerId: 'w-001' },
  { taskType: 'report', taskName: '报告生成任务', status: 'active', workerId: 'w-001' },
  { taskType: 'cleanup', taskName: '数据清理任务', status: 'active', workerId: 'w-001' },
  { taskType: 'backup', taskName: '数据备份任务', status: 'active', workerId: 'w-001' },
  { taskType: 'sync', taskName: '数据同步任务', status: 'active', workerId: 'w-001' },
];

const formatRelativeTime = (isoStr: string) => {
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 60 * 1000) return `${Math.floor(diff / 1000)} 秒前`;
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
};

export default function WorkersTab() {
  const [workers] = useState<WorkerInfo[]>(mockWorkers);
  const [handlers] = useState<HandlerInfo[]>(mockHandlers);

  const workerColumns: ColumnsType<WorkerInfo> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <code className="text-xs font-mono">{id}</code>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: WorkerInfo) => (
        <div className="flex items-center gap-2">
          <Badge status={record.status === 'running' ? 'success' : 'error'} />
          <span className="font-medium text-[var(--color-text-primary)]">{name}</span>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'running' ? 'green' : 'red'}>
          {status === 'running' ? '运行中' : '已停止'}
        </Tag>
      ),
    },
    {
      title: 'Backend',
      dataIndex: 'backend',
      key: 'backend',
      render: (backend: string) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-xs">
          <ApiOutlined />{backend}
        </span>
      ),
    },
    {
      title: '启动时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (v: string) => <span className="text-xs text-[var(--color-text-tertiary)]">{formatRelativeTime(v)}</span>,
    },
    {
      title: '最后心跳',
      dataIndex: 'lastHeartbeat',
      key: 'lastHeartbeat',
      render: (v: string) => <span className="text-xs text-[var(--color-text-tertiary)]">{formatRelativeTime(v)}</span>,
    },
    {
      title: '并发',
      dataIndex: 'concurrency',
      key: 'concurrency',
      width: 70,
    },
  ];

  const handlerColumns: ColumnsType<HandlerInfo> = [
    {
      title: '任务类型',
      dataIndex: 'taskType',
      key: 'taskType',
      render: (type: string) => <code className="text-xs font-mono">{type}</code>,
    },
    {
      title: '名称',
      dataIndex: 'taskName',
      key: 'taskName',
      render: (name: string) => <span className="text-[var(--color-text-primary)]">{name}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '活跃' : '未激活'}
        </Tag>
      ),
    },
    {
      title: 'Worker',
      dataIndex: 'workerId',
      key: 'workerId',
      render: (id: string) => <code className="text-xs font-mono">{id}</code>,
    },
  ];

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      {/* Worker 状态 */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
          <TeamOutlined /> Worker 状态
        </h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">调度器工作进程监控</p>
        <Table
          dataSource={workers}
          columns={workerColumns}
          rowKey="id"
          size="small"
          pagination={false}
          className="border border-[var(--color-border)] rounded-lg overflow-hidden"
        />
      </section>

      {/* 已注册 Handler */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
          <ApiOutlined /> 已注册 Handler
        </h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mb-4">各任务类型的处理函数注册状态</p>
        <Table
          dataSource={handlers}
          columns={handlerColumns}
          rowKey="taskType"
          size="small"
          pagination={false}
          className="border border-[var(--color-border)] rounded-lg overflow-hidden"
        />
      </section>
    </div>
  );
}
