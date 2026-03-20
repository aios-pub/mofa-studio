/**
 * WebSocket 连接模式切换组件
 */

import { useState } from 'react';
import { Radio, Badge, Tooltip, Space } from 'antd';
import {
  WifiOutlined,
  ApiOutlined,
  LinkOutlined,
  DisconnectOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { ConnectionMode, ConnectionState } from '@/services/websocket';

interface ConnectionSwitcherProps {
  /** 是否显示状态文本 */
  showStatusText?: boolean;
  /** 样式 */
  style?: React.CSSProperties;
  /** 类名 */
  className?: string;
}

/** 获取状态图标 */
function getStatusIcon(state: ConnectionState) {
  switch (state) {
    case 'connected':
      return <WifiOutlined className="text-green-500" />;
    case 'connecting':
      return <LoadingOutlined className="text-blue-500" spin />;
    case 'error':
      return <ExclamationCircleOutlined className="text-red-500" />;
    case 'disconnected':
    default:
      return <DisconnectOutlined className="text-gray-400" />;
  }
}

/** 获取状态颜色 */
function getStatusColor(state: ConnectionState): string {
  switch (state) {
    case 'connected':
      return 'green';
    case 'connecting':
      return 'blue';
    case 'error':
      return 'red';
    case 'disconnected':
    default:
      return 'gray';
  }
}

/** 获取状态文本 */
function getStatusText(state: ConnectionState): string {
  switch (state) {
    case 'connected':
      return '已连接';
    case 'connecting':
      return '连接中...';
    case 'error':
      return '连接错误';
    case 'disconnected':
    default:
      return '未连接';
  }
}

/** 获取模式文本 */
function getModeText(mode: ConnectionMode): string {
  switch (mode) {
    case 'socketio':
      return 'Socket.IO';
    case 'wss':
      return 'WSS';
    default:
      return mode;
  }
}

export default function ConnectionSwitcher({
  showStatusText = true,
  style,
  className,
}: ConnectionSwitcherProps) {
  const { state, mode, switchMode, connect, disconnect } = useWebSocket({
    autoConnect: false,
  });
  const [switching, setSwitching] = useState(false);

  // 处理模式切换
  const handleModeChange = async (newMode: ConnectionMode) => {
    if (newMode === mode || switching) return;

    setSwitching(true);
    try {
      // 先断开当前连接
      disconnect();
      // 切换模式
      await switchMode(newMode);
      // 重新连接
      await connect();
    } catch (error) {
      console.error('Failed to switch mode:', error);
    } finally {
      setSwitching(false);
    }
  };

  // 处理重连
  const handleReconnect = async () => {
    if (state === 'disconnected' || state === 'error') {
      await connect();
    }
  };

  return (
    <div
      className={`flex items-center gap-3 ${className || ''}`}
      style={style}
    >
      {/* 连接状态指示器 */}
      <Tooltip title={`${getModeText(mode)} - ${getStatusText(state)}`}>
        <Badge
          dot
          color={getStatusColor(state)}
          className="cursor-pointer"
          onClick={handleReconnect}
        >
          <div className="flex items-center gap-1 px-2 py-1 bg-[var(--color-bg-secondary)] rounded-lg">
            {getStatusIcon(state)}
            {showStatusText && (
              <span className="text-xs text-[var(--color-text-secondary)]">
                {getStatusText(state)}
              </span>
            )}
          </div>
        </Badge>
      </Tooltip>

      {/* 模式切换 */}
      <Radio.Group
        value={mode}
        onChange={(e) => handleModeChange(e.target.value)}
        disabled={switching || state === 'connecting'}
        size="small"
        optionType="button"
        buttonStyle="solid"
      >
        <Radio.Button value="socketio">
          <Tooltip title="Socket.IO 模式 - 支持回退和重连">
            <Space size={4}>
              <ApiOutlined />
              <span className="text-xs">Socket.IO</span>
            </Space>
          </Tooltip>
        </Radio.Button>
        <Radio.Button value="wss">
          <Tooltip title="原生 WSS 模式 - 更轻量级">
            <Space size={4}>
              <LinkOutlined />
              <span className="text-xs">WSS</span>
            </Space>
          </Tooltip>
        </Radio.Button>
      </Radio.Group>
    </div>
  );
}
