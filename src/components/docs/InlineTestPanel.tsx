/**
 * 内联测试面板组件
 * 支持在Document页面直接发送请求并展示响应
 */

import { useState, useEffect, useRef } from "react";
import {
  Card,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Tabs,
  Tag,
  Alert,
} from "antd";
import {
  PlayCircleOutlined,
  SaveOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import type { EndpointDocumentation } from "@/types/documentation";
import type { EnvironmentVariable } from "@/types/testset";
import { EnvironmentManager } from "@/components/test/EnvironmentManager";
import { replaceVariables, replaceVariablesInObject } from "@/utils/envVariables";
import { testSetRealApi } from "@/services/real/testsets";

const { Text } = Typography;
const { TextArea } = Input;

interface InlineTestPanelProps {
  endpoint: EndpointDocumentation;
  onSaveRequest?: () => void;
}

interface RequestResult {
  statusCode: number;
  statusMessage: string;
  headers: Array<{ name: string; value: string }>;
  body: string;
  duration: number;
}

export function InlineTestPanel({ endpoint, onSaveRequest }: InlineTestPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RequestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 表单状态
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [body, setBody] = useState<string>("");

  // 认证配置状态
  const [authType, setAuthType] = useState<"none" | "bearer" | "apiKey" | "basic">("none");
  const [authToken, setAuthToken] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authKeyName, setAuthKeyName] = useState("");
  const [authKeyValue, setAuthKeyValue] = useState("");
  const [authKeyLocation, setAuthKeyLocation] = useState<"header" | "query">("header");

  // Environment variable状态
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
  const [environmentVariables, setEnvironmentVariables] = useState<EnvironmentVariable[]>([]);

  const [savedRequest, setSavedRequest] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 填充示例值，endpoint变化时重置所有状态
  useEffect(() => {
    setPathParams({});
    setQueryParams({});
    setHeaders({});
    setBody("");
    setResult(null);
    setError(null);
    setSavedRequest(false);

    if (endpoint.parameters) {
      const pathParams: Record<string, string> = {};
      const queryParams: Record<string, string> = {};
      const headersObj: Record<string, string> = {};

      endpoint.parameters.forEach((param) => {
        const exampleValue = param.schema?.example || "";

        if (param.in === "path") {
          pathParams[param.name] = String(exampleValue);
        } else if (param.in === "query") {
          queryParams[param.name] = String(exampleValue);
        } else if (param.in === "header") {
          headersObj[param.name] = String(param.schema?.example || "");
        }
      });

      setPathParams(pathParams);
      setQueryParams(queryParams);
      setHeaders(headersObj);
    }
  }, [endpoint]);

  const constructUrl = () => {
    let url = endpoint.path;

    // 应用Environment variable替换
    url = replaceVariables(url, environmentVariables);

    // 替换路径参数
    Object.entries(pathParams).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value);
    });

    // 添加查询参数
    const queryParamsObj = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) {
        queryParamsObj.append(key, value);
      }
    });

    // API Key 作为查询参数
    if (authType === "apiKey" && authKeyLocation === "query" && authKeyName && authKeyValue) {
      queryParamsObj.append(authKeyName, authKeyValue);
    }

    const queryString = queryParamsObj.toString();
    return queryString ? `${url}?${queryString}` : url;
  };

  const constructAuthHeaders = (): Record<string, string> => {
    const authHeaders: Record<string, string> = {};

    if (authType === "bearer" && authToken) {
      const token = replaceVariables(authToken, environmentVariables);
      authHeaders["Authorization"] = `Bearer ${token}`;
    } else if (authType === "apiKey" && authKeyLocation === "header" && authKeyName && authKeyValue) {
      const keyName = replaceVariables(authKeyName, environmentVariables);
      const keyValue = replaceVariables(authKeyValue, environmentVariables);
      authHeaders[keyName] = keyValue;
    } else if (authType === "basic" && authUsername) {
      const username = replaceVariables(authUsername, environmentVariables);
      const password = replaceVariables(authPassword, environmentVariables);
      const credentials = btoa(`${username}:${password}`);
      authHeaders["Authorization"] = `Basic ${credentials}`;
    }

    return authHeaders;
  };

  const handleSend = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // 合并认证headers（除了API Key在query中的情况）
      const authHeaders = constructAuthHeaders();
      const mergedHeaders = { ...headers, ...authHeaders };

      // 准备认证配置
      let authConfig: { authType?: string; authConfig?: Record<string, unknown> } = {};

      if (authType === "bearer" && authToken) {
        authConfig = {
          authType: "bearer",
          authConfig: { token: authToken },
        };
      } else if (authType === "apiKey" && authKeyName && authKeyValue) {
        authConfig = {
          authType: "api_key",
          authConfig: {
            headerName: authKeyName,
            apiKey: authKeyValue,
            addTo: authKeyLocation,
          },
        };
      } else if (authType === "basic" && authUsername) {
        authConfig = {
          authType: "basic",
          authConfig: {
            username: authUsername,
            password: authPassword,
          },
        };
      }

      // 使用 HTTP 测试执行 API
      const response = await testSetRealApi.executeHttpRequest({
        url: constructUrl(),
        method: endpoint.method,
        headers: Object.keys(mergedHeaders).length > 0 ? mergedHeaders : undefined,
        body: endpoint.request_body && body ? (() => {
          try {
            let parsedBody = JSON.parse(body);
            // 应用Environment variable替换到请求体
            parsedBody = replaceVariablesInObject(parsedBody, environmentVariables);
            return parsedBody;
          } catch {
            // e.g.果不是有效的JSON，直接应用字符串替换
            return replaceVariables(body, environmentVariables);
          }
        })() : undefined,
        bodyType: endpoint.request_body?.content_type,
        timeout: 30000,
        ...authConfig,
      });

      setResult({
        statusCode: response.status_code,
        statusMessage: response.status_message,
        headers: response.headers,
        body: response.body,
        duration: response.duration,
      });

      if (!response.success) {
        setError(response.error || "请求失败");
      }
    } catch (err: any) {
      setError(err.message || "请求失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (onSaveRequest) {
      onSaveRequest();
      setSavedRequest(true);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => setSavedRequest(false), 2000);
    }
  };

  const getStatusTag = () => {
    if (loading) {
      return <Tag icon={<LoadingOutlined />}>执行中</Tag>;
    }
    if (result) {
      return result.statusCode >= 200 && result.statusCode < 300 ? (
        <Tag icon={<CheckCircleOutlined />} color="success">
          {result.statusCode} {result.statusMessage}
        </Tag>
      ) : (
        <Tag icon={<CloseCircleOutlined />} color="error">
          {result.statusCode} {result.statusMessage}
        </Tag>
      );
    }
    if (error) {
      return <Tag color="error">错误</Tag>;
    }
    return null;
  };

  return (
    <Card
      title={
        <Space>
          <PlayCircleOutlined /> 在线测试
          {savedRequest && (
            <Tag icon={<CheckCircleOutlined />} color="success">
              已保存
            </Tag>
          )}
        </Space>
      }
         >
      {/* Environment variable选择器 */}
      <div className="mb-4">
        <Space className="w-full">
          <EnvironmentOutlined />
          <Text strong>环境:</Text>
          <EnvironmentManager
            value={selectedEnvironment}
            onChange={(envId) => {
              setSelectedEnvironment(envId);
            }}
            onVariablesChange={(variables) => {
              setEnvironmentVariables(variables);
            }}
            className="flex-1"
          />
          {selectedEnvironment && (
            <Tag color="green">
              {environmentVariables.length} 个变量
            </Tag>
          )}
        </Space>
      </div>
      <Tabs
        defaultActiveKey="params"
        items={[
          {
            key: "params",
            label: "参数",
            children: (
              <div className="space-y-4">
                {/* 路径参数 */}
                {(endpoint.parameters?.filter((p) => p.in === "path").length ?? 0) > 0 ? (
                  <div>
                    <Text strong>路径参数</Text>
                    <div className="mt-2 space-y-2">
                      {(endpoint.parameters?.filter((p) => p.in === "path") ?? []).map((param) => (
                          <div key={param.name}>
                            <div className="flex items-center gap-2">
                              <Text className="text-sm flex-1">{param.name}</Text>
                              {param.required && (
                                <Tag color="red">
                                  必填
                                </Tag>
                              )}
                            </div>
                            <Input
                              placeholder={param.schema?.example || `输入${param.name}`}
                              value={pathParams[param.name]}
                              onChange={(e) =>
                                setPathParams({ ...pathParams, [param.name]: e.target.value })
                              }
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                {/* 查询参数 */}
                {(endpoint.parameters?.filter((p) => p.in === "query").length ?? 0) > 0 ? (
                  <div>
                    <Text strong>查询参数</Text>
                    <div className="mt-2 space-y-2">
                      {(endpoint.parameters?.filter((p) => p.in === "query") ?? []).map((param) => (
                          <div key={param.name}>
                            <div className="flex items-center gap-2">
                              <Text className="text-sm flex-1">{param.name}</Text>
                              {param.required && (
                                <Tag color="orange">
                                  必填
                                </Tag>
                              )}
                            </div>
                            <Input
                              placeholder={param.schema?.example || `输入${param.name}`}
                              value={queryParams[param.name]}
                              onChange={(e) =>
                                setQueryParams({
                                  ...queryParams,
                                  [param.name]: e.target.value,
                                })
                              }
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                {/* Headers */}
                {(endpoint.headers && endpoint.headers.length > 0) || Object.keys(headers).length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Text strong>请求头</Text>
                      <Button
                                               type="dashed"
                        onClick={() => {
                          const newHeaderName = `custom_header_${Object.keys(headers).length + 1}`;
                          setHeaders({ ...headers, [newHeaderName]: "" });
                        }}
                      >
                        + 添加
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {endpoint.headers?.map((header) => (
                        <div key={header.name}>
                          <div className="flex items-center gap-2">
                            <Text className="text-sm flex-1">{header.name}</Text>
                            {header.required && <Tag>必填</Tag>}
                          </div>
                          <Input
                            placeholder={header.example || `输入${header.name}`}
                            value={headers[header.name]}
                            onChange={(e) =>
                              setHeaders({ ...headers, [header.name]: e.target.value })
                            }
                          />
                        </div>
                      ))}
                      {Object.entries(headers)
                        .filter(([key]) => !endpoint.headers?.some((h) => h.name === key))
                        .map(([name, value]) => (
                          <div key={name}>
                            <div className="flex items-center gap-2">
                              <Text className="text-sm flex-1">{name}</Text>
                              <Tag color="blue">
                                自定义
                              </Tag>
                              <Button
                                                               danger
                                type="text"
                                onClick={() => {
                                  const newHeaders = { ...headers };
                                  delete newHeaders[name];
                                  setHeaders(newHeaders);
                                }}
                              >
                                移除
                              </Button>
                            </div>
                            <Input
                              placeholder={`自定义${name}`}
                              value={value}
                              onChange={(e) =>
                                setHeaders({ ...headers, [name]: e.target.value })
                              }
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                {/* 认证配置 */}
                <div>
                  <Text strong>认证</Text>
                  <div className="mt-2 space-y-2">
                    <Select
                      className="w-full"
                      value={authType}
                      onChange={(value) => setAuthType(value)}
                      options={[
                        { label: "无认证", value: "none" },
                        { label: "Bearer Token", value: "bearer" },
                        { label: "API Key", value: "apiKey" },
                        { label: "Basic Auth", value: "basic" },
                      ]}
                    />
                    {authType === "bearer" && (
                      <div>
                        <Text className="text-xs text-gray-500">Token</Text>
                        <Input.Password
                          placeholder="输入Bearer Token"
                          value={authToken}
                          onChange={(e) => setAuthToken(e.target.value)}
                        />
                      </div>
                    )}
                    {authType === "apiKey" && (
                      <div className="space-y-2">
                        <div>
                          <Text className="text-xs text-gray-500">Key 名称</Text>
                          <Input
                            placeholder="例如: X-API-Key"
                            value={authKeyName}
                            onChange={(e) => setAuthKeyName(e.target.value)}
                          />
                        </div>
                        <div>
                          <Text className="text-xs text-gray-500">Key 值</Text>
                          <Input.Password
                            placeholder="输入API Key值"
                            value={authKeyValue}
                            onChange={(e) => setAuthKeyValue(e.target.value)}
                          />
                        </div>
                        <div>
                          <Text className="text-xs text-gray-500">添加到</Text>
                          <Select
                            className="w-full"
                            value={authKeyLocation}
                            onChange={(value) => setAuthKeyLocation(value)}
                            options={[
                              { label: "请求头 (Header)", value: "header" },
                              { label: "查询参数 (Query)", value: "query" },
                            ]}
                          />
                        </div>
                      </div>
                    )}
                    {authType === "basic" && (
                      <div className="space-y-2">
                        <div>
                          <Text className="text-xs text-gray-500">用户名</Text>
                          <Input
                            placeholder="输入用户名"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                          />
                        </div>
                        <div>
                          <Text className="text-xs text-gray-500">密码</Text>
                          <Input.Password
                            placeholder="输入密码"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 请求体 */}
                {endpoint.request_body && (
                  <div>
                    <Text strong>请求体</Text>
                    <div className="mt-2">
                      <TextArea
                        placeholder={JSON.stringify(endpoint.request_body?.example, null, 2)}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        autoSize={{ minRows: 4, maxRows: 10 }}
                      />
                    </div>
                  </div>
                )}

                {/* URL预览 */}
                <Alert
                  message="请求URL"
                  description={<code className="text-xs break-all">{constructUrl()}</code>}
                  type="info"
                />
              </div>
            ),
          },
          {
            key: "response",
            label: "响应",
            children: (
              <div className="space-y-4">
                {/* 响应状态 */}
                <div className="flex items-center justify-between">
                  <Space>
                    <Text strong>响应状态</Text>
                    {getStatusTag()}
                  </Space>
                  {result && (
                    <Space>
                      <Text type="secondary">耗时: {result.duration}ms</Text>
                      <Button
                                               icon={<CopyOutlined />}
                        onClick={() => navigator.clipboard.writeText(result.body)}
                      >
                        复制响应
                      </Button>
                    </Space>
                  )}
                </div>

                {/* 响应头 */}
                {result?.headers && result.headers.length > 0 && (
                  <div>
                    <Text strong>响应头</Text>
                    <div className="mt-2 space-y-1">
                      {result.headers.map((header) => (
                        <div key={header.name} className="flex gap-2">
                          <Text className="text-xs text-gray-500">{header.name}:</Text>
                          <Text code className="text-xs">{header.value}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 响应体 */}
                {result?.body && (
                  <div>
                    <Text strong>响应体</Text>
                    <div className="mt-2 bg-gray-50 p-3 rounded">
                      <pre className="text-xs overflow-x-auto">{result.body}</pre>
                    </div>
                  </div>
                )}

                {error && (
                  <Alert message="请求错误" description={error} type="error" />
                )}
              </div>
            ),
          },
        ]}
      />

      {/* 操作按钮 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleSend}
            loading={loading}
            disabled={!constructUrl()}
          >
            发送请求
          </Button>
          <Button icon={<SaveOutlined />} onClick={handleSave}>
            保存为测试用例
          </Button>
        </Space>
      </div>
    </Card>
  );
}
