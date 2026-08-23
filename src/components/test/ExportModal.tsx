/**
 * Export modal component
 * Supports exporting to Postman Collection and OpenAPI formats
 */

import { useState } from "react";
import {
  Modal,
  Button,
  Space,
  Typography,
  Radio,
  Checkbox,
  Alert,
  Card,
  message,
} from "antd";
import {
  ApiOutlined,
  FileTextOutlined,
  ExportOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  testSets: Array<{ id: string; name: string }>;
  onExport: (format: "postman" | "openapi", options: ExportOptions) => Promise<void>;
}

interface ExportOptions {
  format: "postman" | "openapi";
  scope: "selected" | "all";
  selectedIds?: string[];
  includeAssertions: boolean;
  includePreScripts: boolean;
  includeTestScripts: boolean;
  includeEnvironment: boolean;
}

export function ExportModal({ open, onClose, testSets, onExport }: ExportModalProps) {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<"postman" | "openapi">("postman");
  const [scope, setScope] = useState<"selected" | "all">("selected");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [options, setOptions] = useState<ExportOptions>({
    format: "postman",
    scope: "selected",
    selectedIds: [],
    includeAssertions: true,
    includePreScripts: false,
    includeTestScripts: true,
    includeEnvironment: false,
  });

  const handleExport = async () => {
    setExporting(true);

    try {
      const exportOptions = {
        ...options,
        format,
        scope,
        selectedIds: scope === "selected" ? selectedIds : undefined,
      };

      await onExport(format, exportOptions);

      message.success("导出成功");
      handleClose();
    } catch (error: any) {
      message.error(error?.message || "导出失败");
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    setFormat("postman");
    setScope("selected");
    setSelectedIds([]);
    setOptions({
      format: "postman",
      scope: "selected",
      selectedIds: [],
      includeAssertions: true,
      includePreScripts: false,
      includeTestScripts: true,
      includeEnvironment: false,
    });
    onClose();
  };

  return (
    <Modal
      title="导出测试集"
      open={open}
      onCancel={handleClose}
      width={600}
      footer={
        <Space>
          <Button onClick={handleClose}>取消</Button>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={handleExport}
            loading={exporting}
            disabled={scope === "selected" && selectedIds.length === 0}
          >
            导出
          </Button>
        </Space>
      }
    >
      <div className="space-y-4">
        {/* Export format */}
        <div>
          <Text strong>导出格式</Text>
          <div className="mt-2">
            <Radio.Group
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full"
            >
              <Space direction="vertical" className="w-full">
                <Radio value="postman">
                  <Card size="small" className="w-full">
                    <div className="flex items-center gap-2">
                      <FileTextOutlined />
                      <Space>
                        <Text strong>Postman Collection</Text>
                        <Text type="secondary" className="text-xs">
                          v2.1
                        </Text>
                      </Space>
                    </div>
                    <Text type="secondary" className="text-xs mt-1">
                      导出为Postman Collection格式，包含完整的请求配置
                    </Text>
                  </Card>
                </Radio>
                <Radio value="openapi">
                  <Card size="small" className="w-full">
                    <div className="flex items-center gap-2">
                      <ApiOutlined />
                      <Space>
                        <Text strong>OpenAPI Specification</Text>
                        <Text type="secondary" className="text-xs">
                          3.0
                        </Text>
                      </Space>
                    </div>
                    <Text type="secondary" className="text-xs mt-1">
                      导出为OpenAPI 3.0规范，用于API文档
                    </Text>
                  </Card>
                </Radio>
              </Space>
            </Radio.Group>
          </div>
        </div>

        {/* Export scope */}
        <div>
          <Text strong>导出范围</Text>
          <div className="mt-2">
            <Radio.Group
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <Space direction="vertical">
                <Radio value="selected">选中的测试集</Radio>
                <Radio value="all">全部测试集</Radio>
              </Space>
            </Radio.Group>
          </div>
        </div>

        {/* Select test set */}
        {scope === "selected" && (
          <div>
            <Text strong>选择要导出的测试集</Text>
            <div className="mt-2 space-y-2">
              {testSets.map((testSet) => (
                <label key={testSet.id} className="flex items-center gap-2 block">
                  <Checkbox
                    checked={selectedIds.includes(testSet.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds((prev) => [...prev, testSet.id]);
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => id !== testSet.id));
                      }
                    }}
                  >
                    {testSet.name}
                  </Checkbox>
                </label>
              ))}
            </div>
            <Text type="secondary" className="text-xs mt-1">
              已选择 {selectedIds.length} 个测试集
            </Text>
          </div>
        )}

        {/* Export options */}
        <div>
          <Text strong>导出选项</Text>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={options.includeAssertions}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, includeAssertions: e.target.checked }))
                }
              >
                包含断言规则
              </Checkbox>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={options.includePreScripts}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, includePreScripts: e.target.checked }))
                }
              >
                包含前置脚本
              </Checkbox>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={options.includeTestScripts}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, includeTestScripts: e.target.checked }))
                }
              >
                包含测试脚本
              </Checkbox>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={options.includeEnvironment}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, includeEnvironment: e.target.checked }))
                }
              >
                包含环境变量
              </Checkbox>
            </label>
          </div>
        </div>

        {/* Format description */}
        <Alert
          message={
            format === "postman" ? (
              <Space>
                <FileTextOutlined />
                <span>导出为 Postman Collection v2.1 格式</span>
              </Space>
            ) : (
              <Space>
                <ApiOutlined />
                <span>导出为 OpenAPI 3.0 规范格式</span>
              </Space>
            )
          }
          description={
            format === "postman"
              ? "可以在Postman中直接导入使用"
              : "可以用于生成API文档或在其他工具中使用"
          }
          type="info"
          showIcon
        />
      </div>
    </Modal>
  );
}
