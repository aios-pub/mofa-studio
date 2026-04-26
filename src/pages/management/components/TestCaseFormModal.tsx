/**
 * 测试用例创建/编辑表单弹窗
 */

import { useEffect, useState, useMemo } from "react";
import { Form, Input, Select, Button, Space, Divider, Collapse, Spin } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { FormModal, useFormError } from "@/components/common/Modal";
import { HttpRequestBuilder } from "@/components/test/HttpRequestBuilder";
import { testSetRealApi } from "@/services/real/testsets";
import { WorkflowTestBuilder } from "@/components/test/WorkflowTestBuilder";
import { WebSocketTestBuilder } from "@/components/test/WebSocketTestBuilder";
import { SSETestBuilder } from "@/components/test/SSETestBuilder";
import { SocketIOTestBuilder } from "@/components/test/SocketIOTestBuilder";
import { ScriptEditor } from "@/components/test/ScriptEditor";
import { ResponseViewer } from "@/components/test/ResponseViewer";
import { DataDrivenTestConfig } from "@/components/test/DataDrivenTestConfig";
import { EnvironmentManager } from "@/components/test/EnvironmentManager";
import type { TestCase, TestCaseFormData, Assertion, AssertionType, TestCaseRequestType, EnvironmentVariable } from "@/types/testset";
import type {
  HttpRequestConfig,
  WorkflowRequestConfig,
  WebSocketRequestConfig,
  SSERequestConfig,
  SocketIORequestConfig,
} from "@/types/testrequest";
import { replaceVariables, replaceVariablesInObject } from "@/utils/envVariables";

interface TestCaseFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TestCaseFormData) => Promise<void>;
  testCase?: TestCase | null;
  loading?: boolean;
}

const ASSERTION_TYPES: { label: string; value: AssertionType }[] = [
  { label: "包含", value: "contains" },
  { label: "精确匹配", value: "exact" },
  { label: "正则匹配", value: "regex" },
  { label: "AI 评估", value: "ai_eval" },
];

const REQUEST_TYPES: { label: string; value: TestCaseRequestType }[] = [
  { label: "Agent 对话", value: "agent" },
  { label: "HTTP 请求", value: "http" },
  { label: "WebSocket", value: "websocket" },
  { label: "SSE", value: "sse" },
  { label: "Socket.IO", value: "socketio" },
  { label: "工作流", value: "workflow" },
];

export function TestCaseFormModal({
  open,
  onClose,
  onSubmit,
  testCase,
  loading,
}: TestCaseFormModalProps) {
  const [form] = Form.useForm<TestCaseFormData>();
  const [requestType, setRequestType] = useState<TestCaseRequestType>("agent");
  const [httpConfig, setHttpConfig] = useState<HttpRequestConfig>();
  const [webSocketConfig, setWebSocketConfig] = useState<WebSocketRequestConfig>();
  const [sseConfig, setSSEConfig] = useState<SSERequestConfig>();
  const [socketIOConfig, setSocketIOConfig] = useState<SocketIORequestConfig>();
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowRequestConfig>();

  // 高级功能状态
  const [preRequestScript, setPreRequestScript] = useState<string>("");
  const [testScript, setTestScript] = useState<string>("");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [environmentVariables, setEnvironmentVariables] = useState<EnvironmentVariable[]>([]);
  const [dataDrivenEnabled, setDataDrivenEnabled] = useState<boolean>(false);
  const [dataDrivenConfig, setDataDrivenConfig] = useState<any>(undefined);
  const [advancedActiveKey, setAdvancedActiveKey] = useState<string | string[]>([]);

  // 缓存数据驱动测试默认配置，避免每次渲染创建新对象导致子组件状态重置
  const defaultDataDrivenConfig = useMemo(
    () => ({
      id: `ddt-${testCase?.id || "new"}`,
      testCaseId: testCase?.id || "new",
      name: "Data Driven Test",
      dataSourceType: "json" as const,
      dataSourceData: "",
      variableMapping: {},
      enabled: dataDrivenEnabled,
    }),
    [testCase?.id, dataDrivenEnabled],
  );

  const isEdit = !!testCase;
  const { error, handleError, clearError } = useFormError(open);

  // HTTP 快速测试状态
  const [httpTestLoading, setHttpTestLoading] = useState(false);
  const [httpTestResult, setHttpTestResult] = useState<{
    statusCode: number;
    statusMessage: string;
    body: string;
    duration: number;
    success: boolean;
    headers: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    if (open) {
      // 先重置所有状态，避免不同测试用例之间的状态残留
      setPreRequestScript("");
      setTestScript("");
      setSelectedEnvironment("");
      setEnvironmentVariables([]);
      setDataDrivenEnabled(false);
      setDataDrivenConfig(undefined);
      setHttpConfig(undefined);
      setWebSocketConfig(undefined);
      setSSEConfig(undefined);
      setSocketIOConfig(undefined);
      setWorkflowConfig(undefined);
      setHttpTestResult(null);

      if (testCase) {
        const assertions = Array.isArray(testCase.assertions)
          ? (testCase.assertions as Assertion[]).map((a) => ({
              type: a.type,
              value: a.value,
              description: a.description || "",
            }))
          : [];
        const reqType = testCase.requestType || "agent";
        setRequestType(reqType);

        form.setFieldsValue({
          name: testCase.name,
          description: testCase.description || "",
          input: testCase.input,
          expectedOutput: testCase.expectedOutput || "",
          assertions,
        });

        // 加载脚本
        setPreRequestScript(testCase.preRequestScript || "");
        setTestScript(testCase.testScript || "");

        // 加载环境变量
        setSelectedEnvironment(testCase.environmentId || "");

        // 加载数据驱动测试配置
        if (testCase.requestConfig) {
          const config = testCase.requestConfig as any;
          if (config.dataDrivenConfig) {
            setDataDrivenConfig(config.dataDrivenConfig);
            setDataDrivenEnabled(config.dataDrivenConfig.enabled || false);
          }
        }

        // 如果是HTTP请求类型，设置HTTP配置
        if (reqType === "http" && testCase.requestConfig) {
          setHttpConfig(testCase.requestConfig as unknown as HttpRequestConfig);
        }

        // 如果是WebSocket请求类型，设置WebSocket配置
        if (reqType === "websocket" && testCase.requestConfig) {
          setWebSocketConfig(testCase.requestConfig as unknown as WebSocketRequestConfig);
        }

        // 如果是SSE请求类型，设置SSE配置
        if (reqType === "sse" && testCase.requestConfig) {
          setSSEConfig(testCase.requestConfig as unknown as SSERequestConfig);
        }

        // 如果是Socket.IO请求类型，设置Socket.IO配置
        if (reqType === "socketio" && testCase.requestConfig) {
          setSocketIOConfig(testCase.requestConfig as unknown as SocketIORequestConfig);
        }

        // 如果是工作流请求类型，设置工作流配置
        if (reqType === "workflow" && testCase.requestConfig) {
          setWorkflowConfig(testCase.requestConfig as unknown as WorkflowRequestConfig);
        }

        // 如果有高级配置，自动展开高级功能面板
        const hasAdvancedConfig =
          !!testCase.preRequestScript ||
          !!testCase.testScript ||
          !!testCase.environmentId ||
          !!(testCase.requestConfig && (testCase.requestConfig as any).dataDrivenConfig);
        setAdvancedActiveKey(hasAdvancedConfig ? ["advanced"] : []);
      } else {
        form.resetFields();
        setRequestType("agent");
        setAdvancedActiveKey([]);
      }
    }
  }, [open, testCase, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // 转换断言数据，添加 id
      const assertions: Assertion[] = (values.assertions || []).map((a, i) => ({
        id: `a-${Date.now()}-${i}`,
        type: a.type,
        value: a.value,
        description: a.description,
      }));

      // 准备提交数据
      const submitData: TestCaseFormData = {
        ...values,
        assertions,
        requestType,
      };

      // 非 Agent 类型不保留 expectedOutput，避免数据污染
      if (requestType !== "agent") {
        submitData.expectedOutput = "";
      }

      // 添加高级功能数据（无条件提交，支持清除操作）
      submitData.preRequestScript = preRequestScript;
      submitData.testScript = testScript;
      submitData.environmentId = selectedEnvironment;

      // 根据请求类型设置requestConfig（包含数据驱动测试配置）
      if (requestType === "http" && httpConfig) {
        const configWithDdt = { ...httpConfig };
        if (dataDrivenEnabled && dataDrivenConfig) {
          (configWithDdt as any).dataDrivenConfig = dataDrivenConfig;
        } else {
          delete (configWithDdt as any).dataDrivenConfig;
        }
        submitData.requestConfig = configWithDdt as unknown as Record<string, unknown>;
        submitData.input = httpConfig.url;
      } else if (requestType === "websocket" && webSocketConfig) {
        const configWithDdt = { ...webSocketConfig };
        if (dataDrivenEnabled && dataDrivenConfig) {
          (configWithDdt as any).dataDrivenConfig = dataDrivenConfig;
        } else {
          delete (configWithDdt as any).dataDrivenConfig;
        }
        submitData.requestConfig = configWithDdt as unknown as Record<string, unknown>;
        submitData.input = webSocketConfig.url;
      } else if (requestType === "sse" && sseConfig) {
        const configWithDdt = { ...sseConfig };
        if (dataDrivenEnabled && dataDrivenConfig) {
          (configWithDdt as any).dataDrivenConfig = dataDrivenConfig;
        } else {
          delete (configWithDdt as any).dataDrivenConfig;
        }
        submitData.requestConfig = configWithDdt as unknown as Record<string, unknown>;
        submitData.input = sseConfig.url;
      } else if (requestType === "socketio" && socketIOConfig) {
        const configWithDdt = { ...socketIOConfig };
        if (dataDrivenEnabled && dataDrivenConfig) {
          (configWithDdt as any).dataDrivenConfig = dataDrivenConfig;
        } else {
          delete (configWithDdt as any).dataDrivenConfig;
        }
        submitData.requestConfig = configWithDdt as unknown as Record<string, unknown>;
        submitData.input = socketIOConfig.url;
      } else if (requestType === "workflow" && workflowConfig) {
        const configWithDdt = { ...workflowConfig };
        if (dataDrivenEnabled && dataDrivenConfig) {
          (configWithDdt as any).dataDrivenConfig = dataDrivenConfig;
        } else {
          delete (configWithDdt as any).dataDrivenConfig;
        }
        submitData.requestConfig = configWithDdt as unknown as Record<string, unknown>;
        submitData.input = workflowConfig.workflowId;
      } else if (requestType === "agent") {
        if (dataDrivenEnabled && dataDrivenConfig) {
          submitData.requestConfig = { dataDrivenConfig: dataDrivenConfig } as Record<string, unknown>;
        } else {
          submitData.requestConfig = {};
        }
      }

      await onSubmit(submitData as TestCaseFormData);
      form.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return;
      handleError(err);
    }
  };

  const handleExecuteHttp = async (config: HttpRequestConfig) => {
    try {
      setHttpTestLoading(true);
      setHttpTestResult(null);

      // 应用环境变量替换
      const resolvedUrl = replaceVariables(config.url, environmentVariables);
      const resolvedHeaders = config.headers?.reduce((acc, h) => {
        if (h.enabled !== false && h.key) {
          const resolvedKey = replaceVariables(h.key, environmentVariables);
          const resolvedValue = replaceVariables(h.value, environmentVariables);
          acc[resolvedKey] = resolvedValue;
        }
        return acc;
      }, {} as Record<string, string>);
      const resolvedParams = config.params
        ?.filter((p) => p.enabled !== false && p.key)
        .map((p) => ({
          key: replaceVariables(p.key, environmentVariables),
          value: replaceVariables(p.value, environmentVariables),
        }));
      const resolvedBody = config.body
        ? replaceVariablesInObject(config.body, environmentVariables)
        : undefined;
      const resolvedAuthConfig = config.authConfig
        ? (replaceVariablesInObject(config.authConfig, environmentVariables) as Record<string, unknown>)
        : undefined;

      const result = await testSetRealApi.executeHttpRequest({
        url: resolvedUrl,
        method: config.method,
        headers: resolvedHeaders,
        params: resolvedParams,
        body: resolvedBody,
        bodyType: config.bodyType,
        timeout: config.timeout,
        authType: config.authType,
        authConfig: resolvedAuthConfig,
      });
      setHttpTestResult({
        statusCode: result.status_code || 0,
        statusMessage: result.status_message || "",
        body: result.body || "",
        duration: result.duration || 0,
        success: result.success || false,
        headers: result.headers?.reduce((acc, h) => {
          acc[h.name] = h.value;
          return acc;
        }, {} as Record<string, string>) || {},
      });
    } catch (err: any) {
      setHttpTestResult({
        statusCode: 0,
        statusMessage: "Request Failed",
        body: err?.message || "Unknown error",
        duration: 0,
        success: false,
        headers: {},
      });
    } finally {
      setHttpTestLoading(false);
    }
  };

  const handleRequestTypeChange = (newType: TestCaseRequestType) => {
    setRequestType(newType);
    setHttpTestResult(null);
    if (newType === "http" && !httpConfig) {
      // 初始化默认 HTTP 配置
      setHttpConfig({
        url: "",
        method: "GET",
        headers: [],
        params: [],
        bodyType: "none",
        rawContentType: "application/json",
      });
    }
    if (newType === "websocket" && !webSocketConfig) {
      // 初始化默认 WebSocket 配置
      setWebSocketConfig({
        url: "",
        protocols: [],
        headers: [],
        messagesToSend: [],
        expectedEvents: [],
      });
    }
    if (newType === "sse" && !sseConfig) {
      // 初始化默认 SSE 配置
      setSSEConfig({
        url: "",
        headers: [],
        minEvents: 1,
        maxDuration: 30000,
      });
    }
    if (newType === "socketio" && !socketIOConfig) {
      // 初始化默认 Socket.IO 配置
      setSocketIOConfig({
        url: "",
        namespace: "/",
        auth: {},
        eventsToEmit: [],
        eventsToListen: [],
      });
    }
    if (newType === "workflow" && !workflowConfig) {
      // 初始化默认工作流配置
      setWorkflowConfig({
        workflowId: "",
        inputMapping: {},
      });
    }
  };

  return (
    <FormModal
      open={open}
      onCancel={onClose}
      onSubmit={handleOk}
      title={isEdit ? "编辑测试用例" : "新建测试用例"}
      submitText={isEdit ? "保存" : "创建"}
      loading={loading}
      error={error}
      onClearError={clearError}
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="name"
          label="用例名称"
          rules={[{ required: true, message: "请输入用例名称" }]}
        >
          <Input placeholder="请输入用例名称" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input placeholder="请输入用例描述" />
        </Form.Item>

        <Form.Item label="请求类型">
          <Select
            value={requestType}
            onChange={handleRequestTypeChange}
            options={REQUEST_TYPES}
          />
        </Form.Item>

        <Divider className="my-3" />

        {requestType === "agent" && (
          <>
            <Form.Item
              name="input"
              label="输入"
              rules={[{ required: true, message: "请输入测试输入" }]}
            >
              <Input.TextArea
                placeholder="请输入测试输入内容"
                rows={3}
                showCount
                maxLength={2000}
              />
            </Form.Item>

            <Form.Item name="expectedOutput" label="期望输出">
              <Input.TextArea
                placeholder="请输入期望输出"
                rows={2}
                showCount
                maxLength={1000}
              />
            </Form.Item>
          </>
        )}

        {requestType === "http" && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-2">
              配置HTTP请求详情
            </div>
            <HttpRequestBuilder
              value={httpConfig}
              onChange={setHttpConfig}
              onExecute={handleExecuteHttp}
              loading={httpTestLoading}
            />
            {httpTestLoading && (
              <div className="flex items-center justify-center py-4">
                <Spin tip="发送请求中..." />
              </div>
            )}
            {httpTestResult && !httpTestLoading && (
              <ResponseViewer
                response={{
                  statusCode: httpTestResult.statusCode,
                  statusMessage: httpTestResult.statusMessage,
                  headers: httpTestResult.headers,
                  body: httpTestResult.body,
                  responseTime: httpTestResult.duration,
                }}
              />
            )}
          </div>
        )}

        {requestType === "websocket" && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-2">
              配置WebSocket请求详情
            </div>
            <WebSocketTestBuilder
              value={webSocketConfig}
              onChange={setWebSocketConfig}
            />
          </div>
        )}

        {requestType === "sse" && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-2">
              配置SSE请求详情
            </div>
            <SSETestBuilder
              value={sseConfig}
              onChange={setSSEConfig}
            />
          </div>
        )}

        {requestType === "socketio" && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-2">
              配置Socket.IO请求详情
            </div>
            <SocketIOTestBuilder
              value={socketIOConfig}
              onChange={setSocketIOConfig}
            />
          </div>
        )}

        {requestType === "workflow" && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-2">
              配置工作流测试详情
            </div>
            <WorkflowTestBuilder
              value={workflowConfig}
              onChange={setWorkflowConfig}
            />
          </div>
        )}

        <Form.Item label="断言规则">
          <Form.List name="assertions">
            {(fields, { add, remove }) => (
              <div className="space-y-2">
                {fields.map(({ key, name, ...restField }) => (
                  <Space
                    key={key}
                    style={{ display: "flex", width: "100%" }}
                    align="start"
                  >
                    <Form.Item
                      {...restField}
                      name={[name, "type"]}
                      rules={[{ required: true, message: "请选择类型" }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        style={{ width: 120 }}
                        placeholder="断言类型"
                        options={ASSERTION_TYPES}
                      />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "value"]}
                      rules={[{ required: true, message: "请输入值" }]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input placeholder="匹配值" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, "description"]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input placeholder="描述（可选）" />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ type: "contains" })}
                  icon={<PlusOutlined />}
                  style={{ width: "100%" }}
                >
                  添加断言
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>

        {/* 高级功能 */}
        <Collapse
          activeKey={advancedActiveKey}
          onChange={(keys) => setAdvancedActiveKey(keys)}
          items={[
            {
              key: "advanced",
              label: "高级功能",
              children: (
                <div className="space-y-4">
                  {/* 环境变量选择 */}
                  <div>
                    <div className="text-sm font-medium mb-2">环境变量</div>
                    <EnvironmentManager
                      value={selectedEnvironment}
                      onChange={setSelectedEnvironment}
                      onVariablesChange={setEnvironmentVariables}
                      className="w-full"
                    />
                  </div>

                  {/* 脚本编辑 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-2">前置脚本</div>
                      <ScriptEditor
                        type="pre_request"
                        value={preRequestScript}
                        onChange={setPreRequestScript}
                        readOnly={false}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">测试脚本</div>
                      <ScriptEditor
                        type="test"
                        value={testScript}
                        onChange={setTestScript}
                        readOnly={false}
                      />
                    </div>
                  </div>

                  {/* 数据驱动测试 - 所有测试类型均支持 */}
                  <div>
                    <div className="text-sm font-medium mb-2">数据驱动测试</div>
                    <DataDrivenTestConfig
                      value={dataDrivenConfig || defaultDataDrivenConfig}
                      onChange={(config) => {
                        setDataDrivenEnabled(config.enabled);
                        setDataDrivenConfig(config);
                      }}
                      testCaseId={testCase?.id || "new"}
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Form>
    </FormModal>
  );
}
