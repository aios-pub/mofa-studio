import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '@/services';

export default memo(function LoopNode({ data }: NodeProps) {
  const typeInfo = nodeTypeConfig['loop'];
  const nodeData = data as { label?: string; config?: any };
  return (
    <div className="min-w-[160px] px-4 py-3 rounded-lg border-2 bg-[var(--color-bg-secondary)] border-pink-500 shadow-sm">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-pink-500" />
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{nodeData?.label || typeInfo.name}</span>
      </div>
      <div className="flex items-center justify-end mb-2">
        <span className="text-xs text-[var(--color-text-tertiary)] mr-2">循环体</span>
        <Handle type="source" position={Position.Right} id="loop" className="!w-3 !h-3 !bg-pink-400" />
      </div>
      <div className="flex items-center justify-end">
        <span className="text-xs text-[var(--color-text-tertiary)] mr-2">完成</span>
        <Handle type="source" position={Position.Right} id="complete" className="!w-3 !h-3 !bg-pink-300" />
      </div>
    </div>
  );
});
