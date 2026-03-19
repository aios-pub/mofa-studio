import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '@/services';

export default memo(function VariableNode({ data }: NodeProps) {
  const typeInfo = nodeTypeConfig['variable'];
  const nodeData = data as { label?: string; config?: any };
  const variables = nodeData?.config?.variables || [];
  return (
    <div className="min-w-[140px] px-4 py-3 rounded-lg border-2 bg-[var(--color-bg-secondary)] border-purple-500 shadow-sm">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-purple-500" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-purple-500" />
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{nodeData?.label || typeInfo.name}</span>
      </div>
      <div className="space-y-1">
        {variables.slice(0, 3).map((v: any, index: number) => (
          <div key={index} className="text-xs text-[var(--color-text-tertiary)] font-mono truncate">{v.name}</div>
        ))}
        {variables.length > 3 && <div className="text-xs text-[var(--color-text-tertiary)]">+{variables.length - 3} more</div>}
        {variables.length === 0 && <div className="text-xs text-[var(--color-text-tertiary)]">点击配置变量</div>}
      </div>
    </div>
  );
});
