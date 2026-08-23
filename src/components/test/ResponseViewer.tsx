/**
 * HTTP response查看器组件
 * 用于展示HTTP请求的响应结果
 */

import { Card, Typography, Tag, Tabs, Button, Space, Empty } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useState, useRef, useEffect } from "react";
import type { HttpResponse } from "@/types/testset";

const { Text } = Typography;

interface ResponseViewerProps {
  response: HttpResponse | null;
  loading?: boolean;
}

export function ResponseViewer({ response, loading = false }: ResponseViewerProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <Card size="small">
        <div className="text-center py-8">
          <Text type="secondary">正在发送请求...</Text>
        </div>
      </Card>
    );
  }

  if (!response) {
    return (
      <Card size="small">
        <Empty description="暂无响应数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  const getStatusColor = () => {
    if (response.statusCode >= 200 && response.statusCode < 300) return "success";
    if (response.statusCode >= 300 && response.statusCode < 400) return "warning";
    if (response.statusCode >= 400 && response.statusCode < 500) return "error";
    if (response.statusCode >= 500) return "error";
    if (response.statusCode === 0) return "error";
    return "default";
  };

  const getResponseTimeColor = () => {
    const rt = response.responseTime;
    if (rt > 1000) return "#ef4444";
    if (rt > 500) return "#f59e0b";
    return "#22c55e";
  };

  const getStatusIcon = () => {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return <CheckCircleOutlined />;
    }
    return <CloseCircleOutlined />;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response.body || "");
      setCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([response.body || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `response-${response.statusCode}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatBody = () => {
    const bodyText = response.body || "";
    try {
      const parsed = JSON.parse(bodyText);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return bodyText;
    }
  };

  const headersArray = Object.entries(response.headers || {}).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <Card
      size="small"
      title={
        <Space>
          <Tag icon={getStatusIcon()} color={getStatusColor()}>
            {response.statusCode} {response.statusMessage}
          </Tag>
          <Text className="text-xs" style={{ color: getResponseTimeColor() }}>
            {response.responseTime}ms
          </Text>
        </Space>
      }
      extra={
        <Space>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopy}
            type={copied ? "primary" : "default"}
          >
            {copied ? "已复制" : "复制"}
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
          >
            下载
          </Button>
        </Space>
      }
    >
      <Tabs
        defaultActiveKey="body"
        size="small"
        items={[
          {
            key: "body",
            label: `响应体 (${((response.body || "").length / 1024).toFixed(2)} KB)`,
            children: (
              <div className="bg-gray-50 p-3 rounded max-h-96 overflow-auto">
                <pre className="text-xs whitespace-pre-wrap break-all">
                  {formatBody()}
                </pre>
              </div>
            ),
          },
          {
            key: "headers",
            label: `响应头 (${headersArray.length})`,
            children: (
              <div className="space-y-1">
                {headersArray.map((header) => (
                  <div key={header.name} className="flex gap-2 text-xs">
                    <Text className="font-semibold w-48 flex-shrink-0">
                      {header.name}:
                    </Text>
                    <Text className="flex-1 break-all">{header.value}</Text>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: "info",
            label: "详细信息",
            children: (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <Text type="secondary">状态码:</Text>
                  <Text>{response.statusCode}</Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">状态消息:</Text>
                  <Text>{response.statusMessage}</Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">响应时间:</Text>
                  <Text style={{ color: getResponseTimeColor() }}>{response.responseTime}ms</Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">响应大小:</Text>
                  <Text>{((response.body || "").length / 1024).toFixed(2)} KB</Text>
                </div>
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}
