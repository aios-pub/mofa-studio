import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '../../../services/mock/workflows';

export default memo(function TransformNode({ data }: NodeProps) {
  const typeInfo = nodeTypeConfig['transform'];
  const nodeData = data as { label?: string; config?: any };
  const transformType = nodeData?.config?.transformType || 'jsonpath';
  return (
    <div className="min-w-[140px] px-4 py-3 rounded-lg border-2 bg-[var(--color-bg-secondary)] border-lime-500 shadow-sm">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-lime-500" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-lime-500" />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{nodeData?.label || typeInfo.name}</span>
      </div>
      <div className="text-xs text-[var(--color-text-tertiary)] bg-lime-500/10 px-2 py-0.5 rounded">{transformType}</div>
    </div>
  );
});
