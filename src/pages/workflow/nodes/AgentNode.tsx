import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '../../../services/mock/workflows';

export default memo(function AgentNode({ data }: NodeProps) {
  const typeInfo = nodeTypeConfig['agent'];
  const nodeData = data as { label?: string; config?: { agentName?: string; agentId?: string } };
  const agentName = nodeData?.config?.agentName || nodeData?.config?.agentId;
  return (
    <div className="min-w-[160px] px-4 py-3 rounded-lg border-2 bg-[var(--color-bg-secondary)] border-blue-500 shadow-sm">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-500" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500" />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{nodeData?.label || typeInfo.name}</span>
      </div>
      {agentName && <div className="text-xs text-[var(--color-text-tertiary)] bg-blue-500/10 px-2 py-0.5 rounded">{agentName}</div>}
    </div>
  );
});
