/**
 * API端点卡片组件
 * 展示单个API端点的详细信息
 */

import { Card, Typography, Collapse, Table, Tag, Space, Button, Divider } from "antd";
import {
  ApiOutlined,
  FileTextOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import type { EndpointDocumentation } from "@/types/documentation";
import type { ColumnsType } from "antd/es/table";

const { Title, Text, Paragraph } = Typography;

interface ApiEndpointCardProps {
  endpoint: EndpointDocumentation;
  // onEdit functionality can be added later
}

interface Parameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  description?: string;
  required: boolean;
  schema?: {
    type?: string;
    enum?: string[];
    default?: any;
    example?: any;
  };
}

interface Header {
  name: string;
  description?: string;
  required: boolean;
  example?: string;
}

export function ApiEndpointCard({ endpoint }: ApiEndpointCardProps) {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const methodColors: Record<string, string> = {
    GET: "blue",
    POST: "green",
    PUT: "orange",
    DELETE: "red",
    PATCH: "purple",
  };

  // 参数表格列定义
  const paramColumns: ColumnsType<Parameter> = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 150,
    },
    {
      title: "位置",
      dataIndex: "in",
      key: "in",
      width: 80,
      render: (inLocation) => <Tag>{inLocation}</Tag>,
    },
    {
      title: "类型",
      dataIndex: "schema",
      key: "schema",
      width: 100,
      render: (schema) => schema?.type || "-",
    },
    {
      title: "必填",
      dataIndex: "required",
      key: "required",
      width: 60,
      render: (required) => (required ? "是" : "否"),
    },
    {
      title: "说明",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "示例",
      dataIndex: "schema",
      key: "example",
      width: 120,
      render: (schema) => (
        <Text code className="text-xs">
          {schema?.example !== undefined ? JSON.stringify(schema.example) : "-"}
        </Text>
      ),
    },
  ];

  const headerColumns: ColumnsType<Header> = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      width: 150,
    },
    {
      title: "说明",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "示例",
      dataIndex: "example",
      key: "example",
      render: (example) => (
        <Text code className="text-xs">{example || "-"}</Text>
      ),
    },
  ];

  return (
    <Card>
      {/* 基本信息 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <Space>
            <Tag color={methodColors[endpoint.method] || "default"} className="text-lg px-2 py-1">
              {endpoint.method}
            </Tag>
            <Title level={4} style={{ margin: 0 }}>
              {endpoint.name}
            </Title>
          </Space>
          <div className="mt-1">
            <code className="text-lg bg-gray-100 px-2 py-1 rounded">{endpoint.path}</code>
          </div>
        </div>
        <Space>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(endpoint.path)}
          >
            复制路径
          </Button>
        </Space>
      </div>

      {endpoint.description && (
        <Paragraph type="secondary" className="mb-4">
          {endpoint.description}
        </Paragraph>
      )}

      <Divider />

      <Collapse
        defaultActiveKey={["params", "headers", "responses"]}
        items={[
          {
            key: "params",
            label: (
              <Space>
                <FileTextOutlined /> 参数
                {endpoint.parameters && endpoint.parameters.length > 0 && (
                  <Tag>{endpoint.parameters.length}</Tag>
                )}
              </Space>
            ),
            children: (
              <div className="pt-2">
                {endpoint.parameters && endpoint.parameters.length > 0 ? (
                  <Table
                    columns={paramColumns}
                    dataSource={endpoint.parameters}
                    rowKey="name"
                    pagination={false}
                    size="small"
                  />
                ) : (
                  <Text type="secondary">此接口无需参数</Text>
                )}
              </div>
            ),
          },
          {
            key: "headers",
            label: <Space><ApiOutlined /> 请求头</Space>,
            children: (
              <div className="pt-2">
                {endpoint.headers && endpoint.headers.length > 0 ? (
                  <Table
                    columns={headerColumns}
                    dataSource={endpoint.headers}
                    rowKey="name"
                    pagination={false}
                    size="small"
                  />
                ) : (
                  <Text type="secondary">此接口无需特殊请求头</Text>
                )}
              </div>
            ),
          },
          {
            key: "requestBody",
            label: "请求体",
            children: (
              <div className="pt-2">
                {endpoint.request_body ? (
                  <div className="space-y-3">
                    <div>
                      <Text strong>Content-Type</Text>
                      <div className="mt-1">
                        <Tag color="blue">{endpoint.request_body.content_type}</Tag>
                      </div>
                    </div>
                    <div>
                      <Text strong>Schema</Text>
                      <div className="mt-1 bg-gray-50 p-3 rounded">
                        <pre className="text-sm overflow-x-auto">
                          {JSON.stringify(endpoint.request_body.schema, null, 2)}
                        </pre>
                      </div>
                    </div>
                    {endpoint.request_body.example && (
                      <div>
                        <Text strong>示例</Text>
                        <div className="mt-1 bg-gray-50 p-3 rounded">
                          <pre className="text-sm overflow-x-auto">
                            {JSON.stringify(endpoint.request_body.example, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Text type="secondary">此接口不支持请求体</Text>
                )}
              </div>
            ),
          },
          {
            key: "responses",
            label: "响应",
            children: (
              <div className="pt-2">
                {endpoint.responses && endpoint.responses.length > 0 ? (
                  <div className="space-y-4">
                    {endpoint.responses.map((response, index) => (
                      <div key={index} className="border border-gray-200 rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag color={response.status_code >= 200 && response.status_code < 300 ? "green" : "red"}>
                            {response.status_code}
                          </Tag>
                          <Text strong>{response.description}</Text>
                        </div>
                        {response.headers && response.headers.length > 0 && (
                          <div className="mb-2">
                            <Text className="text-xs">响应头</Text>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {response.headers.map((header) => (
                                <Tag key={header.name}>
                                  {header.name}: {header.value}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        )}
                        {response.example && (
                          <div>
                            <Text className="text-xs">响应示例</Text>
                            <div className="mt-1 bg-gray-50 p-3 rounded">
                              <pre className="text-sm overflow-x-auto">
                                {JSON.stringify(response.example, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">暂无响应定义</Text>
                )}
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}
