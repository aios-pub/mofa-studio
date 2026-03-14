/**
 * 开始节点组件
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '../../../services/mock/workflows';
import type { NodeType } from '../../../types/workflow';

export default memo(({ data, selected }: NodeProps) => {
  const typeInfo = nodeTypeConfig['start' as NodeType];

  return (
    <div
      className={`
        min-w-[120px] px-4 py-2 rounded-lg border-2
        bg-[var(--color-bg-secondary)]
        ${selected ? 'border-[var(--color-primary)]' : 'border-green-500'}
        shadow-sm
      `}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-green-500"
      />

      <div className="flex items-center gap-2">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {data.label || typeInfo.name}
        </span>
      </div>
    </div>
  );
});
