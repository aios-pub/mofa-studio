import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '../../../services/mock/workflows';

const formatDuration = (ms: number) => ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms';

export default memo(function DelayNode({ data }: NodeProps) {
  const typeInfo = nodeTypeConfig['delay'];
  const nodeData = data as { label?: string; config?: { duration?: number } };
  const duration = nodeData?.config?.duration || 1000;
  return (
    <div className="min-w-[120px] px-4 py-3 rounded-lg border-2 bg-[var(--color-bg-secondary)] border-amber-500 shadow-sm">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-amber-500" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-amber-500" />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{nodeData?.label || typeInfo.name}</span>
      </div>
      <div className="text-center"><span className="text-lg font-bold text-amber-500">{formatDuration(duration)}</span></div>
    </div>
  );
});
