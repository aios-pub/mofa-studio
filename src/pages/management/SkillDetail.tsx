import { useTranslation } from "react-i18next";
/**
 * Skill detail component
 */

import { useState, useEffect } from "react";
import { Button, Tag, Typography, Card, Statistic, Tabs, Input, Table, Empty } from "antd";
import {
  EditOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  CodeOutlined,
  PoweroffOutlined,
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import type { Skill, SkillParameter } from "@/services";
import { skillApi } from "@/services";

const { Text, Title } = Typography;

interface SkillDetailProps {
  skill: Skill;
  onUpdate?: () => void;
  onToggleEnabled: (skill: Skill) => void;
}

export function SkillDetail({
  skill,
  onUpdate: _onUpdate,
  onToggleEnabled,
}: SkillDetailProps) {  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"params" | "test" | "logs">(
    "params",
  );
  const [testParams, setTestParams] = useState<Record<string, unknown>>({});
  const [testResult, setTestResult] = useState<{
    success: boolean;
    result: unknown;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<
    Array<{
      timestamp: Date;
      type: "info" | "success" | "error";
      message: string;
    }>
  >([]);

  useEffect(() => {
    // Initialize test parameters
    const initialParams: Record<string, unknown> = {};
    (Array.isArray(skill.parameters) ? skill.parameters : []).forEach((p) => {
      if (p.defaultValue !== undefined) {
        initialParams[p.name] = p.defaultValue;
      }
    });
    setTestParams(initialParams);
  }, [skill]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const startTime = Date.now();

    try {
      setExecutionLogs((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          type: "info",
          message: t("开始执行 {{p0}}...", { p0: skill.name }),
        },
      ]);

      const result = await skillApi.execute(skill.id, testParams);
      const duration = Date.now() - startTime;

      setTestResult(result);
      setExecutionLogs((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          type: result.success ? "success" : "error",
          message: result.success
            ? t("执行成功 ({{p0}}ms)", { p0: duration })
            : t("执行失败: {{p0}}", { p0: result.result }),
        },
      ]);
    } catch (error) {
      setExecutionLogs((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          type: "error",
          message: t("执行错误: {{p0}}", { p0: error }),
        },
      ]);
    } finally {
      setIsTesting(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getTypeTag = (type: Skill["type"]) => {
    const config: Record<string, { color: string; label: string }> = {
      builtin: { color: "blue", label: t("内置") },
      custom: { color: "purple", label: t("自定义") },
      api: { color: "orange", label: "API" },
    };
    const item = config[type ?? ""] ?? {
      color: "default",
      label: type ?? "未知",
    };
    return <Tag color={item.color}>{item.label}</Tag>;
  };

  const tabs = [
    { key: "params", label: t("参数配置"), icon: SettingOutlined },
    { key: "test", label: t("测试执行"), icon: PlayCircleOutlined },
    { key: "logs", label: t("执行日志"), icon: CodeOutlined },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Title level={4} style={{ margin: 0 }}>
              {skill.name}
            </Title>
            {getTypeTag(skill.type)}
          </div>
          <Text type="secondary">{skill.description}</Text>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => onToggleEnabled(skill)}
            className={
              skill.enabled
                ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                : "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
            }
          >
            <PoweroffOutlined className="mr-1" />
            {skill.enabled ? "已启用" : "已禁用"}
          </Button>
          <Button type="primary" icon={<EditOutlined />}>
            编辑
          </Button>
        </div>
      </div>

      {/* Meta information */}
      <div className="grid grid-cols-4 gap-4 px-6 pb-4">
        <Card
          size="small"
          variant="borderless"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                分类
              </Text>
            }
            value={skill.category}
            styles={{ content: { fontSize: 14 } }}
          />
        </Card>
        <Card
          size="small"
          variant="borderless"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                超时时间
              </Text>
            }
            value={(skill.timeout ?? 30000) / 1000}
            suffix="s"
            styles={{ content: { fontSize: 14 } }}
          />
        </Card>
        <Card
          size="small"
          variant="borderless"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                参数数量
              </Text>
            }
            value={
              Array.isArray(skill.parameters) ? skill.parameters.length : 0
            }
            styles={{ content: { fontSize: 14 } }}
          />
        </Card>
        <Card
          size="small"
          variant="borderless"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                创建时间
              </Text>
            }
            value={new Date(skill.createdAt).toLocaleDateString("zh-CN")}
            styles={{ content: { fontSize: 14 } }}
          />
        </Card>
      </div>

      {/* Tabs bar */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        items={tabs.map((tab) => ({
          key: tab.key,
          label: (
            <span className="flex items-center gap-2">
              <tab.icon />
              {tab.label}
            </span>
          ),
        }))}
        className="px-6"
      />

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "params" && (
          <div className="p-6 h-full overflow-y-auto">
            <Card title={t("参数定义")} className="rounded-lg">
              {(Array.isArray(skill.parameters) ? skill.parameters : [])
                .length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t("暂无参数")}
                  className="py-6"
                />
              ) : (
                <Table<SkillParameter>
                  rowKey="name"
                  dataSource={
                    Array.isArray(skill.parameters) ? skill.parameters : []
                  }
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: t("参数名"),
                      dataIndex: "name",
                      render: (name: string) => (
                        <code className="text-[var(--color-primary)]">
                          {name}
                        </code>
                      ),
                    },
                    {
                      title: t("类型"),
                      dataIndex: "type",
                    },
                    {
                      title: t("描述"),
                      dataIndex: "description",
                    },
                    {
                      title: t("默认值"),
                      render: (_, param) =>
                        param.defaultValue !== undefined
                          ? JSON.stringify(param.defaultValue)
                          : "-",
                    },
                    {
                      title: t("必填"),
                      dataIndex: "required",
                      width: 72,
                      render: (required?: boolean) =>
                        required ? (
                          <CheckOutlined className="text-green-500" />
                        ) : (
                          <CloseOutlined className="text-[var(--color-text-tertiary)]" />
                        ),
                    },
                  ]}
                />
              )}
            </Card>

            {/* JSON Schema display */}
            <div className="mt-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) overflow-hidden">
              <div className="p-3 border-b border-(--color-border) bg-(--color-bg-tertiary)">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  JSON Schema
                </span>
              </div>
              <pre className="p-4 text-sm text-[var(--color-text-primary)] font-mono overflow-x-auto">
                {JSON.stringify(
                  {
                    name: skill.name,
                    description: skill.description,
                    parameters: (Array.isArray(skill.parameters)
                      ? skill.parameters
                      : []
                    ).reduce(
                      (acc, p) => {
                        acc[p.name] = {
                          type: p.type,
                          description: p.description,
                          required: p.required,
                          default: p.defaultValue,
                        };
                        return acc;
                      },
                      {} as Record<string, unknown>,
                    ),
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "test" && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="space-y-4">
              {/* Parameter input */}
              <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) overflow-hidden">
                <div className="p-3 border-b border-(--color-border) bg-(--color-bg-tertiary)">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    测试参数
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {(Array.isArray(skill.parameters)
                    ? skill.parameters
                    : []
                  ).map((param) => (
                    <div key={param.name}>
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] mb-1">
                        <code className="text-[var(--color-primary)]">
                          {param.name}
                        </code>
                        <span className="text-[var(--color-text-tertiary)]">
                          ({param.type})
                        </span>
                        {param.required && (
                          <span className="text-red-500">*</span>
                        )}
                      </label>
                      <Input
                        value={String(testParams[param.name] ?? "")}
                        onChange={(e) =>
                          setTestParams({
                            ...testParams,
                            [param.name]:
                              param.type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          })
                        }
                        placeholder={param.description}
                      />
                    </div>
                  ))}
                  <Button
                    type="primary"
                    icon={
                      isTesting ? <LoadingOutlined /> : <PlayCircleOutlined />
                    }
                    onClick={handleTest}
                    disabled={isTesting || !skill.enabled}
                    block
                  >
                    {isTesting ? "执行中..." : "执行测试"}
                  </Button>
                </div>
              </div>

              {/* Execution result */}
              {testResult && (
                <div
                  className={`bg-[var(--color-bg-secondary)] rounded-lg border overflow-hidden ${
                    testResult.success
                      ? "border-green-500/30"
                      : "border-red-500/30"
                  }`}
                >
                  <div
                    className={`p-3 border-b ${
                      testResult.success
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-red-500/10 border-red-500/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckOutlined className="text-green-500" />
                      ) : (
                        <CloseOutlined className="text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          testResult.success ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {testResult.success ? "执行成功" : "执行失败"}
                      </span>
                    </div>
                  </div>
                  <pre className="p-4 text-sm text-[var(--color-text-primary)] font-mono overflow-x-auto whitespace-pre-wrap">
                    {typeof testResult.result === "string"
                      ? testResult.result
                      : JSON.stringify(testResult.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) h-full flex flex-col">
              <div className="p-3 border-b border-(--color-border) bg-(--color-bg-tertiary) flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  执行日志
                </span>
                <Button
                  type="text"
                  size="small"
                  onClick={() => setExecutionLogs([])}
                >
                  清空日志
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 font-mono text-sm">
                {executionLogs.length === 0 ? (
                  <div className="text-center text-[var(--color-text-tertiary)] py-8">
                    暂无执行日志
                  </div>
                ) : (
                  executionLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 py-1 ${
                        log.type === "error"
                          ? "text-red-500"
                          : log.type === "success"
                            ? "text-green-500"
                            : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <span className="text-[var(--color-text-tertiary)]">
                        [{formatTime(log.timestamp)}]
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
