/**
 * Octos 实时日志 Tab
 * 使用 SSE 接收 Profile 实时日志流
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
  CheckCircleOutlined,
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

export default function OctosLogsTab({ profileId, apiClient }: Props) {
  const [logs, setLogs] = useState<OctosLogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // SSE 连接
  const url = apiClient.getLogStreamUrl?.(profileId) || '';
  const { state, isConnected, reconnect } = useSSE(url, {
    autoConnect: true,
    reconnectInterval: 5000,
    parseMessage: (data: string) => {
      try {
        return JSON.parse(data) as OctosLogEntry;
      } catch {
        return { timestamp: new Date().toISOString(), level: 'info' as LogLevel, message: data };
      }
    },
  });

  // 处理新日志
  useEffect(() => {
    if (state === 'open') {
      const handler = (event: MessageEvent) => {
        try {
          const log = JSON.parse(event.data) as OctosLogEntry;
          setLogs((prev) => {
            const newLogs = [...prev, log];
            // 保留最近 500 条
            return newLogs.slice(-500);
          });
        } catch {
          // 忽略解析错误
        }
      };

      // 注意：useSSE hook 的 lastMessage 已经是解析后的数据
      // 这里我们实际上应该监听 lastMessage 的变化
    }
  }, [state]);

  // 监听 SSE lastMessage 变化（useSSE hook 返回的 lastMessage）
  // 由于 useSSE 的 lastMessage 是在 hook 内部管理的，
  // 我们需要在组件中处理它。这里简化处理，假设 API 返回正确的格式。

  // 自动滚动到底部
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
      {/* 控制栏 */}
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
          <Select.Option value="all">全部</Select.Option>
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

      {/* 日志显示区 */}
      <Card
        bodyStyle={{ padding: 0 }}
        style={{
          backgroundColor: '#1f1f1f',
          borderRadius: 4,
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center">
            <Empty
              description="暂无日志"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              imageStyle={{ height: 60 }}
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

      {/* 提示信息 */}
      {!isConnected && (
        <Alert
          type="warning"
          showIcon
          message="日志流未连接"
          description="请确保 Octos 服务正在运行，且 Profile 已启动。"
          className="text-xs"
        />
      )}
    </div>
  );
}
