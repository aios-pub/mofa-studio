/**
 * SSE (Server-Sent Events) test builder component
 * For configuring and testing SSE connections
 */

import { useState, useEffect, useRef } from "react";
import {
  Input,
  Button,
  Card,
  Space,
  Tag,
  Typography,
  InputNumber,
  Switch,
} from "antd";
import {
  PlayCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import type { SSERequestConfig } from "@/types/testrequest";

const { Text } = Typography;

interface SSETestBuilderProps {
  value?: SSERequestConfig;
  onChange?: (config: SSERequestConfig) => void;
  readonly?: boolean;
}

interface SSEEvent {
  id: string;
  event: string;
  data: string;
  timestamp: Date;
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export function SSETestBuilder({
  value,
  onChange,
  readonly = false,
}: SSETestBuilderProps) {
  const config = value || getDefaultConfig();
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [autoReconnect, setAutoReconnect] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [events]);

  // Close the EventSource on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const updateConfig = (updates: Partial<SSERequestConfig>) => {
    if (!readonly && onChange) {
      onChange({ ...config, ...updates });
    }
  };

  const scrollToBottom = () => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const connect = () => {
    if (!config.url) return;

    setConnectionState("connecting");
    setEvents([]);

    try {
      const eventSource = new EventSource(config.url);
      eventSourceRef.current = eventSource;

      // Connection timeout handling (10s)
      connectTimeoutRef.current = setTimeout(() => {
        setConnectionState("error");
        addEvent("error", "❌ SSE连接超时");
        eventSource.close();
        eventSourceRef.current = null;
        connectTimeoutRef.current = null;
      }, 10000);

      eventSource.onopen = () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setConnectionState("connected");
        addEvent("message", "✅ SSE连接已建立");
      };

      eventSource.onmessage = (event) => {
        addEvent("message", event.data);
      };

      eventSource.onerror = () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setConnectionState("error");
        addEvent("error", `❌ 连接错误`);
        if (!autoReconnect) {
          eventSource.close();
        }
      };

      // Listen to named events
      const expectedEvents = config.expectedEvents || [];
      expectedEvents.forEach((evt: any) => {
        eventSource.addEventListener(evt.event || "message", (e: any) => {
          addEvent(evt.event || "message", e.data);
        });
      });
    } catch (error) {
      setConnectionState("error");
      addEvent("error", `❌ 创建EventSource失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const disconnect = () => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionState("disconnected");
  };

  const addEvent = (event: string, data: string) => {
    const sseEvent: SSEEvent = {
      id: `evt-${Date.now()}-${Math.random()}`,
      event,
      data,
      timestamp: new Date(),
    };
    setEvents((prev) => [...prev, sseEvent]);
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const getStatusTag = () => {
    switch (connectionState) {
      case "disconnected":
        return <Tag color="default">未连接</Tag>;
      case "connecting":
        return <Tag color="processing">连接中...</Tag>;
      case "connected":
        return <Tag color="success">已连接</Tag>;
      case "error":
        return <Tag color="error">连接错误</Tag>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection configuration */}
      <Card title="连接配置" size="small">
        <div className="space-y-3">
          <div>
            <Text strong>SSE URL</Text>
            <Input
              value={config.url}
              onChange={(e) => updateConfig({ url: e.target.value })}
              placeholder="https://api.example.com/events"
              disabled={readonly || connectionState === "connected"}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text strong>最小事件数</Text>
              <InputNumber
                value={config.minEvents}
                onChange={(value) => updateConfig({ minEvents: value || undefined })}
                min={1}
                disabled={readonly || connectionState === "connected"}
                className="w-full mt-1"
              />
            </div>
            <div>
              <Text strong>最大持续时间（秒）</Text>
              <InputNumber
                value={config.maxDuration}
                onChange={(value) => updateConfig({ maxDuration: value || undefined })}
                min={1}
                disabled={readonly || connectionState === "connected"}
                className="w-full mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Space>
              {getStatusTag()}
              <Text type="secondary">事件数: {events.length}</Text>
            </Space>
            <Space>
              <div className="flex items-center gap-2">
                <Text>自动重连</Text>
                <Switch
                  checked={autoReconnect}
                  onChange={setAutoReconnect}
                  disabled={readonly || connectionState === "connected"}
                />
              </div>
              {connectionState === "connected" ? (
                <Button
                  type="primary"
                  danger
                  icon={<StopOutlined />}
                  onClick={disconnect}
                  disabled={readonly}
                >
                  断开连接
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={connect}
                  disabled={!config.url || readonly || connectionState === "connecting"}
                >
                  连接
                </Button>
              )}
            </Space>
          </div>
        </div>
      </Card>

      {/* Event stream display */}
      <Card
        title="事件流"
        size="small"
        extra={
          <Button
            type="text"
            size="small"
            onClick={clearEvents}
            disabled={events.length === 0}
          >
            清空
          </Button>
        }
      >
        <div className="bg-gray-50 rounded p-3 h-80 overflow-y-auto font-mono text-sm">
          {events.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {connectionState === "connected" ? "等待事件..." : "连接后事件将显示在这里"}
            </div>
          ) : (
            events.map((evt) => (
              <div key={evt.id} className="mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <Tag color="blue">{evt.event}</Tag>
                  <span>{evt.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="bg-white p-2 rounded border border-gray-200 break-words">
                  {evt.data.startsWith("{") || evt.data.startsWith("[") ? (
                    <pre className="text-xs overflow-x-auto">{evt.data}</pre>
                  ) : (
                    <span>{evt.data}</span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={eventsEndRef} />
        </div>
      </Card>

      {/* Expected events configuration */}
      <Card title="预期事件配置" size="small">
        <div className="text-sm text-gray-500">
          配置预期收到的事件用于断言验证（开发中...）
        </div>
      </Card>
    </div>
  );
}

function getDefaultConfig(): SSERequestConfig {
  return {
    url: "",
    headers: [],
    minEvents: undefined,
    maxDuration: undefined,
  };
}
