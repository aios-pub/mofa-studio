import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '../../../services/mock/workflows';

export default memo(function ParallelNode({ data }: NodeProps) {
  const typeInfo = nodeTypeConfig['parallel'];
  const nodeData = data as { label?: string; config?: any };
  const branches = nodeData?.config?.branches || [];
  return (
    <div className="min-w-[160px] px-4 py-3 rounded-lg border-2 bg-[var(--color-bg-secondary)] border-yellow-500 shadow-sm">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-yellow-500" />
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{nodeData?.label || typeInfo.name}</span>
      </div>
      <div className="space-y-1">
        {branches.map((branch: any, index: number) => (
          <div key={branch.id} className="flex items-center justify-end">
            <span className="text-xs text-[var(--color-text-tertiary)] mr-2">{branch.label || '分支 ' + (index + 1)}</span>
            <Handle type="source" position={Position.Right} id={branch.id} className="!w-2.5 !h-2.5 !bg-yellow-400" />
          </div>
        ))}
        {branches.length === 0 && <div className="text-xs text-[var(--color-text-tertiary)] text-center py-1">点击配置分支</div>}
      </div>
    </div>
  );
});
