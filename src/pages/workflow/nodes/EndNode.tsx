import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '@/services';

export default memo(function EndNode({ data }: NodeProps) {
  const typeInfo = nodeTypeConfig['end'];
  const nodeData = data as { label?: string; config?: unknown };
  return (
    <div className="min-w-[120px] px-4 py-2 rounded-lg border-2 bg-[var(--color-bg-secondary)] border-red-500 shadow-sm">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-red-500" />
      <div className="flex items-center gap-2">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{nodeData?.label || typeInfo.name}</span>
      </div>
    </div>
  );
});
