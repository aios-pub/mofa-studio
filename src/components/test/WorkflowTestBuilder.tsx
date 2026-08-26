import { useTranslation } from "react-i18next";
/**
 * Workflow test builder component
 * For configuring input mapping and expected output of workflow tests
 */

import { useState, useEffect, useMemo } from "react";
import {
  Select,
  Input,
  Card,
  Typography,
  Button,
  Switch,
  Tag,
} from "antd";
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined } from "@ant-design/icons";
import type { WorkflowRequestConfig } from "@/types/testrequest";

const { Text } = Typography;

interface WorkflowTestBuilderProps {
  value?: WorkflowRequestConfig;
  onChange?: (config: WorkflowRequestConfig) => void;
  readonly?: boolean;
}

interface ParamMapping {
  workflowParam: string;
  testValue: string;
  paramType: "string" | "number" | "boolean" | "json" | "date";
}

export function WorkflowTestBuilder({
  value,
  onChange,
  readonly = false,
}: WorkflowTestBuilderProps) {  const { t } = useTranslation();

  const config = useMemo(() => value || getDefaultConfig(), [value]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");
  const [paramMappings, setParamMappings] = useState<ParamMapping[]>([]);
  const [expectedOutputs, setExpectedOutputs] = useState<
    Array<{ key: string; value: string; condition?: string }>
  >([]);

  useEffect(() => {
    if (config.workflowId) {
      setSelectedWorkflow(config.workflowId);
    }
    if (config.inputMapping) {
      const mappings = Object.entries(config.inputMapping).map(([workflowParam, testValue]) => ({
        workflowParam,
        testValue: String(testValue),
        paramType: "string" as const,
      }));
      setParamMappings(mappings);
    }
    if (config.expectedOutput) {
      const outputs = Object.entries(config.expectedOutput).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
      }));
      setExpectedOutputs(outputs);
    }
  }, [config]);

  const updateConfig = (updates: Partial<WorkflowRequestConfig>) => {
    if (!readonly && onChange) {
      onChange({ ...config, ...updates });
    }
  };

  // Simulated workflow list (should be fetched from API)
  const mockWorkflows = [
    { id: "wf-1", name: t("数据处理工作流") },
    { id: "wf-2", name: t("文档生成工作流") },
    { id: "wf-3", name: t("邮件发送工作流") },
  ];

  // Simulated workflow parameters (should be fetched from API)
  const mockWorkflowParams: Record<string, Array<{ name: string; type: string; required: boolean }>> = {
    "wf-1": [
      { name: "input_data", type: "string", required: true },
      { name: "format", type: "string", required: false },
      { name: "async", type: "boolean", required: false },
    ],
    "wf-2": [
      { name: "template_id", type: "string", required: true },
      { name: "variables", type: "json", required: false },
    ],
    "wf-3": [
      { name: "recipients", type: "json", required: true },
      { name: "subject", type: "string", required: true },
      { name: "body", type: "string", required: true },
    ],
  };

  const currentWorkflowParams = mockWorkflowParams[selectedWorkflow] || [];

  const handleWorkflowChange = (workflowId: string) => {
    setSelectedWorkflow(workflowId);
    setParamMappings([]);
    setExpectedOutputs([]);
    updateConfig({
      workflowId,
      inputMapping: undefined,
      expectedOutput: undefined,
    });
  };

  const handleAddParamMapping = () => {
    setParamMappings((prev) => [...prev, { workflowParam: "", testValue: "", paramType: "string" }]);
  };

  const handleUpdateParamMapping = (index: number, field: keyof ParamMapping, value: string) => {
    const newMappings = [...paramMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setParamMappings(newMappings);

    // Update input mapping
    const inputMapping = newMappings.reduce((acc, mapping) => {
      if (mapping.workflowParam && mapping.testValue) {
        let value: any = mapping.testValue;
        if (mapping.paramType === "number") {
          value = Number(value);
        } else if (mapping.paramType === "boolean") {
          value = value === "true";
        } else if (mapping.paramType === "json") {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as-is
          }
        }
        acc[mapping.workflowParam] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    updateConfig({ inputMapping });
  };

  const handleRemoveParamMapping = (index: number) => {
    const newMappings = paramMappings.filter((_, i) => i !== index);
    setParamMappings(newMappings);

    const inputMapping = newMappings.reduce((acc, mapping) => {
      if (mapping.workflowParam && mapping.testValue) {
        let value: any = mapping.testValue;
        if (mapping.paramType === "number") {
          value = Number(value);
        } else if (mapping.paramType === "boolean") {
          value = value === "true";
        } else if (mapping.paramType === "json") {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as-is
          }
        }
        acc[mapping.workflowParam] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    updateConfig({ inputMapping });
  };

  const handleAddExpectedOutput = () => {
    setExpectedOutputs((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleUpdateExpectedOutput = (index: number, field: "key" | "value", value: string) => {
    const newOutputs = [...expectedOutputs];
    newOutputs[index] = { ...newOutputs[index], [field]: value };
    setExpectedOutputs(newOutputs);

    // Update expected output
    const expectedOutput = newOutputs.reduce((acc, output) => {
      if (output.key && output.value) {
        try {
          acc[output.key] = JSON.parse(output.value);
        } catch {
          acc[output.key] = output.value;
        }
      }
      return acc;
    }, {} as Record<string, any>);
    updateConfig({ expectedOutput });
  };

  const handleRemoveExpectedOutput = (index: number) => {
    const newOutputs = expectedOutputs.filter((_, i) => i !== index);
    setExpectedOutputs(newOutputs);

    const expectedOutput = newOutputs.reduce((acc, output) => {
      if (output.key && output.value) {
        try {
          acc[output.key] = JSON.parse(output.value);
        } catch {
          acc[output.key] = output.value;
        }
      }
      return acc;
    }, {} as Record<string, any>);
    updateConfig({ expectedOutput });
  };

  return (
    <div className="space-y-4">
      {/* Workflow selection */}
      <Card title={t("选择工作流")} size="small">
        <div className="space-y-3">
          <div>
            <Text strong>{t("工作流")}</Text>
            <Select
              value={selectedWorkflow}
              onChange={handleWorkflowChange}
              options={mockWorkflows.map((wf) => ({ label: wf.name, value: wf.id }))}
              placeholder={t("选择要测试的工作流")}
              disabled={readonly}
              className="w-full mt-1"
            />
          </div>

          {selectedWorkflow && (
            <div className="bg-gray-50 p-3 rounded">
              <Text className="text-sm text-gray-600">
                工作流参数要求：
              </Text>
              <div className="mt-2 space-y-1">
                {currentWorkflowParams.map((param) => (
                  <div key={param.name} className="flex items-center gap-2 text-sm">
                    <Tag color={param.required ? "red" : "default"}>
                      {param.name}
                    </Tag>
                    <Tag>{param.type}</Tag>
                    {param.required && <Text type="danger">{t("必填")}</Text>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Input parameter mapping */}
      <Card title={t("输入参数映射")} size="small">
        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            将工作流参数映射到测试值
          </div>

          {paramMappings.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              暂无参数映射
            </div>
          ) : (
            paramMappings.map((mapping, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Text className="text-xs">{t("工作流参数")}</Text>
                  <Select
                    value={mapping.workflowParam}
                    onChange={(value) => handleUpdateParamMapping(index, "workflowParam", value)}
                    options={currentWorkflowParams.map((p) => ({
                      label: `${p.name} (${p.type})`,
                      value: p.name,
                    }))}
                    placeholder={t("选择参数")}
                    disabled={readonly}
                    className="w-full"
                  />
                </div>

                <div className="flex-1">
                  <Text className="text-xs">{t("类型")}</Text>
                  <Select
                    value={mapping.paramType}
                    onChange={(value) => handleUpdateParamMapping(index, "paramType", value)}
                    options={[
                      { label: t("字符串"), value: "string" },
                      { label: t("数字"), value: "number" },
                      { label: t("布尔值"), value: "boolean" },
                      { label: "JSON", value: "json" },
                      { label: t("日期"), value: "date" },
                    ]}
                    disabled={readonly}
                    className="w-full"
                  />
                </div>

                <div className="flex-[2]">
                  <Text className="text-xs">{t("测试值")}</Text>
                  {mapping.paramType === "boolean" ? (
                    <Switch
                      checked={mapping.testValue === "true"}
                      onChange={(checked) =>
                        handleUpdateParamMapping(index, "testValue", checked ? "true" : "false")
                      }
                      disabled={readonly}
                      className="mt-1"
                    />
                  ) : (
                    <Input
                      value={mapping.testValue}
                      onChange={(e) => handleUpdateParamMapping(index, "testValue", e.target.value)}
                      placeholder={t("输入测试值")}
                      disabled={readonly}
                    />
                  )}
                </div>

                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveParamMapping(index)}
                  disabled={readonly}
                  className="mt-4"
                />
              </div>
            ))
          )}

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddParamMapping}
            disabled={readonly || !selectedWorkflow}
            block
          >
            添加参数映射
          </Button>
        </div>
      </Card>

      {/* Expected output configuration */}
      <Card title={t("预期输出")} size="small">
        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            配置工作流执行后的预期输出值，用于断言验证
          </div>

          {expectedOutputs.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              暂无预期输出配置
            </div>
          ) : (
            expectedOutputs.map((output, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    value={output.key}
                    onChange={(e) => handleUpdateExpectedOutput(index, "key", e.target.value)}
                    placeholder={t("输出字段名")}
                    disabled={readonly}
                    addonBefore="字段"
                  />
                </div>
                <div className="flex-[2]">
                  <Input
                    value={output.value}
                    onChange={(e) => handleUpdateExpectedOutput(index, "value", e.target.value)}
                    placeholder={t("预期值（支持JSON）")}
                    disabled={readonly}
                    addonBefore="预期值"
                  />
                </div>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveExpectedOutput(index)}
                  disabled={readonly}
                  className="mt-1"
                />
              </div>
            ))
          )}

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleAddExpectedOutput}
            disabled={readonly}
            block
          >
            添加预期输出
          </Button>
        </div>
      </Card>

      {/* Test execution */}
      {selectedWorkflow && (
        <Card title={t("执行测试")} size="small">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-600">
                准备执行工作流测试
              </Text>
              {selectedWorkflow && (
                <div className="mt-1">
                  <Tag color="blue">
                    {mockWorkflows.find((w) => w.id === selectedWorkflow)?.name}
                  </Tag>
                  <Tag>{paramMappings.length} 个参数</Tag>
                  <Tag>{expectedOutputs.length} 个断言</Tag>
                </div>
              )}
            </div>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              disabled={readonly}
            >
              运行测试
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function getDefaultConfig(): WorkflowRequestConfig {
  return {
    workflowId: "",
    inputMapping: undefined,
    expectedOutput: undefined,
  };
}
