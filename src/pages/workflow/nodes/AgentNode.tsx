/**
 * Agent 节点组件
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '../../../services/mock/workflows';
import type { NodeType } from '../../../types/workflow';

export default memo(({ data, selected }: NodeProps) => {
  const typeInfo = nodeTypeConfig['agent' as NodeType];
  const agentName = data.config?.config?.agentName || data.config?.config?.agentId;

  return (
    <div
      className={`
        min-w-[160px] px-4 py-3 rounded-lg border-2
        bg-[var(--color-bg-secondary)]
        ${selected ? 'border-[var(--color-primary)]' : 'border-blue-500'}
        shadow-sm
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500"
      />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {data.label || typeInfo.name}
        </span>
      </div>

      {agentName && (
        <div className="text-xs text-[var(--color-text-tertiary)] bg-blue-500/10 px-2 py-0.5 rounded">
          {agentName}
        </div>
      )}
    </div>
  );
});
