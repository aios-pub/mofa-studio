/**
 * Socket.IO测试构建器组件
 * 用于配置和测试Socket.IO连接
 */

import { useState, useEffect, useRef } from "react";
import {
  Input,
  Button,
  Card,
  Space,
  Tag,
  Typography,
  Tabs,
} from "antd";
import {
  PlayCircleOutlined,
  StopOutlined,
  SendOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { io, Socket } from "socket.io-client";
import type { SocketIORequestConfig } from "@/types/testrequest";

const { Text } = Typography;
const { TextArea } = Input;

interface SocketIOTestBuilderProps {
  value?: SocketIORequestConfig;
  onChange?: (config: SocketIORequestConfig) => void;
  readonly?: boolean;
}

interface SocketMessage {
  id: string;
  type: "sent" | "received";
  event: string;
  data: string;
  timestamp: Date;
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export function SocketIOTestBuilder({
  value,
  onChange,
  readonly = false,
}: SocketIOTestBuilderProps) {
  const config = value || getDefaultConfig();
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [inputEvent, setInputEvent] = useState("");
  const [inputData, setInputData] = useState("");
  const [newEventName, setNewEventName] = useState("");
  const [newEventData, setNewEventData] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 组件卸载时断开Socket.IO连接，防止内存泄漏
  useEffect(() => {
    return () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const updateConfig = (updates: Partial<SocketIORequestConfig>) => {
    if (!readonly && onChange) {
      onChange({ ...config, ...updates });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const connect = () => {
    if (!config.url) return;

    setConnectionState("connecting");
    setMessages([]);

    try {
      const socketOptions: any = {};

      // 添加认证信息
      if (config.auth) {
        socketOptions.auth = config.auth;
      }

      // 连接到Socket.IO服务器
      const namespace = config.namespace || "/";
      const socket = io(`${config.url}${namespace}`, socketOptions);

      socketRef.current = socket;

      // 连接超时处理（10秒）
      connectTimeoutRef.current = setTimeout(() => {
        if (socket.connected === false) {
          setConnectionState("error");
          addMessage("received", "error", "❌ Socket.IO连接超时");
          socket.disconnect();
          socketRef.current = null;
          connectTimeoutRef.current = null;
        }
      }, 10000);

      socket.on("connect", () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setConnectionState("connected");
        addMessage("received", "connect", `✅ Socket.IO连接已建立 (ID: ${socket.id})`);
      });

      socket.on("disconnect", (reason) => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setConnectionState("disconnected");
        addMessage("received", "disconnect", `🔌 连接断开: ${reason}`);
      });

      socket.on("connect_error", (error) => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setConnectionState("error");
        addMessage("received", "connect_error", `❌ 连接错误: ${error.message}`);
      });

      // 监听配置的事件
      const eventsToListen = config.eventsToListen || [];
      eventsToListen.forEach((eventName) => {
        socket.on(eventName, (...args: any[]) => {
          const data = args.map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(", ");
          addMessage("received", eventName, data);
        });
      });
    } catch (error) {
      setConnectionState("error");
      addMessage("received", "error", `❌ 创建Socket.IO连接失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const disconnect = () => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionState("disconnected");
  };

  const emitEvent = () => {
    if (!inputEvent.trim() || connectionState !== "connected") return;

    let data: any = inputData;
    try {
      // 尝试解析为JSON
      data = inputData ? JSON.parse(inputData) : {};
    } catch {
      // e.g.果不是JSON，使用原始字符串
    }

    if (socketRef.current) {
      socketRef.current.emit(inputEvent, data);
      addMessage("sent", inputEvent, typeof data === "object" ? JSON.stringify(data) : String(data));
      setInputData("");
    }
  };

  const addTestEvent = () => {
    if (!newEventName.trim()) return;
    let data: Record<string, unknown> = {};
    try {
      data = newEventData ? JSON.parse(newEventData) : {};
    } catch {
      data = { value: newEventData };
    }
    const events = [...(config.eventsToEmit || [])];
    events.push({ event: newEventName, data });
    updateConfig({ eventsToEmit: events });
    setNewEventName("");
    setNewEventData("");
  };

  const removeTestEvent = (index: number) => {
    const events = (config.eventsToEmit || []).filter((_, i) => i !== index);
    updateConfig({ eventsToEmit: events });
  };

  const addMessage = (type: "sent" | "received", event: string, data: string) => {
    const message: SocketMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type,
      event,
      data,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
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
      {/* 连接配置 */}
      <Card title="连接配置" size="small">
        <div className="space-y-3">
          <div>
            <Text strong>Socket.IO URL</Text>
            <Input
              value={config.url}
              onChange={(e) => updateConfig({ url: e.target.value })}
              placeholder="https://io.example.com"
              disabled={readonly || connectionState === "connected"}
              className="mt-1"
            />
          </div>

          <div>
            <Text strong>命名空间（可选）</Text>
            <Input
              value={config.namespace}
              onChange={(e) => updateConfig({ namespace: e.target.value })}
              placeholder="/chat"
              disabled={readonly || connectionState === "connected"}
              className="mt-1"
              addonBefore="/"
            />
          </div>

          <div>
            <Text strong>认证配置（Auth，JSON格式）</Text>
            <TextArea
              value={config.auth !== null && typeof config.auth === "object" ? JSON.stringify(config.auth, null, 2) : ""}
              onChange={(e) => {
                try {
                  const auth = e.target.value ? JSON.parse(e.target.value) : undefined;
                  updateConfig({ auth });
                } catch {
                  // 忽略JSON解析错误
                }
              }}
              placeholder='{"token": "your-token"}'
              disabled={readonly || connectionState === "connected"}
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <Space>
              {getStatusTag()}
              <Text type="secondary">消息: {messages.filter(m => m.type === "received").length} 收 / {messages.filter(m => m.type === "sent").length} 发</Text>
            </Space>
            <Space>
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

      {/* Messages区域 */}
      <Card title="消息" size="small">
        <Tabs
          defaultActiveKey="messages"
          items={[
            {
              key: "messages",
              label: "消息历史",
              children: (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded p-3 h-48 overflow-y-auto font-mono text-sm">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        {connectionState === "connected" ? "等待消息..." : "连接后消息将显示在这里"}
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`mb-2 ${
                            msg.type === "sent" ? "text-blue-600 text-right" : "text-green-600"
                          }`}
                        >
                          <div className="text-xs text-gray-400">
                            {msg.type === "sent" ? "发送" : "接收"} • {msg.event} • {msg.timestamp.toLocaleTimeString()}
                          </div>
                          <div className="bg-white p-2 rounded border border-gray-200 mt-1 break-words">
                            <pre className="text-xs overflow-x-auto">{msg.data}</pre>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              ),
            },
            {
              key: "send",
              label: "发送事件",
              children: (
                <div className="space-y-3">
                  <div>
                    <Text strong>事件名称</Text>
                    <Input
                      value={inputEvent}
                      onChange={(e) => setInputEvent(e.target.value)}
                      placeholder="message"
                      disabled={connectionState !== "connected"}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Text strong>事件数据（JSON格式）</Text>
                    <TextArea
                      value={inputData}
                      onChange={(e) => setInputData(e.target.value)}
                      placeholder='{"text": "Hello"}'
                      disabled={connectionState !== "connected"}
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={emitEvent}
                    disabled={connectionState !== "connected" || !inputEvent.trim()}
                  >
                    发送事件
                  </Button>
                </div>
              ),
            },
            {
              key: "events",
              label: "测试事件",
              children: (
                <div className="space-y-3">
                  <div className="text-sm text-gray-500">
                    配置测试执行时自动发送的 Socket.IO 事件
                  </div>
                  {(config.eventsToEmit || []).length === 0 ? (
                    <div className="text-center py-4 text-gray-400">
                      暂无测试事件配置
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(config.eventsToEmit || []).map((evt, index) => (
                        <div key={index} className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                          <div className="flex-1">
                            <Tag color="blue">{evt.event}</Tag>
                            <pre className="text-xs mt-1 overflow-x-auto">
                              {JSON.stringify(evt.data, null, 2)}
                            </pre>
                          </div>
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeTestEvent(index)}
                            disabled={readonly}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t pt-3 space-y-2">
                    <Text strong>添加事件</Text>
                    <Input
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      placeholder="事件名称"
                      disabled={readonly}
                    />
                    <TextArea
                      value={newEventData}
                      onChange={(e) => setNewEventData(e.target.value)}
                      placeholder='事件数据（JSON格式）'
                      disabled={readonly}
                      rows={3}
                    />
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={addTestEvent}
                      disabled={readonly || !newEventName.trim()}
                      block
                    >
                      添加到测试配置
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              key: "listen",
              label: "监听配置",
              children: (
                <div className="space-y-2">
                  <Text type="secondary">配置要监听的事件列表（开发中...）</Text>
                  {(config.eventsToListen || []).map((evt, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Tag>{evt}</Tag>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

function getDefaultConfig(): SocketIORequestConfig {
  return {
    url: "",
    namespace: undefined,
    auth: undefined,
    eventsToEmit: [],
    eventsToListen: [],
    timeout: 30000,
  };
}
