import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '@/services';

interface BranchConfig { id: string; label: string; }

export default memo(function ConditionNode({ data }: NodeProps) {
  const typeInfo = nodeTypeConfig['condition'];
  const nodeData = data as { label?: string; config?: { branches?: BranchConfig[] } };
  const branches = nodeData?.config?.branches || [];
  return (
    <div className="min-w-[160px] px-4 py-3 rounded-lg border-2 bg-[var(--color-bg-secondary)] border-cyan-500 shadow-sm">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-cyan-500" />
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{nodeData?.label || typeInfo.name}</span>
      </div>
      <div className="space-y-1">
        {branches.map((branch) => (
          <div key={branch.id} className="flex items-center justify-end">
            <span className="text-xs text-[var(--color-text-tertiary)] mr-2">{branch.label}</span>
            <Handle type="source" position={Position.Right} id={branch.id} className="!w-2.5 !h-2.5 !bg-cyan-400" style={{ top: 'auto', transform: 'none' }} />
          </div>
        ))}
        <div className="flex items-center justify-end">
          <span className="text-xs text-[var(--color-text-tertiary)] mr-2">默认</span>
          <Handle type="source" position={Position.Right} id="default" className="!w-2.5 !h-2.5 !bg-gray-400" style={{ top: 'auto', transform: 'none' }} />
        </div>
      </div>
    </div>
  );
});
