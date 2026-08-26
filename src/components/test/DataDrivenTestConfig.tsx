import { useTranslation } from "react-i18next";
/**
 * Data-driven test configuration component
 * Supports CSV, JSON and Excel data source configuration
 */

import { useState, useEffect } from "react";
import {
  Card,
  Select,
  Input,
  Button,
  Space,
  Table,
  Typography,
  Upload,
  Tag,
  Divider,
  Switch,
  message,
} from "antd";
import {
  UploadOutlined,
  FileTextOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { DataSourceType, DataRow, DataDrivenTestConfig } from "@/types/testset";

const { Text } = Typography;
const { TextArea } = Input;

interface DataDrivenTestConfigProps {
  value?: DataDrivenTestConfig;
  onChange?: (config: DataDrivenTestConfig) => void;
  testCaseId: string;
}

interface ParsedData {
  headers: string[];
  rows: Array<Record<string, string>>;
}

export function DataDrivenTestConfig({
  value,
  onChange,
  testCaseId,
}: DataDrivenTestConfigProps) {  const { t } = useTranslation();

  const [dataSourceType, setDataSourceType] = useState<DataSourceType>(
    value?.dataSourceType || "json",
  );
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>(
    value?.variableMapping || {},
  );
  const [parsedData, setParsedData] = useState<ParsedData>({ headers: [], rows: [] });
  const [previewData, setPreviewData] = useState<DataRow[]>([]);
  const [rawData, setRawData] = useState<string>(value?.dataSourceData || "");
  const [enabled, setEnabled] = useState<boolean>(value?.enabled ?? false);

  useEffect(() => {
    if (value) {
      const newMapping = value.variableMapping || {};
      setDataSourceType(value.dataSourceType);
      setVariableMapping(newMapping);
      setRawData(value.dataSourceData);
      setEnabled(value.enabled ?? false);
      parseData(value.dataSourceData, value.dataSourceType, newMapping);
    }
  }, [value]);

  const parseData = (data: string, type: DataSourceType, mapping: Record<string, string> = variableMapping) => {
    try {
      if (!data.trim()) {
        setParsedData({ headers: [], rows: [] });
        setPreviewData([]);
        return;
      }

      let headers: string[] = [];
      let rows: Array<Record<string, string>> = [];

      if (type === "json") {
        const jsonData = JSON.parse(data);
        if (Array.isArray(jsonData)) {
          headers = Object.keys(jsonData[0] || {});
          rows = jsonData.map((row) => {
            const result: Record<string, string> = {};
            headers.forEach((h) => {
              result[h] = String(row[h] ?? "");
            });
            return result;
          });
        }
      } else if (type === "csv") {
        const lines = data.trim().split("\n");
        if (lines.length > 0) {
          headers = lines[0].split(",").map((h) => h.trim());
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map((v) => v.trim());
            const row: Record<string, string> = {};
            headers.forEach((h, index) => {
              row[h] = values[index] || "";
            });
            rows.push(row);
          }
        }
      }

      setParsedData({ headers, rows });
      updatePreview(headers, rows, mapping);
    } catch (error: any) {
      console.error("Failed to parse data:", error);
    }
  };

  const updatePreview = (
    headers: string[],
    rows: Array<Record<string, string>>,
    mapping: Record<string, string> = variableMapping,
  ) => {
    const preview: DataRow[] = rows.map((row, index) => ({
      index: index + 1,
      data: row,
      variables: applyMapping(row, headers, mapping),
    }));
    setPreviewData(preview);
  };

  const applyMapping = (
    row: Record<string, string>,
    headers: string[],
    mapping: Record<string, string> = variableMapping,
  ): Record<string, string> => {
    const result: Record<string, string> = {};
    headers.forEach((header) => {
      const mappedName = mapping[header] || header;
      result[mappedName] = row[header];
    });
    return result;
  };

  const handleDataChange = (newData: string) => {
    setRawData(newData);
    parseData(newData, dataSourceType);
    updateConfig({
      dataSourceData: newData,
    });
  };

  const handleTypeChange = (newType: DataSourceType) => {
    setDataSourceType(newType);
    parseData(rawData, newType);
    updateConfig({
      dataSourceType: newType,
    });
  };

  const handleMappingChange = (header: string, mappedTo: string) => {
    const newMapping = { ...variableMapping, [header]: mappedTo };
    setVariableMapping(newMapping);
    updatePreview(parsedData.headers, parsedData.rows, newMapping);
    updateConfig({
      variableMapping: newMapping,
    });
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleDataChange(content);
    };
    reader.onerror = () => {
      console.error("Failed to read file:", file.name);
      message.error(t("文件读取失败: {{p0}}", { p0: file.name }));
    };
    reader.readAsText(file);
    return false; // prevent auto upload
  };

  const updateConfig = (updates: Partial<DataDrivenTestConfig>) => {
    const newConfig: DataDrivenTestConfig = {
      id: value?.id || `ddt-${testCaseId}`,
      testCaseId,
      name: value?.name || "Data Driven Test",
      dataSourceType,
      dataSourceData: rawData,
      variableMapping,
      enabled,
      ...updates,
    };
    onChange?.(newConfig);
  };

  const columns: ColumnsType<DataRow> = [
    {
      title: t("序号"),
      dataIndex: "index",
      key: "index",
      width: 60,
    },
    ...parsedData.headers.map((header) => ({
      title: (
        <div className="space-y-1">
          <div className="text-xs text-gray-500">列名: {header}</div>
          <Input
            size="small"
            placeholder={t("变量名")}
            value={variableMapping[header]}
            onChange={(e) => handleMappingChange(header, e.target.value)}
            prefix="→"
          />
        </div>
      ),
      dataIndex: ["data", header],
      key: header,
      render: (value: string) => <Text code>{value}</Text>,
    })),
    {
      title: t("预览变量"),
      key: "preview",
      render: (_, record) => (
        <Space size={4} wrap>
          {Object.entries(record.variables).map(([key, val]) => (
            <Tag key={key}>{key}={val}</Tag>
          ))}
        </Space>
      ),
    },
  ];

  const exampleData: Record<DataSourceType, string> = {
    csv: `name,email,age
Alice,alice@example.com,25
Bob,bob@example.com,30`,
    json: JSON.stringify(
      [
        { name: "Alice", email: "alice@example.com", age: 25 },
        { name: "Bob", email: "bob@example.com", age: 30 },
      ],
      null,
      2,
    ),
    excel: "暂不支持Excel文件，请使用CSV或JSON格式",
  };

  return (
    <div className="space-y-4">
      <Card size="small" title={t("数据驱动测试配置")}>
        <Space direction="vertical" className="w-full">
          <div className="flex items-center justify-between">
            <Text strong>{t("启用数据驱动")}</Text>
            <Switch
              checked={enabled}
              onChange={(checked) => {
                setEnabled(checked);
                updateConfig({ enabled: checked });
              }}
            />
          </div>

          {enabled && (
            <>
              <Divider />

              <div>
                <Text strong>{t("数据源类型")}</Text>
                <Select
                  value={dataSourceType}
                  onChange={handleTypeChange}
                  className="w-full mt-2"
                  options={[
                    { label: "JSON", value: "json" },
                    { label: "CSV", value: "csv" },
                    { label: "Excel", value: "excel", disabled: true },
                  ]}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Text strong>{t("数据源")}</Text>
                  <Space>
                    <Button
                      size="small"
                      icon={<UploadOutlined />}
                    >
                      <Upload
                        accept={dataSourceType === "json" ? ".json" : ".csv"}
                        showUploadList={false}
                        beforeUpload={handleFileUpload}
                      >
                        上传文件
                      </Upload>
                    </Button>
                    <Button
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={() => {
                        setRawData(exampleData[dataSourceType]);
                        handleDataChange(exampleData[dataSourceType]);
                      }}
                    >
                      使用示例
                    </Button>
                  </Space>
                </div>
                <TextArea
                  value={rawData}
                  onChange={(e) => handleDataChange(e.target.value)}
                  placeholder={`输入${dataSourceType.toUpperCase()}数据`}
                  rows={6}
                  style={{
                    fontFamily: "Monaco, Menlo, monospace",
                    fontSize: 12,
                  }}
                />
              </div>

              {parsedData.rows.length > 0 && (
                <>
                  <Divider />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Text strong>
                        数据预览 ({parsedData.rows.length} 行)
                      </Text>
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => {
                          const csv = [
                            parsedData.headers.join(","),
                            ...parsedData.rows.map((row) =>
                              parsedData.headers.map((h) => row[h]).join(","),
                            ),
                          ].join("\n");
                          const blob = new Blob([csv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `test-data-${testCaseId}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        导出CSV
                      </Button>
                    </div>
                    <Table
                      columns={columns}
                      dataSource={previewData}
                      rowKey="index"
                      pagination={false}
                      size="small"
                      scroll={{ x: true }}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </Space>
      </Card>
    </div>
  );
}
