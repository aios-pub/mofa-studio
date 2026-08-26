import { useTranslation } from "react-i18next";
/**
 * Octos live logs tab
 * Receive profile live logs via SSE
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Card,
  Space,
  Button,
  Tag,
  Typography,
  Select,
  Empty,
  Alert,
} from "antd";
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useSSE } from "@/hooks/useSSE";
import type { OctosApiClient } from "@/services/real/octos";

const { Text } = Typography;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface OctosLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  profile_id?: string;
  module?: string;
  context?: Record<string, unknown>;
}

interface Props {
  profileId: string;
  apiClient: OctosApiClient | any;
}

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '#8c8c8c',
  info: '#1890ff',
  warn: '#faad14',
  error: '#ff4d4f',
};

const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

export default function OctosLogsTab({ profileId, apiClient }: Props) {  const { t } = useTranslation();

  const [logs, setLogs] = useState<OctosLogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // SSE connection
  const url = apiClient.getLogStreamUrl?.(profileId) || '';
  const { state, isConnected, reconnect, lastMessage } = useSSE(url, {
    autoConnect: true,
    reconnectInterval: 5000,
    parseMessage: (data: string) => {
      try {
        return JSON.parse(data) as OctosLogEntry;
      } catch {
        // If not JSON, return the string directly
        return data;
      }
    },
  });

  // Handle new logs: watch lastMessage changes
  useEffect(() => {
    if (lastMessage === null) return;

    if (paused) return; // do not append logs while paused

    // Determine message type
    if (typeof lastMessage === 'string') {
      // Plain text logs
      const log: OctosLogEntry = {
        timestamp: new Date().toISOString(),
        level: lastMessage.startsWith('[stderr]') ? 'error' : 'info',
        message: lastMessage,
      };
      setLogs((prev) => {
        const newLogs = [...prev, log];
        return newLogs.length > 1000 ? newLogs.slice(-1000) : newLogs;
      });
    } else if (typeof lastMessage === 'object' && 'message' in lastMessage) {
      // Structured logs
      setLogs((prev) => {
        const newLogs = [...prev, lastMessage as OctosLogEntry];
        return newLogs.length > 1000 ? newLogs.slice(-1000) : newLogs;
      });
    }
  }, [lastMessage, paused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, paused]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const filteredLogs = logs.filter((log) =>
    filterLevel === 'all' || log.level === filterLevel
  );

  const getLogColor = (level: LogLevel) => LOG_COLORS[level] || '#000';

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <Space>
        <Tag color={isConnected ? 'success' : 'error'}>
          {isConnected ? '已连接' : '未连接'}
        </Tag>
        <Select
          value={filterLevel}
          onChange={setFilterLevel}
          style={{ width: 120 }}
          size="small"
        >
          <Select.Option value="all">{t("全部")}</Select.Option>
          {LOG_LEVELS.map((level) => (
            <Select.Option key={level} value={level}>
              {level.toUpperCase()}
            </Select.Option>
          ))}
        </Select>
        <Button
          size="small"
          icon={paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          onClick={togglePause}
        >
          {paused ? '继续' : '暂停'}
        </Button>
        <Button
          size="small"
          icon={<ClearOutlined />}
          onClick={clearLogs}
        >
          清空
        </Button>
        {!isConnected && (
          <Button size="small" type="primary" onClick={reconnect}>
            重新连接
          </Button>
        )}
        <Text type="secondary" className="text-xs">
          {logs.length} 条日志
        </Text>
      </Space>

      {/* Log display area */}
      <Card
        styles={{ body: { padding: 0 } }}
        style={{
          backgroundColor: '#1f1f1f',
          borderRadius: 4,
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center">
            <Empty
              description={t("暂无日志")}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              styles={{ image: { height: 60 } }}
            >
              {!isConnected && (
                <Button type="primary" onClick={reconnect}>
                  连接日志流
                </Button>
              )}
            </Empty>
          </div>
        ) : (
          <div
            ref={scrollRef}
            style={{
              height: 400,
              overflowY: 'auto',
              padding: 12,
              fontFamily: 'monospace',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            {filteredLogs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  color: getLogColor(log.level),
                  marginBottom: 4,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                <span style={{ color: '#8c8c8c' }}>
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                {' '}
                <span style={{ fontWeight: 'bold' }}>
                  [{log.level.toUpperCase()}]
                </span>
                {log.module && (
                  <span style={{ color: '#1890ff' }}>
                    {' '}
                    [{log.module}]
                  </span>
                )}
                : {log.message}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Hint */}
      {!isConnected && (
        <Alert
          type="warning"
          showIcon
          title={t("日志流未连接")}
          description={t("请确保 Octos 服务正在运行，且 Profile 已启动。")}
          className="text-xs"
        />
      )}
    </div>
  );
}
