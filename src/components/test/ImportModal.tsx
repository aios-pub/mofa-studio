/**
 * 导入弹窗组件
 * 支持导入Postman Collection和OpenAPI格式的测试集
 */

import { useState } from "react";
import {
  Modal,
  Upload,
  Button,
  Select,
  Alert,
  Typography,
  Tabs,
  Table,
  Tag,
  Space,
  Progress,
  Card,
  Divider,
  Input,
} from "antd";
import {
  InboxOutlined,
  FileTextOutlined,
  ApiOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { UploadProps } from "antd/es/upload";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface ExistingTestSet {
  id: string;
  name: string;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (format: "postman" | "openapi" | "curl", content: unknown, options: ImportOptions, targetTestSetId?: string) => Promise<void>;
  existingTestSets?: ExistingTestSet[];
}

interface ImportOptions {
  conflictResolution: "skip" | "overwrite" | "rename";
  includeAssertions: boolean;
  includeScripts: boolean;
}

interface ParsedCollection {
  name: string;
  description?: string;
  testSets: ParsedTestSet[];
  totalRequests: number;
}

interface ParsedTestSet {
  name: string;
  description?: string;
  requestCount: number;
  requests: ParsedRequest[];
}

interface ParsedRequest {
  name: string;
  method: string;
  url: string;
  description?: string;
}

export function ImportModal({ open, onClose, onImport, existingTestSets = [] }: ImportModalProps) {
  const [format, setFormat] = useState<"postman" | "openapi" | "curl">("postman");
  const [fileList, setFileList] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCollection | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [curlCommand, setCurlCommand] = useState("");
  const [targetTestSetId, setTargetTestSetId] = useState<string>("");

  const [options, setOptions] = useState<ImportOptions>({
    conflictResolution: "skip",
    includeAssertions: true,
    includeScripts: false,
  });

  const handleUpload: UploadProps["customRequest"] = ({ file, onSuccess, onError }) => {
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content === "string") {
          const json = JSON.parse(content);
          const parsed = parseCollection(format as "postman" | "openapi", json);
          setParsedData(parsed);
          onSuccess?.(file);
        }
      } catch (error: any) {
        onError?.(error);
        Modal.error({
          title: "解析失败",
          content: error.message || "无法解析文件内容",
        });
      } finally {
        setParsing(false);
      }
    };

    reader.onerror = () => {
      setParsing(false);
      onError?.(new Error("文件读取失败"));
      Modal.error({
        title: "读取失败",
        content: `无法读取文件: ${(file as File).name}`,
      });
    };

    reader.readAsText(file as File);
  };

  const parseCollection = (type: "postman" | "openapi", content: any): ParsedCollection => {
    if (type === "postman") {
      // Postman Collection v2.1格式
      const info = content.info || {};
      const items = content.item || [];

      const testSets: ParsedTestSet[] = [];
      let totalRequests = 0;

      const parseFolder = (folder: any): ParsedTestSet => {
        const requests: ParsedRequest[] = [];

        const parseItem = (item: any) => {
          if (item.request) {
            requests.push({
              name: item.name,
              method: item.request.method || "GET",
              url: item.request.url?.raw || item.request.url || "",
              description: item.description,
            });
          }
          if (item.item && Array.isArray(item.item)) {
            item.item.forEach(parseItem);
          }
        };

        folder.item?.forEach(parseItem);
        return {
          name: folder.name || "默认分组",
          requestCount: requests.length,
          requests,
        };
      };

      items.forEach((item: any) => {
        if (item.item && !item.request) {
          // 这是一个文件夹
          const testSet = parseFolder(item);
          testSets.push(testSet);
          totalRequests += testSet.requestCount;
        } else if (item.request) {
          // 这是一个独立请求
          testSets.push({
            name: "默认分组",
            requestCount: 1,
            requests: [{
              name: item.name,
              method: item.request.method || "GET",
              url: item.request.url?.raw || item.request.url || "",
              description: item.description,
            }],
          });
          totalRequests += 1;
        }
      });

      return {
        name: info.name || "导入的集合",
        description: info.description,
        testSets,
        totalRequests,
      };
    } else {
      // OpenAPI 3.0格式
      const info = content.info || {};
      const paths = content.paths || {};

      const testSets: ParsedTestSet[] = [];
      const requests: ParsedRequest[] = [];

      Object.entries(paths).forEach(([path, methods]: [string, any]) => {
        Object.keys(methods).forEach((method) => {
          if (method !== "parameters") {
            const methodInfo = methods[method];
            requests.push({
              name: methodInfo.summary || methodInfo.operationId || `${method.toUpperCase()} ${path}`,
              method: method.toUpperCase(),
              url: path,
              description: methodInfo.description,
            });
          }
        });
      });

      if (requests.length > 0) {
        testSets.push({
          name: "全部接口",
          description: info.description,
          requestCount: requests.length,
          requests,
        });
      }

      return {
        name: info.title || "导入的API",
        description: info.description,
        testSets,
        totalRequests: requests.length,
      };
    }
  };

  const parseCurlCommand = (cmd: string): ParsedRequest | null => {
    const trimmed = cmd.trim();
    if (!trimmed.toLowerCase().startsWith("curl")) {
      return null;
    }

    // 简单提取方法和 URL
    let method = "GET";
    let url = "";

    const args = trimmed.substring(4).trim();

    // 匹配 -X METHOD 或 --request METHOD
    const methodMatch = args.match(/(?:-X\s+|--request\s+)(\w+)/i);
    if (methodMatch) {
      method = methodMatch[1].toUpperCase();
    }

    // 匹配 URL (以 http 开头的不在引号内的内容)
    const urlMatch = args.match(/(https?:\/\/[^\s'"]+)/i);
    if (urlMatch) {
      url = urlMatch[1];
    } else {
      // 尝试匹配引号内的 URL
      const quotedUrlMatch = args.match(/['"](https?:\/\/[^'"]+)['"]/i);
      if (quotedUrlMatch) {
        url = quotedUrlMatch[1];
      }
    }

    if (!url) return null;

    return {
      name: `${method} ${url}`,
      method,
      url,
    };
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setImporting(true);
    setImportProgress(0);

    try {
      if (format === "curl") {
        await onImport(format, curlCommand, options, targetTestSetId || undefined);
      } else {
        await onImport(format, parsedData, options);
      }
      setImportProgress(100);

      Modal.success({
        title: "导入成功",
        content: `成功导入 ${parsedData.totalRequests} 个测试用例`,
      });

      handleClose();
    } catch (error: any) {
      Modal.error({
        title: "导入失败",
        content: error.message || "导入过程中发生错误",
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const handleClose = () => {
    setFileList([]);
    setParsedData(null);
    setFormat("postman");
    setCurlCommand("");
    setTargetTestSetId("");
    setOptions({
      conflictResolution: "skip",
      includeAssertions: true,
      includeScripts: false,
    });
    onClose();
  };

  const columns: ColumnsType<ParsedRequest> = [
    {
      title: "方法",
      dataIndex: "method",
      key: "method",
      width: 80,
      render: (method) => {
        const colors: Record<string, string> = {
          GET: "blue",
          POST: "green",
          PUT: "orange",
          DELETE: "red",
          PATCH: "purple",
        };
        return <Tag color={colors[method] || "default"}>{method}</Tag>;
      },
    },
    {
      title: "接口名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "路径",
      dataIndex: "url",
      key: "url",
      ellipsis: true,
      render: (url) => <code className="text-xs">{url}</code>,
    },
  ];

  const uploadProps: UploadProps = {
    fileList,
    onChange: ({ fileList }) => setFileList(fileList),
    onRemove: () => setFileList([]),
    beforeUpload: () => false,
    customRequest: handleUpload,
    accept: ".json,.yaml,.yml",
  };

  return (
    <Modal
      title="导入测试集"
      open={open}
      onCancel={handleClose}
      width={800}
      footer={
        <Space>
          <Button onClick={handleClose}>取消</Button>
          <Button
            type="primary"
            onClick={handleImport}
            loading={importing}
            disabled={!parsedData}
          >
            导入
          </Button>
        </Space>
      }
    >
      <div className="space-y-4">
        {/* 格式选择 */}
        <div>
          <Text strong>导入格式</Text>
          <Select
            value={format}
            onChange={(value) => {
              setFormat(value);
              setParsedData(null);
              setFileList([]);
              setCurlCommand("");
              setTargetTestSetId("");
            }}
            options={[
              {
                label: (
                  <Space>
                    <FileTextOutlined /> Postman Collection
                  </Space>
                ),
                value: "postman",
              },
              {
                label: (
                  <Space>
                    <ApiOutlined /> OpenAPI / Swagger
                  </Space>
                ),
                value: "openapi",
              },
              {
                label: (
                  <Space>
                    <CodeOutlined /> cURL 命令
                  </Space>
                ),
                value: "curl",
              },
            ]}
            className="w-full mt-1"
            disabled={parsing || importing}
          />
        </div>

        {/* 输入区域：文件上传或 cURL 文本 */}
        {format === "curl" ? (
          <div className="space-y-4">
            <div>
              <Text strong>cURL 命令</Text>
              <div className="mt-1">
                <Input.TextArea
                  rows={6}
                  placeholder="在此粘贴 cURL 命令...&#10;例如: curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{&quot;name&quot;:&quot;test&quot;}'"
                  value={curlCommand}
                  onChange={(e) => {
                    setCurlCommand(e.target.value);
                    // 实时解析
                    const parsed = parseCurlCommand(e.target.value);
                    if (parsed) {
                      setParsedData({
                        name: "cURL 导入",
                        testSets: [{
                          name: "默认分组",
                          requestCount: 1,
                          requests: [parsed],
                        }],
                        totalRequests: 1,
                      });
                    } else {
                      setParsedData(null);
                    }
                  }}
                  disabled={importing}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {/* 测试集选择 */}
            {existingTestSets.length > 0 && (
              <div>
                <Text strong>导入到</Text>
                <div className="mt-1">
                  <Select
                    value={targetTestSetId}
                    onChange={setTargetTestSetId}
                    placeholder="选择现有测试集或创建新测试集"
                    options={[
                      { label: "创建新测试集", value: "" },
                      ...existingTestSets.map((ts) => ({
                        label: ts.name,
                        value: ts.id,
                      })),
                    ]}
                    className="w-full"
                    disabled={importing}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <Text strong>上传文件</Text>
            <div className="mt-1">
              <Dragger {...uploadProps} disabled={parsing || importing}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  点击或拖拽文件到此区域上传
                </p>
                <p className="ant-upload-hint">
                  支持 JSON、YAML 格式
                </p>
              </Dragger>
            </div>
          </div>
        )}

        {/* 解析结果 */}
        {parsedData && (
          <>
            <Alert
              message="解析成功"
              description={
                <Space>
                  <span>{parsedData.name}</span>
                  <Tag>{parsedData.totalRequests} 个请求</Tag>
                  <Tag>{parsedData.testSets.length} 个测试集</Tag>
                </Space>
              }
              type="success"
              showIcon
            />

            <Divider />

            <Tabs
              defaultActiveKey="overview"
              items={[
                {
                  key: "overview",
                  label: "概览",
                  children: (
                    <div>
                      <Title level={5}>{parsedData.name}</Title>
                      {parsedData.description && (
                        <Paragraph type="secondary">{parsedData.description}</Paragraph>
                      )}
                      <div className="mt-4">
                        <Text strong>测试集列表</Text>
                        <div className="mt-2 space-y-2">
                          {parsedData.testSets.map((testSet, index) => (
                            <Card key={index} size="small" className="bg-gray-50">
                              <div className="flex justify-between">
                                <Text strong>{testSet.name}</Text>
                                <Tag>{testSet.requestCount} 个请求</Tag>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "details",
                  label: "请求详情",
                  children: (
                    <div>
                      {parsedData.testSets.map((testSet, setIndex) => (
                        <div key={setIndex} className="mb-6">
                          <Title level={5}>{testSet.name}</Title>
                          <Table
                            columns={columns}
                            dataSource={testSet.requests}
                            rowKey={(_record, index) => `${setIndex}-${index}`}
                            pagination={false}
                            size="small"
                          />
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          </>
        )}

        {/* 导入选项 */}
        {parsedData && (
          <>
            <Divider />
            <div>
              <Text strong>导入选项</Text>
              <div className="mt-2 space-y-3">
                <div>
                  <Text>冲突处理</Text>
                  <Select
                    value={options.conflictResolution}
                    onChange={(value) =>
                      setOptions({ ...options, conflictResolution: value })
                    }
                    options={[
                      { label: "跳过已存在的", value: "skip" },
                      { label: "覆盖已存在的", value: "overwrite" },
                      { label: "重命名", value: "rename" },
                    ]}
                    className="w-full mt-1"
                    disabled={importing}
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={options.includeAssertions}
                      onChange={(e) =>
                        setOptions({ ...options, includeAssertions: e.target.checked })
                      }
                      disabled={importing}
                    />
                    <Text>包含断言</Text>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={options.includeScripts}
                      onChange={(e) =>
                        setOptions({ ...options, includeScripts: e.target.checked })
                      }
                      disabled={importing}
                    />
                    <Text>包含脚本</Text>
                  </label>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 导入进度 */}
        {importing && (
          <>
            <Divider />
            <Progress percent={importProgress} status="active" />
            <Text type="secondary" className="text-center">
              正在导入...
            </Text>
          </>
        )}
      </div>
    </Modal>
  );
}
