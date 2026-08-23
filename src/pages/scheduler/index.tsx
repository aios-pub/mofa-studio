/**
 * Task scheduling module main page
 * Modeled on apalis-board layout: tab navigation (overview/tasks/executions/workers)
 */

import { useState, useEffect } from 'react';
import { Tabs } from 'antd';
import {
  DashboardOutlined,
  ScheduleOutlined,
  HistoryOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { TaskType } from '@/services';
import OverviewTab from './OverviewTab';
import TasksTab from './TasksTab';
import ExecutionsTab from './ExecutionsTab';
import WorkersTab from './WorkersTab';

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tasksFilterType, setTasksFilterType] = useState<TaskType | ''>('');

  // Read the initial tab from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'tasks', 'executions', 'workers'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Update the URL when switching tabs
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.replaceState(null, '', url.toString());
  };

  // Navigate from overview to task management with a type filter
  const handleNavigateToTasks = (type?: TaskType) => {
    setTasksFilterType(type || '');
    setActiveTab('tasks');
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        className="scheduler-tabs h-full flex flex-col [&_.ant-tabs-content]:flex-1 [&_.ant-tabs-content]:overflow-hidden [&_.ant-tabs-tabpane]:h-full"
        items={[
          {
            key: 'overview',
            label: (
              <span className="flex items-center gap-1.5">
                <DashboardOutlined />概览
              </span>
            ),
            children: <OverviewTab onNavigateToTasks={handleNavigateToTasks} />,
          },
          {
            key: 'tasks',
            label: (
              <span className="flex items-center gap-1.5">
                <ScheduleOutlined />任务管理
              </span>
            ),
            children: <TasksTab initialFilterType={tasksFilterType} onFilterTypeConsumed={() => setTasksFilterType('')} />,
          },
          {
            key: 'executions',
            label: (
              <span className="flex items-center gap-1.5">
                <HistoryOutlined />执行记录
              </span>
            ),
            children: <ExecutionsTab />,
          },
          {
            key: 'workers',
            label: (
              <span className="flex items-center gap-1.5">
                <TeamOutlined />Worker 监控
              </span>
            ),
            children: <WorkersTab />,
          },
        ]}
      />
    </div>
  );
}
