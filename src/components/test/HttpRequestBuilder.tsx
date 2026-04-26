/**
 * HTTP请求构建器组件
 * 用于配置HTTP测试请求的URL、方法、Headers、Body等
 */

import { useState, useEffect } from "react";
import {
  Select,
  Input,
  Button,
  Tabs,
  Typography,
  Divider,
  Switch,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import type {
  HttpRequestConfig,
  KeyValue,
  BodyType,
  AuthType,
  RawContentType,
} from "@/types/testrequest";

const { Text } = Typography;
const { TextArea } = Input;

interface HttpRequestBuilderProps {
  value?: HttpRequestConfig;
  onChange?: (config: HttpRequestConfig) => void;
  onExecute?: (config: HttpRequestConfig) => void;
  readonly?: boolean;
  loading?: boolean;
}

export function HttpRequestBuilder({
  value,
  onChange,
  onExecute,
  readonly = false,
  loading = false,
}: HttpRequestBuilderProps) {
  const config = value || getDefaultConfig();

  const updateConfig = (updates: Partial<HttpRequestConfig>) => {
    if (!readonly && onChange) {
      onChange({ ...config, ...updates });
    }
  };

  return (
    <div className="space-y-4">
      {/* URL和方法 */}
      <div className="flex gap-2 items-start">
        <Select
          value={config.method}
          onChange={(method) => updateConfig({ method })}
          className="w-28"
          disabled={readonly}
          options={[
            { label: "GET", value: "GET" },
            { label: "POST", value: "POST" },
            { label: "PUT", value: "PUT" },
            { label: "DELETE", value: "DELETE" },
            { label: "PATCH", value: "PATCH" },
            { label: "HEAD", value: "HEAD" },
            { label: "OPTIONS", value: "OPTIONS" },
          ]}
        />
        <Input
          value={config.url}
          onChange={(e) => updateConfig({ url: e.target.value })}
          placeholder="https://api.example.com/path"
          disabled={readonly}
          className="flex-1"
        />
        <Button
          type="primary"
          icon={<ArrowRightOutlined />}
          disabled={readonly || loading || !config.url?.trim()}
          loading={loading}
          onClick={() => onExecute?.(config)}
        >
          发送
        </Button>
      </div>

      <Divider className="my-2" />

      {/* 标签页 */}
      <Tabs
        defaultActiveKey="params"
        items={[
          {
            key: "params",
            label: "Params",
            children: (
              <KeyValueListEditor
                value={config.params}
                onChange={(params) => updateConfig({ params })}
                placeholder="参数值"
                readonly={readonly}
              />
            ),
          },
          {
            key: "headers",
            label: "Headers",
            children: (
              <KeyValueListEditor
                value={config.headers}
                onChange={(headers) => updateConfig({ headers })}
                placeholder="Header值"
                readonly={readonly}
              />
            ),
          },
          {
            key: "body",
            label: "Body",
            children: (
              <BodyEditor
                bodyType={config.bodyType || "none"}
                body={config.body}
                rawContentType={config.rawContentType}
                onChange={(bodyType, body, rawContentType) =>
                  updateConfig({ bodyType, body, rawContentType })
                }
                readonly={readonly}
              />
            ),
          },
          {
            key: "auth",
            label: "Auth",
            children: (
              <AuthEditor
                authType={config.authType || "none"}
                authConfig={config.authConfig}
                onChange={(authType, authConfig) =>
                  updateConfig({ authType, authConfig })
                }
                readonly={readonly}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

// ==================== 子组件 ====================

interface KeyValueListEditorProps {
  value?: KeyValue[];
  onChange?: (value: KeyValue[]) => void;
  placeholder?: string;
  readonly?: boolean;
}

function KeyValueListEditor({
  value = [],
  onChange,
  placeholder = "值",
  readonly = false,
}: KeyValueListEditorProps) {
  const addItem = () => {
    if (!readonly && onChange) {
      onChange([...value, { key: "", value: "", enabled: true }]);
    }
  };

  const updateItem = (index: number, field: keyof KeyValue, val: string | boolean) => {
    if (!readonly && onChange) {
      const newItems = [...value];
      newItems[index] = { ...newItems[index], [field]: val };
      onChange(newItems);
    }
  };

  const removeItem = (index: number) => {
    if (!readonly && onChange) {
      onChange(value.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div
          key={index}
          className={`flex gap-2 items-start ${item.enabled === false ? "opacity-50" : ""}`}
        >
          <Switch
            size="small"
            checked={item.enabled !== false}
            onChange={(checked) => updateItem(index, "enabled", checked)}
            disabled={readonly}
            className="mt-2"
          />
          <Input
            value={item.key}
            onChange={(e) => updateItem(index, "key", e.target.value)}
            placeholder="Key"
            disabled={readonly || item.enabled === false}
            className="flex-1"
          />
          <Input
            value={item.value}
            onChange={(e) => updateItem(index, "value", e.target.value)}
            placeholder={placeholder}
            disabled={readonly || item.enabled === false}
            className="flex-1"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeItem(index)}
            disabled={readonly}
            className="mt-0.5"
          />
        </div>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={addItem}
        disabled={readonly}
        block
      >
        添加项
      </Button>
    </div>
  );
}

interface BodyEditorProps {
  bodyType: BodyType;
  body?: Record<string, unknown> | KeyValue[] | string;
  rawContentType?: RawContentType;
  onChange?: (bodyType: BodyType, body?: Record<string, unknown> | KeyValue[] | string, rawContentType?: RawContentType) => void;
  readonly?: boolean;
}

function BodyEditor({
  bodyType,
  body,
  rawContentType,
  onChange,
  readonly = false,
}: BodyEditorProps) {
  const [selectedBodyType, setSelectedBodyType] = useState<BodyType>(bodyType);

  // 同步父组件传递的 bodyType 变化（如加载已有配置）
  useEffect(() => {
    setSelectedBodyType(bodyType);
  }, [bodyType]);

  const handleBodyTypeChange = (newType: BodyType) => {
    setSelectedBodyType(newType);
    if (onChange) {
      // 切换到 none 时清空 body，保持数据清洁
      const newBody = newType === "none" ? undefined : body;
      // 保留现有的 rawContentType，仅在切换到 raw 且无值时默认 application/json
      const newRawContentType = newType === "raw"
        ? (rawContentType || "application/json")
        : rawContentType;
      onChange(newType, newBody, newRawContentType);
    }
  };

  return (
    <div className="space-y-3">
      <Select
        value={selectedBodyType}
        onChange={handleBodyTypeChange}
        disabled={readonly}
        className="w-full"
        options={[
          { label: "None", value: "none" },
          { label: "Form-data", value: "form_data" },
          { label: "X-www-form-urlencoded", value: "x_www_form_urlencoded" },
          { label: "Raw", value: "raw" },
          { label: "Binary", value: "binary" },
        ]}
      />

      {selectedBodyType === "form_data" && (
        <KeyValueListEditor
          value={Array.isArray(body) ? body : []}
          onChange={(items) => onChange?.(selectedBodyType, items)}
          placeholder="值"
          readonly={readonly}
        />
      )}

      {selectedBodyType === "x_www_form_urlencoded" && (
        <KeyValueListEditor
          value={Array.isArray(body) ? body : []}
          onChange={(items) => onChange?.(selectedBodyType, items)}
          placeholder="值"
          readonly={readonly}
        />
      )}

      {selectedBodyType === "raw" && (
        <>
          <Select
            value={rawContentType || "application/json"}
            onChange={(ct) => onChange?.(selectedBodyType, body, ct)}
            disabled={readonly}
            options={[
              { label: "Text", value: "text/plain" },
              { label: "JSON", value: "application/json" },
              { label: "XML", value: "application/xml" },
              { label: "HTML", value: "text/html" },
              { label: "JavaScript", value: "text/javascript" },
            ]}
          />
          <TextArea
            value={typeof body === "string" ? body : JSON.stringify(body ?? "", null, 2)}
            onChange={(e) => onChange?.(selectedBodyType, e.target.value, rawContentType)}
            placeholder="请求体内容"
            disabled={readonly}
            rows={8}
          />
        </>
      )}

      {selectedBodyType === "binary" && (
        <div className="p-4 border border-dashed rounded text-center">
          <Text type="secondary">选择文件上传</Text>
        </div>
      )}
    </div>
  );
}

interface AuthEditorProps {
  authType: AuthType;
  authConfig?: {
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    addTo?: "header" | "query";
    headerName?: string;
  };
  onChange?: (authType: AuthType, authConfig?: Record<string, unknown>) => void;
  readonly?: boolean;
}

function AuthEditor({
  authType,
  authConfig,
  onChange,
  readonly = false,
}: AuthEditorProps) {
  const handleTypeChange = (newType: AuthType) => {
    if (onChange) {
      // 切换认证类型时清除旧配置，避免发送混合数据
      const newAuthConfig =
        newType === "none"
          ? undefined
          : newType === "bearer"
            ? { token: "" }
            : newType === "api_key"
              ? { headerName: "", apiKey: "", addTo: "header" as const }
              : newType === "basic"
                ? { username: "", password: "" }
                : undefined;
      onChange(newType, newAuthConfig);
    }
  };

  return (
    <div className="space-y-4">
      <Select
        value={authType || "none"}
        onChange={handleTypeChange}
        disabled={readonly}
        className="w-full"
        options={[
          { label: "No Auth", value: "none" },
          { label: "Bearer Token", value: "bearer" },
          { label: "API Key", value: "api_key" },
          { label: "Basic Auth", value: "basic" },
        ]}
      />

      {authType === "bearer" && (
        <div className="space-y-2">
          <Text strong>Token</Text>
          <Input.Password
            value={authConfig?.token}
            onChange={(e) => onChange?.(authType, { token: e.target.value })}
            placeholder="您的Bearer Token"
            disabled={readonly}
          />
        </div>
      )}

      {authType === "api_key" && (
        <div className="space-y-2">
          <div>
            <Text strong>Key</Text>
            <Input
              value={authConfig?.headerName}
              onChange={(e) =>
                onChange?.(authType, { ...authConfig, headerName: e.target.value })
              }
              placeholder="X-API-Key"
              disabled={readonly}
            />
          </div>
          <div>
            <Text strong>Value</Text>
            <Input
              value={authConfig?.apiKey}
              onChange={(e) =>
                onChange?.(authType, { ...authConfig, apiKey: e.target.value })
              }
              placeholder="您的API Key"
              disabled={readonly}
            />
          </div>
          <div>
            <Text strong>添加到</Text>
            <Select
              value={authConfig?.addTo || "header"}
              onChange={(val) => onChange?.(authType, { ...authConfig, addTo: val })}
              disabled={readonly}
              className="w-full"
              options={[
                { label: "Header", value: "header" },
                { label: "Query Params", value: "query" },
              ]}
            />
          </div>
        </div>
      )}

      {authType === "basic" && (
        <div className="space-y-2">
          <div>
            <Text strong>用户名</Text>
            <Input
              value={authConfig?.username}
              onChange={(e) =>
                onChange?.(authType, { ...authConfig, username: e.target.value })
              }
              placeholder="用户名"
              disabled={readonly}
            />
          </div>
          <div>
            <Text strong>密码</Text>
            <Input.Password
              value={authConfig?.password}
              onChange={(e) =>
                onChange?.(authType, { ...authConfig, password: e.target.value })
              }
              placeholder="密码"
              disabled={readonly}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 工具函数 ====================

function getDefaultConfig(): HttpRequestConfig {
  return {
    url: "",
    method: "GET",
    headers: [],
    params: [],
    bodyType: "none",
    rawContentType: "application/json",
    authType: "none",
    timeout: 30000,
  };
}
