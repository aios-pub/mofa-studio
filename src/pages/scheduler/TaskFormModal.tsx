/**
 * 创建/编辑任务弹窗
 * 从 ScheduledTasksPage 提取，含三模式 Cron 编辑
 */

import { useState } from 'react';
import { Input, Button, Select, message, Modal, Form, Checkbox, Tabs } from 'antd';
import { FieldTimeOutlined } from '@ant-design/icons';
import { Cron } from 'react-js-cron';
import 'react-js-cron/dist/styles.css';
import type { ScheduledTask, TaskType, TaskStatus, TaskConfig } from '@/services';
import { taskTypeConfig, cronPresets } from '@/services';

const cronZhLocale = {
  everyText: '每',
  emptyMonths: '每月',
  emptyMonthDays: '每日(月)',
  emptyMonthDaysShort: '日',
  emptyWeekDays: '每周',
  emptyWeekDaysShort: '周',
  emptyHours: '每小时',
  emptyMinutes: '每分钟',
  emptyMinutesForHourPeriod: '每分钟',
  yearOption: '年',
  monthOption: '月',
  weekOption: '周',
  dayOption: '天',
  hourOption: '小时',
  minuteOption: '分钟',
  rebootOption: '重启',
  prefixPeriod: '每',
  prefixMonths: '的',
  prefixMonthDays: '的',
  prefixWeekDays: '的',
  prefixWeekDaysForMonthAndYearPeriod: '的',
  prefixHours: '的',
  prefixMinutes: '的',
  suffixMinutesForHourPeriod: '分钟',
  errorInvalidCron: '无效的 Cron 表达式',
  weekDays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  altWeekDays: ['日', '一', '二', '三', '四', '五', '六'],
  altMonths: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
};

export default function TaskFormModal({
  task,
  onClose,
  onSave,
}: {
  task: ScheduledTask | null;
  onClose: () => void;
  onSave: (data: Partial<ScheduledTask>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    type: (task?.type || 'agent_test') as TaskType,
    cronExpression: task?.cronExpression || '0 0 * * *',
    status: (task?.status || 'enabled') as TaskStatus,
    config: (task?.config || {}) as TaskConfig,
  });
  const [saving, setSaving] = useState(false);
  const [cronError, setCronError] = useState<string | undefined>();
  const [cronMode, setCronMode] = useState<'visual' | 'preset' | 'custom'>('visual');

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      message.warning('请输入任务名称');
      return;
    }
    if (cronError) {
      message.warning('请修正 Cron 表达式');
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
      message.success(task ? '任务已更新' : '任务已创建');
    } catch (error) {
      console.error('Failed to save task:', error);
      message.error(task ? '更新失败' : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={task ? '编辑任务' : '创建任务'}
      open={true}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={saving ? '保存中...' : '保存'}
      confirmLoading={saving}
      width={600}
      destroyOnClose
    >
      <Form layout="vertical" className="mt-4">
        <Form.Item label="任务名称" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="输入任务名称"
          />
        </Form.Item>
        <Form.Item label="任务描述">
          <Input.TextArea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            placeholder="输入任务描述"
          />
        </Form.Item>
        <Form.Item label="任务类型">
          <Select
            value={formData.type}
            onChange={(v) => setFormData({ ...formData, type: v })}
            style={{ width: '100%' }}
            options={Object.entries(taskTypeConfig).map(([type, config]) => ({
              label: `${config.icon} ${config.label} - ${config.description}`,
              value: type,
            }))}
          />
        </Form.Item>
        <Form.Item label="执行频率">
          <Tabs
            activeKey={cronMode}
            onChange={(key: string) => setCronMode(key as 'visual' | 'preset' | 'custom')}
            size="small"
            items={[
              {
                key: 'visual',
                label: '可视化',
                children: (
                  <div className="cron-visual-container">
                    <Cron
                      value={formData.cronExpression}
                      setValue={(value: string) => setFormData({ ...formData, cronExpression: value })}
                      locale={cronZhLocale}
                      humanizeLabels
                      allowedPeriods={['year', 'month', 'week', 'day', 'hour', 'minute']}
                      defaultPeriod="day"
                      onError={(error: { type: string; description: string } | undefined) => {
                        setCronError(error?.description);
                      }}
                      allowClear
                      clockFormat="24-hour-clock"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <FieldTimeOutlined className="text-[var(--color-text-tertiary)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">当前表达式：</span>
                      <code className="text-sm font-mono bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
                        {formData.cronExpression}
                      </code>
                    </div>
                  </div>
                ),
              },
              {
                key: 'preset',
                label: '常用',
                children: (
                  <div className="space-y-2">
                    <Select
                      value={formData.cronExpression}
                      onChange={(v) => setFormData({ ...formData, cronExpression: v })}
                      style={{ width: '100%' }}
                      options={cronPresets.map((preset) => ({
                        label: (
                          <div className="flex items-center justify-between">
                            <span>{preset.label}</span>
                            <code className="text-xs text-[var(--color-text-tertiary)] font-mono">{preset.value}</code>
                          </div>
                        ),
                        value: preset.value,
                      }))}
                    />
                    <div className="flex items-center gap-2">
                      <FieldTimeOutlined className="text-[var(--color-text-tertiary)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">当前表达式：</span>
                      <code className="text-sm font-mono bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
                        {formData.cronExpression}
                      </code>
                    </div>
                  </div>
                ),
              },
              {
                key: 'custom',
                label: '自定义',
                children: (
                  <div className="space-y-2">
                    <Input
                      value={formData.cronExpression}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, cronExpression: val });
                        const parts = val.trim().split(/\s+/);
                        setCronError(parts.length !== 5 ? 'Cron 表达式必须包含 5 个字段' : undefined);
                      }}
                      placeholder="分 时 日 月 周 (如: 0 9 * * 1)"
                      className="font-mono"
                      status={cronError ? 'error' : undefined}
                    />
                    {cronError && <p className="text-xs text-red-500">{cronError}</p>}
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      格式: 分钟(0-59) 小时(0-23) 日(1-31) 月(1-12) 周几(0-6)
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {[
                        { label: '每小时', value: '0 * * * *' },
                        { label: '每30分钟', value: '*/30 * * * *' },
                        { label: '工作日9点', value: '0 9 * * 1-5' },
                        { label: '每天0和12点', value: '0 0,12 * * *' },
                        { label: '每月1号和15号', value: '0 0 1,15 * *' },
                      ].map((preset) => (
                        <Button
                          key={preset.value}
                          size="small"
                          type={formData.cronExpression === preset.value ? 'primary' : 'default'}
                          onClick={() => {
                            setFormData({ ...formData, cronExpression: preset.value });
                            setCronError(undefined);
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Form.Item>
        <Form.Item>
          <Checkbox
            checked={formData.status === 'enabled'}
            onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'enabled' : 'disabled' })}
          >
            创建后立即启用
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
