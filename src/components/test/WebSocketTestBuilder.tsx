import { useTranslation } from "react-i18next";
/**
 * WebSocket test builder component
 * For configuring and testing WebSocket connections
 */

import { useState, useEffect, useRef } from "react";
import {
  Input,
  Button,
  Card,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  PlayCircleOutlined,
  StopOutlined,
  SendOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { WebSocketRequestConfig } from "@/types/testrequest";

const { Text } = Typography;
const { TextArea } = Input;

interface WebSocketTestBuilderProps {
  value?: WebSocketRequestConfig;
  onChange?: (config: WebSocketRequestConfig) => void;
  readonly?: boolean;
}

interface Message {
  id: string;
  type: "sent" | "received";
  content: string;
  timestamp: Date;
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export function WebSocketTestBuilder({
  value,
  onChange,
  readonly = false,
}: WebSocketTestBuilderProps) {  const { t } = useTranslation();

  const config = value || getDefaultConfig();
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close the WebSocket and clear timeouts on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const updateConfig = (updates: Partial<WebSocketRequestConfig>) => {
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

    try {
      const protocols = config.protocols || [];
      const ws = new WebSocket(config.url, protocols.length > 0 ? protocols : undefined);
      wsRef.current = ws;

      // Connection timeout handling (10s)
      connectTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          setConnectionState("error");
          addMessage("received", "❌ WebSocket连接超时");
          ws.close();
          wsRef.current = null;
          connectTimeoutRef.current = null;
        }
      }, 10000);

      ws.onopen = () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setConnectionState("connected");
        addMessage("received", "✅ WebSocket连接已建立");
      };

      ws.onmessage = (event) => {
        addMessage("received", event.data);
      };

      ws.onerror = () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setConnectionState("error");
        addMessage("received", "❌ WebSocket连接错误");
      };

      ws.onclose = () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setConnectionState("disconnected");
        addMessage("received", "🔌 WebSocket连接已关闭");
      };
    } catch (error) {
      setConnectionState("error");
      addMessage("received", `❌ 创建WebSocket失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const disconnect = () => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState("disconnected");
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || connectionState !== "connected") return;

    if (wsRef.current) {
      wsRef.current.send(inputMessage);
      addMessage("sent", inputMessage);
      setInputMessage("");
    }
  };

  const addMessage = (type: "sent" | "received", content: string) => {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const getStatusTag = () => {
    switch (connectionState) {
      case "disconnected":
        return <Tag color="default">{t("未连接")}</Tag>;
      case "connecting":
        return <Tag color="processing">{t("连接中...")}</Tag>;
      case "connected":
        return <Tag color="success">{t("已连接")}</Tag>;
      case "error":
        return <Tag color="error">{t("连接错误")}</Tag>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection configuration */}
      <Card title={t("连接配置")} size="small">
        <div className="space-y-3">
          <div>
            <Text strong>WebSocket URL</Text>
            <Input
              value={config.url}
              onChange={(e) => updateConfig({ url: e.target.value })}
              placeholder="wss://echo.websocket.org"
              disabled={readonly || connectionState === "connected"}
              className="mt-1"
            />
          </div>

          <div>
            <Text strong>{t("子协议（可选）")}</Text>
            <div className="mt-1 space-y-2">
              {(config.protocols || []).map((protocol, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={protocol}
                    onChange={(e) => {
                      const newProtocols = [...(config.protocols || [])];
                      newProtocols[index] = e.target.value;
                      updateConfig({ protocols: newProtocols });
                    }}
                    placeholder="protocol-name"
                    disabled={readonly || connectionState === "connected"}
                  />
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      const newProtocols = (config.protocols || []).filter((_, i) => i !== index);
                      updateConfig({ protocols: newProtocols });
                    }}
                    disabled={readonly || connectionState === "connected"}
                  />
                </div>
              ))}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => updateConfig({ protocols: [...(config.protocols || []), ""] })}
                disabled={readonly || connectionState === "connected"}
                block
              >
                添加子协议
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Space>
              {getStatusTag()}
              {connectionState === "connected" && (
                <Text type="secondary">消息: {messages.filter(m => m.type === "received").length} 收 / {messages.filter(m => m.type === "sent").length} 发</Text>
              )}
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

      {/* Messages area */}
      <Card
        title={t("消息")}
        size="small"
        extra={
          <Button
            type="text"
            size="small"
            onClick={clearMessages}
            disabled={messages.length === 0}
          >
            清空
          </Button>
        }
      >
        <div className="space-y-3">
          {/* Messages history */}
          <div className="bg-gray-50 rounded p-3 h-64 overflow-y-auto font-mono text-sm">
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
                    {msg.type === "sent" ? "发送" : "接收"} • {msg.timestamp.toLocaleTimeString()}
                  </div>
                  <div className="bg-white p-2 rounded border border-gray-200 mt-1 break-words">
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send message */}
          <div className="flex gap-2">
            <TextArea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t("输入要发送的消息")}
              disabled={connectionState !== "connected"}
              autoSize={{ minRows: 2, maxRows: 4 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={sendMessage}
              disabled={connectionState !== "connected" || !inputMessage.trim()}
              className="self-end"
            >
              发送
            </Button>
          </div>
        </div>
      </Card>

      {/* Expected events configuration */}
      <Card title={t("预期事件")} size="small">
        <div className="text-sm text-gray-500">
          配置预期收到的事件用于断言验证（开发中...）
        </div>
      </Card>
    </div>
  );
}

function getDefaultConfig(): WebSocketRequestConfig {
  return {
    url: "",
    protocols: [],
    headers: [],
    messagesToSend: [],
    expectedEvents: [],
    timeout: 30000,
  };
}
