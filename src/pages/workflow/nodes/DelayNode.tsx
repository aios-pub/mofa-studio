/**
 * 延迟节点组件
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '../../../services/mock/workflows';
import type { NodeType } from '../../../types/workflow';

export default memo(({ data, selected }: NodeProps) => {
  const typeInfo = nodeTypeConfig['delay' as NodeType];
  const duration = data.config?.config?.duration || 1000;

  // 格式化持续时间
  const formatDuration = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  return (
    <div
      className={`
        min-w-[120px] px-4 py-3 rounded-lg border-2
        bg-[var(--color-bg-secondary)]
        ${selected ? 'border-[var(--color-primary)]' : 'border-amber-500'}
        shadow-sm
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-500"
      />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {data.label || typeInfo.name}
        </span>
      </div>

      <div className="text-center">
        <span className="text-lg font-bold text-amber-500">
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
});
