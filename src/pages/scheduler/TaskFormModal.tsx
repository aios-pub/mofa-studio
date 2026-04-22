/**
 * 创建/编辑任务弹窗
 * 含三模式 Cron 编辑 + 根据任务类型动态渲染配置表单
 */

import { useState, useEffect, useCallback } from "react";
import {
  Input,
  Button,
  Select,
  InputNumber,
  message,
  Modal,
  Form,
  Checkbox,
  Tabs,
  Tag,
  Alert,
} from "antd";
import { FieldTimeOutlined } from "@ant-design/icons";
import { Cron } from "react-js-cron";
import "react-js-cron/dist/styles.css";
import type {
  ScheduledTask,
  TaskType,
  TaskStatus,
  TaskConfig,
  TaskTypeDescriptor,
} from "@/services";
import { taskTypeConfig, cronPresets, agentApi, testSetApi } from "@/services";
import type { Agent, TestSet } from "@/types";

const cronZhLocale = {
  everyText: "每",
  emptyMonths: "每月",
  emptyMonthDays: "每日(月)",
  emptyMonthDaysShort: "日",
  emptyWeekDays: "每周",
  emptyWeekDaysShort: "周",
  emptyHours: "每小时",
  emptyMinutes: "每分钟",
  emptyMinutesForHourPeriod: "每分钟",
  yearOption: "年",
  monthOption: "月",
  weekOption: "周",
  dayOption: "天",
  hourOption: "小时",
  minuteOption: "分钟",
  rebootOption: "重启",
  prefixPeriod: "每",
  prefixMonths: "的",
  prefixMonthDays: "的",
  prefixWeekDays: "的",
  prefixWeekDaysForMonthAndYearPeriod: "的",
  prefixHours: "的",
  prefixMinutes: "的",
  suffixMinutesForHourPeriod: "分钟",
  errorInvalidCron: "无效的 Cron 表达式",
  weekDays: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  months: [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ],
  altWeekDays: ["日", "一", "二", "三", "四", "五", "六"],
  altMonths: [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ],
};

// ==================== Agent 测试配置表单 ====================
function AgentTestConfigForm({
  config,
  onChange,
}: {
  config: TaskConfig;
  onChange: (config: TaskConfig) => void;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const [agentList, testSetList] = await Promise.all([
        agentApi.getAll(),
        testSetApi.getAll(),
      ]);
      setAgents(agentList.filter((a) => a.enabled));
      setTestSets(testSetList);
    } catch (error) {
      console.error("Failed to load agents/testsets:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  return (
    <div className="space-y-4 p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
      <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
        Agent 测试配置
      </h4>

      <Form.Item label="选择测试集" required className="mb-2">
        <Select
          value={config.test_set_id || undefined}
          onChange={(v) => onChange({ ...config, test_set_id: v })}
          placeholder="选择要运行的测试集"
          loading={loading}
          showSearch
          optionFilterProp="label"
          style={{ width: "100%" }}
          options={testSets.map((ts) => ({
            label: `${ts.name}${ts.category ? ` (${ts.category})` : ""}`,
            value: ts.id,
          }))}
        />
      </Form.Item>

      <Form.Item label="选择 Agent（可多选）" required className="mb-0">
        <Select
          mode="multiple"
          value={config.agent_ids || []}
          onChange={(v) => onChange({ ...config, agent_ids: v })}
          placeholder="选择要测试的 Agent"
          loading={loading}
          showSearch
          optionFilterProp="label"
          style={{ width: "100%" }}
          maxTagCount={5}
          options={agents.map((a) => ({
            label: (
              <div className="flex items-center justify-between">
                <span>{a.name}</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {a.modelName}
                </span>
              </div>
            ),
            value: a.id,
          }))}
        />
      </Form.Item>

      {config.agent_ids && config.agent_ids.length > 0 && config.test_set_id && (
        <div className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
          <Tag color="blue">{config.agent_ids.length} 个 Agent</Tag>
          <span>×</span>
          <Tag color="blue">
            {testSets.find((t) => t.id === config.test_set_id)?.name || "测试集"}
          </Tag>
          <span>= 每次 {config.agent_ids.length} 组测试</span>
        </div>
      )}
    </div>
  );
}

// ==================== Agent Loop 配置表单（调度单位 = Agent）====================
function AgentLoopConfigForm({
  config,
  onChange,
}: {
  config: TaskConfig;
  onChange: (config: TaskConfig) => void;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const agentList = await agentApi.getAll();
      setAgents(agentList.filter((a) => a.enabled));
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const selectedAgent = agents.find((a) => a.id === config.agent_id);

  return (
    <div className="space-y-4 p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
      <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
        Agent 调度配置
      </h4>

      <Form.Item label="选择 Agent" required className="mb-2">
        <Select
          value={config.agent_id || undefined}
          onChange={(v) => onChange({ ...config, agent_id: v })}
          placeholder="选择要调度的 Agent"
          loading={loading}
          showSearch
          optionFilterProp="label"
          style={{ width: "100%" }}
          options={agents.map((a) => ({
            label: (
              <div className="flex items-center justify-between">
                <span>{a.name}</span>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {a.modelName}
                </span>
              </div>
            ),
            value: a.id,
          }))}
        />
      </Form.Item>

      {selectedAgent && (
        <div className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1 mb-2">
          <Tag color="blue">{selectedAgent.modelName}</Tag>
          {selectedAgent.providerName && (
            <Tag>{selectedAgent.providerName}</Tag>
          )}
        </div>
      )}

      <Form.Item label="任务提示词" required className="mb-2">
        <Input.TextArea
          value={config.prompt || ""}
          onChange={(e) => onChange({ ...config, prompt: e.target.value })}
          rows={4}
          placeholder="描述 Agent 需要自主完成的任务，例如：&#10;检查所有数据源的健康状态，如果发现异常则生成报告并发送通知&#10;&#10;Agent 会基于自身的 System Prompt 和你提供的提示词自主执行任务"
          showCount
          maxLength={4000}
        />
      </Form.Item>

      <div className="grid grid-cols-2 gap-3">
        <Form.Item label="最大迭代次数" className="mb-0">
          <InputNumber
            value={config.max_iterations ?? 10}
            onChange={(v) => onChange({ ...config, max_iterations: v ?? 10 })}
            min={1}
            max={100}
            style={{ width: "100%" }}
            addonAfter="次"
          />
        </Form.Item>
        <Form.Item label="超时时间" className="mb-0">
          <InputNumber
            value={config.timeout_seconds ?? 3600}
            onChange={(v) => onChange({ ...config, timeout_seconds: v ?? 3600 })}
            min={60}
            max={86400}
            style={{ width: "100%" }}
            addonAfter="秒"
          />
        </Form.Item>
      </div>

      <p className="text-xs text-[var(--color-text-tertiary)]">
        Agent 将以 ReAct 模式自主执行：接收提示词 → 思考 → 调用工具 → 观察结果 →
        继续推理，直到任务完成或达到迭代上限
      </p>
    </div>
  );
}

// ==================== 通用配置表单 fallback ====================
function GenericConfigForm({
  config,
  onChange,
}: {
  config: TaskConfig;
  onChange: (config: TaskConfig) => void;
}) {
  return (
    <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
      <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
        任务配置（JSON）
      </p>
      <Input.TextArea
        value={JSON.stringify(config, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            /* ignore parse errors while typing */
          }
        }}
        rows={4}
        className="font-mono text-xs"
        placeholder='{"key": "value"}'
      />
    </div>
  );
}

// ==================== 主弹窗 ====================
export default function TaskFormModal({
  task,
  task_types,
  onClose,
  onSave,
}: {
  task: ScheduledTask | null;
  task_types?: TaskTypeDescriptor[];
  onClose: () => void;
  onSave: (data: Partial<ScheduledTask>) => Promise<void>;
}) {
  // 合并后端动态类型 + 前端静态 fallback
  const typeOptions =
    task_types && task_types.length > 0
      ? task_types
      : Object.entries(taskTypeConfig).map(([type, cfg]) => ({
          task_type: type,
          label: cfg.label,
          description: cfg.description,
          icon: cfg.icon,
        }));

  const [formData, setFormData] = useState({
    name: task?.name || "",
    description: task?.description || "",
    type: (task?.type || (typeOptions[0]?.task_type ?? "")) as TaskType,
    cron_expression: task?.cron_expression || "0 0 * * *",
    status: (task?.status || "enabled") as TaskStatus,
    config: (task?.config || {}) as TaskConfig,
  });
  const [saving, setSaving] = useState(false);
  const [cronError, setCronError] = useState<string | undefined>();
  const [cronMode, setCronMode] = useState<"visual" | "preset" | "custom">(
    "visual",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      message.warning("请输入任务名称");
      return;
    }
    if (cronError) {
      message.warning("请修正 Cron 表达式");
      return;
    }
    // agent_test 类型校验
    if (formData.type === "agent_test") {
      if (!formData.config.test_set_id) {
        message.warning("请选择测试集");
        return;
      }
      if (!formData.config.agent_ids || formData.config.agent_ids.length === 0) {
        message.warning("请至少选择一个 Agent");
        return;
      }
    }
    // agent_loop 类型校验
    if (formData.type === "agent_loop") {
      if (!formData.config.agent_id) {
        message.warning("请选择 Agent");
        return;
      }
      if (!formData.config.prompt?.trim()) {
        message.warning("请输入任务提示词");
        return;
      }
    }
    setSaving(true);
    setSubmitError(null);
    try {
      await onSave(formData);
      message.success(task ? "任务已更新" : "任务已创建");
    } catch (error: any) {
      console.error("Failed to save task:", error);
      setSubmitError(error?.message || (task ? "更新失败" : "创建失败"));
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (config: TaskConfig) => {
    setFormData({ ...formData, config });
  };

  return (
    <Modal
      title={task ? "编辑任务" : "创建任务"}
      open={true}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={saving ? "保存中..." : "保存"}
      confirmLoading={saving}
      width={600}
      destroyOnHidden
    >
      <Form layout="vertical" className="mt-4">
        {submitError && (
          <Alert
            type="error"
            title={submitError}
            showIcon
            closable
            onClose={() => setSubmitError(null)}
            className="mb-4"
          />
        )}
        <Form.Item label="任务名称" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例如：每日 Agent 健康检查"
          />
        </Form.Item>
        <Form.Item label="任务描述">
          <Input.TextArea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={2}
            placeholder="输入任务描述"
          />
        </Form.Item>
        <Form.Item label="任务类型">
          <Select
            value={formData.type}
            onChange={(v) =>
              setFormData({ ...formData, type: v, config: {} as TaskConfig })
            }
            style={{ width: "100%" }}
            options={typeOptions.map((t) => ({
              label: `${t.icon} ${t.label}${t.description ? ` - ${t.description}` : ""}`,
              value: t.task_type,
            }))}
          />
        </Form.Item>

        {/* 根据任务类型渲染动态配置表单 */}
        {formData.type === "agent_loop" && (
          <AgentLoopConfigForm
            config={formData.config}
            onChange={updateConfig}
          />
        )}
        {formData.type === "agent_test" && (
          <AgentTestConfigForm
            config={formData.config}
            onChange={updateConfig}
          />
        )}
        {formData.type &&
          formData.type !== "agent_loop" &&
          formData.type !== "agent_test" && (
            <GenericConfigForm
              config={formData.config}
              onChange={updateConfig}
            />
          )}

        <Form.Item label="执行频率" className="mt-4">
          <Tabs
            activeKey={cronMode}
            onChange={(key: string) =>
              setCronMode(key as "visual" | "preset" | "custom")
            }
            size="small"
            items={[
              {
                key: "visual",
                label: "可视化",
                children: (
                  <div className="cron-visual-container">
                    <Cron
                      value={formData.cron_expression}
                      setValue={(value: string) =>
                        setFormData({ ...formData, cron_expression: value })
                      }
                      locale={cronZhLocale}
                      humanizeLabels
                      allowedPeriods={[
                        "year",
                        "month",
                        "week",
                        "day",
                        "hour",
                        "minute",
                      ]}
                      defaultPeriod="day"
                      onError={(
                        error:
                          | { type: string; description: string }
                          | undefined,
                      ) => {
                        setCronError(error?.description);
                      }}
                      allowClear
                      clockFormat="24-hour-clock"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <FieldTimeOutlined className="text-[var(--color-text-tertiary)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        当前表达式：
                      </span>
                      <code className="text-sm font-mono bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
                        {formData.cron_expression}
                      </code>
                    </div>
                  </div>
                ),
              },
              {
                key: "preset",
                label: "常用",
                children: (
                  <div className="space-y-2">
                    <Select
                      value={formData.cron_expression}
                      onChange={(v) =>
                        setFormData({ ...formData, cron_expression: v })
                      }
                      style={{ width: "100%" }}
                      options={cronPresets.map((preset) => ({
                        label: (
                          <div className="flex items-center justify-between">
                            <span>{preset.label}</span>
                            <code className="text-xs text-[var(--color-text-tertiary)] font-mono">
                              {preset.value}
                            </code>
                          </div>
                        ),
                        value: preset.value,
                      }))}
                    />
                    <div className="flex items-center gap-2">
                      <FieldTimeOutlined className="text-[var(--color-text-tertiary)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        当前表达式：
                      </span>
                      <code className="text-sm font-mono bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
                        {formData.cron_expression}
                      </code>
                    </div>
                  </div>
                ),
              },
              {
                key: "custom",
                label: "自定义",
                children: (
                  <div className="space-y-2">
                    <Input
                      value={formData.cron_expression}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, cron_expression: val });
                        const parts = val.trim().split(/\s+/);
                        setCronError(
                          parts.length !== 5
                            ? "Cron 表达式必须包含 5 个字段"
                            : undefined,
                        );
                      }}
                      placeholder="分 时 日 月 周 (如: 0 9 * * 1)"
                      className="font-mono"
                      status={cronError ? "error" : undefined}
                    />
                    {cronError && (
                      <p className="text-xs text-red-500">{cronError}</p>
                    )}
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      格式: 分钟(0-59) 小时(0-23) 日(1-31) 月(1-12) 周几(0-6)
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {[
                        { label: "每小时", value: "0 * * * *" },
                        { label: "每30分钟", value: "*/30 * * * *" },
                        { label: "工作日9点", value: "0 9 * * 1-5" },
                        { label: "每天0和12点", value: "0 0,12 * * *" },
                        { label: "每月1号和15号", value: "0 0 1,15 * *" },
                      ].map((preset) => (
                        <Button
                          key={preset.value}
                          size="small"
                          type={
                            formData.cron_expression === preset.value
                              ? "primary"
                              : "default"
                          }
                          onClick={() => {
                            setFormData({
                              ...formData,
                              cron_expression: preset.value,
                            });
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
            checked={formData.status === "enabled"}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.checked ? "enabled" : "disabled",
              })
            }
          >
            创建后立即启用
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}
