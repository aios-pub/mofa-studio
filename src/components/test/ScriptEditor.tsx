import { useTranslation } from "react-i18next";
/**
 * Script editor component
 * Supports JavaScript syntax highlighting and code completion
 * Postman-like script editing
 */

import { useState, useRef, useEffect } from "react";
import { Card, Input, Button, Space, Typography, Alert, Tabs } from "antd";
import {
  PlayCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import type { ScriptType } from "@/types/testset";

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface ScriptEditorProps {
  type: ScriptType;
  value?: string;
  onChange?: (script: string) => void;
  onTest?: (script: string) => Promise<void>;
  readOnly?: boolean;
}

// Sample script code
const SCRIPT_EXAMPLES: Record<ScriptType, { label: string; code: string }[]> = {
  pre_request: [
    {
      label: "设置环境变量",
      code: `// Set environment variable
pm.environment.set("baseUrl", "https://api.example.com");
pm.environment.set("timestamp", Date.now().toString());

// Extract data from the response
const token = pm.environment.get("auth_token");
if (token) {
  pm.request.headers["Authorization"] = \`Bearer \${token}\`;
}`,
    },
    {
      label: "生成随机数据",
      code: `// Generate a random user ID
const userId = Math.floor(Math.random() * 10000);
pm.environment.set("user_id", userId);

// Generate random email
const email = \`user\${userId}@example.com\`;
pm.environment.set("user_email", email);`,
    },
    {
      label: "数据处理",
      code: `// Base64 encoding
const encoded = pm.utils.base64Encode("hello world");
pm.environment.set("encoded_data", encoded);

// JSON parsing
const data = pm.utils.jsonParse('{"name": "test"}');
pm.environment.set("data_name", data.name);`,
    },
  ],
  test: [
    {
      label: "状态码检查",
      code: `// Check the response status code
pm.test("Status code is 200", function() {
  pm.response.statusCode === 200;
});

// Check response time
pm.test("Response time is less than 500ms", function() {
  pm.response.responseTime < 500;
});`,
    },
    {
      label: "响应内容验证",
      code: `// Check that the response contains specific content
pm.test("Response contains expected data", function() {
  const body = pm.response.body;
  body.includes("success");
});

// Parse JSON response
pm.test("Response has correct structure", function() {
  const data = pm.utils.jsonParse(pm.response.body);
  data && data.status === "ok";
});`,
    },
    {
      label: "Header验证",
      code: `// Check response headers
pm.test("Content-Type is present", function() {
  pm.response.headers["Content-Type"]?.includes("application/json");
});

// Check custom headers
pm.test("Custom header exists", function() {
  pm.response.headers["X-Custom-Header"];
});`,
    },
  ],
};

export function ScriptEditor({
  type,
  value,
  onChange,
  onTest,
  readOnly = false,
}: ScriptEditorProps) {  const { t } = useTranslation();

  const [script, setScript] = useState(value || "");
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [activeExampleTab, setActiveExampleTab] = useState("0");
  const textareaRef = useRef<any>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setScript(value || "");
  }, [value]);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (newValue: string) => {
    setScript(newValue);
    setError(null);
    onChange?.(newValue);
  };

  const handleTest = async () => {
    if (!onTest) return;

    setTesting(true);
    setError(null);

    try {
      await onTest(script);
    } catch (err: any) {
      setError(err.message || "测试执行失败");
    } finally {
      setTesting(false);
    }
  };

  const handleInsertExample = (exampleCode: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = script;

    // Add newlines only when needed to avoid extra blank lines
    const prefix = start > 0 && currentValue[start - 1] !== "\n" ? "\n" : "";
    const suffix = end < currentValue.length && currentValue[end] !== "\n" ? "\n" : "";

    const newValue =
      currentValue.substring(0, start) +
      prefix +
      exampleCode +
      suffix +
      currentValue.substring(end);

    handleChange(newValue);

    // Refocus and set the cursor position
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPosition = start + prefix.length + exampleCode.length + suffix.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  const title = type === "pre_request" ? "前置脚本 (Pre-request Script)" : "测试脚本 (Test Script)";
  const description =
    type === "pre_request"
      ? "在发送请求之前执行，可用于设置环境变量、生成请求数据等"
      : "在收到响应后执行，可用于验证响应结果、提取数据等";

  return (
    <div className="space-y-3">
      <Card size="small" title={<Space><CodeOutlined /> {title}</Space>}>
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {description}
        </Paragraph>

        {!readOnly && (
          <Alert
            message={t("脚本上下文")}
            description={
              <div className="text-xs space-y-1">
                <div><strong>pm.environment</strong>{t(": 环境变量操作 (get/set/unset/clear)")}</div>
                <div><strong>pm.globals</strong>{t(": 全局变量操作 (get/set/unset/clear)")}</div>
                <div><strong>pm.request</strong>{t(": 请求数据 (url/method/headers/body)")}</div>
                {type === "test" && (
                  <>
                    <div><strong>pm.response</strong>{t(": 响应数据 (statusCode/headers/body/responseTime)")}</div>
                    <div><strong>pm.test()</strong>{t(": 添加测试断言")}</div>
                  </>
                )}
                <div><strong>pm.utils</strong>{t(": 工具函数 (replaceVariables/base64Encode/jsonParse)")}</div>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
        )}

        <TextArea
          ref={textareaRef}
          value={script}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`// 输入${type === "pre_request" ? "前置" : "测试"}脚本代码`}
          rows={10}
          readOnly={readOnly}
          style={{
            fontFamily: "Monaco, Menlo, 'Ubuntu Mono', 'Consolas', monospace",
            fontSize: 13,
            lineHeight: 1.5,
          }}
          spellCheck={false}
        />

        {error && (
          <Alert
            message={t("脚本错误")}
            description={error}
            type="error"
            closable
            onClose={() => setError(null)}
            style={{ marginTop: 8 }}
          />
        )}

        {!readOnly && (
          <div className="flex items-center justify-between mt-3">
            <Space>
              {onTest && (
                <Button
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={handleTest}
                  loading={testing}
                >
                  测试脚本
                </Button>
              )}
              {script && (
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleChange("")}
                >
                  清除
                </Button>
              )}
            </Space>
            <Text type="secondary" className="text-xs">
              {script.length} 字符
            </Text>
          </div>
        )}
      </Card>

      {!readOnly && (
        <Card size="small" title={<Space><InfoCircleOutlined />{t("代码示例")}</Space>}>
          <Tabs
            activeKey={activeExampleTab}
            onChange={setActiveExampleTab}
            items={SCRIPT_EXAMPLES[type].map((example, index) => ({
              key: index.toString(),
              label: example.label,
              children: (
                <div className="space-y-2">
                  <pre
                    style={{
                      backgroundColor: "#f5f5f5",
                      padding: 12,
                      borderRadius: 4,
                      fontSize: 12,
                      maxHeight: 200,
                      overflow: "auto",
                    }}
                  >
                    {example.code}
                  </pre>
                  <Button
                    size="small"
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => handleInsertExample(example.code)}
                    block
                  >
                    插入示例
                  </Button>
                </div>
              ),
            }))}
          />
        </Card>
      )}
    </div>
  );
}
