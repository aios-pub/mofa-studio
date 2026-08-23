/**
 * Test report detail component
 * Show detailed test case execution results including script execution results
 */

import { Card, Collapse, Tag, Typography, Space } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import type { TestCaseReport } from "@/types/testset";

const { Text } = Typography;

interface TestCaseReportDetailProps {
  report: TestCaseReport;
}

export function TestCaseReportDetail({ report }: TestCaseReportDetailProps) {
  const getStatusTag = (status: string) => {
    switch (status) {
      case "passed":
        return <Tag color="success" icon={<CheckCircleOutlined />}>通过</Tag>;
      case "failed":
        return <Tag color="error" icon={<CloseCircleOutlined />}>失败</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const items = [
    {
      key: "overview",
      label: "概览",
      children: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">状态码:</span>
              <span className="ml-2 font-medium">{report.statusCode}</span>
            </div>
            <div>
              <span className="text-gray-500">状态消息:</span>
              <span className="ml-2 font-medium">{report.statusMessage}</span>
            </div>
            <div>
              <span className="text-gray-500">耗时:</span>
              <span className="ml-2 font-medium">{report.duration}ms</span>
            </div>
            {report.error && (
              <div className="col-span-2">
                <span className="text-gray-500">错误:</span>
                <span className="ml-2 text-red-500">{report.error}</span>
              </div>
            )}
          </div>

          {report.request && (
            <div className="mt-3">
              <Text strong className="text-sm">请求信息</Text>
              <div className="mt-2 bg-gray-50 p-2 rounded text-xs">
                <div><span className="font-medium">方法:</span> {report.request.method}</div>
                <div><span className="font-medium">URL:</span> {report.request.url}</div>
                {report.request.headers.length > 0 && (
                  <div className="mt-1">
                    <span className="font-medium">Headers:</span>
                    <div className="mt-1 space-y-0.5">
                      {report.request.headers.map((h, i) => (
                        <div key={`req-h-${h.name}-${i}`} className="text-gray-600">
                          <span className="text-gray-400">{h.name}:</span> {h.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {report.request.body && (
                  <div className="mt-1">
                    <span className="font-medium">Body:</span>
                    <pre className="mt-1 p-2 bg-white rounded overflow-x-auto">
                      {report.request.body}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {report.response && (
            <div className="mt-3">
              <Text strong className="text-sm">响应信息</Text>
              <div className="mt-2 bg-gray-50 p-2 rounded text-xs">
                <div><span className="font-medium">状态码:</span> {report.response.statusCode}</div>
                {report.response.headers.length > 0 && (
                  <div className="mt-1">
                    <span className="font-medium">Headers:</span>
                    <div className="mt-1 space-y-0.5">
                      {report.response.headers.map((h, i) => (
                        <div key={`res-h-${h.name}-${i}`} className="text-gray-600">
                          <span className="text-gray-400">{h.name}:</span> {h.value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-1">
                  <span className="font-medium">Body:</span>
                  <pre className="mt-1 p-2 bg-white rounded overflow-x-auto max-h-40">
                    {report.response.body}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "script",
      label: `脚本执行 (${report.scriptLogs.length} 条日志, ${report.testResults.length} 个断言)`,
      children: (
        <div className="space-y-3">
          {report.scriptLogs.length > 0 ? (
            <div>
              <Text strong className="text-sm">脚本日志</Text>
              <div className="mt-2 bg-gray-50 p-2 rounded">
                {report.scriptLogs.map((log, index) => (
                  <div key={`log-${index}`} className="text-xs font-mono text-gray-600 mb-1">
                    <CodeOutlined className="mr-1" />
                    {log}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              无脚本日志
            </div>
          )}

          {report.testResults.length > 0 ? (
            <div>
              <Text strong className="text-sm">测试断言</Text>
              <div className="mt-2 space-y-1">
                {report.testResults.map((result, index) => (
                  <div
                    key={`result-${index}`}
                    className={`flex items-center justify-between p-2 rounded ${
                      result.passed ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <Space>
                      {result.passed ? (
                        <CheckCircleOutlined className="text-green-500" />
                      ) : (
                        <CloseCircleOutlined className="text-red-500" />
                      )}
                      <span className="text-sm">{result.name}</span>
                    </Space>
                    {result.error && (
                      <span className="text-xs text-red-500">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              无测试断言
            </div>
          )}
        </div>
      ),
    },
  ];

  if (report.iterations && report.iterations.length > 0) {
    items.push({
      key: "iterations",
      label: `数据迭代 (${report.iterations.length} 次)`,
      children: (
        <div className="space-y-2">
          {report.iterations.map((iteration) => (
            <div key={`iter-${iteration.iterationNumber}`} className="p-3 bg-gray-50 rounded">
              <div className="flex items-center justify-between mb-2">
                <Text strong className="text-sm">
                  迭代 #{iteration.iterationNumber}
                </Text>
                {getStatusTag(iteration.status)}
              </div>
              <div className="text-xs text-gray-600">
                <div>耗时: {iteration.duration}ms</div>
                {iteration.error && (
                  <div className="text-red-500">错误: {iteration.error}</div>
                )}
                {Object.keys(iteration.dataRow).length > 0 && (
                  <div className="mt-1">
                    <span className="font-medium">数据:</span>
                    <pre className="ml-2 inline bg-white p-1 rounded">
                      {JSON.stringify(iteration.dataRow, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ),
    });
  }

  return (
    <Card size="small" className="mb-2">
      <div className="flex items-center justify-between mb-2">
        <Text strong>{report.testCaseName}</Text>
        {getStatusTag(report.status)}
      </div>
      <Collapse items={items} defaultActiveKey={["overview"]} />
    </Card>
  );
}
