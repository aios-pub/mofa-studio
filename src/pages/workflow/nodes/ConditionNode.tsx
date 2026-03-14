/**
 * 条件节点组件
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '../../../services/mock/workflows';
import type { NodeType } from '../../../types/workflow';

export default memo(({ data, selected }: NodeProps) => {
  const typeInfo = nodeTypeConfig['condition' as NodeType];
  const branches = data.config?.config?.branches || [];

  return (
    <div
      className={`
        min-w-[160px] px-4 py-3 rounded-lg border-2
        bg-[var(--color-bg-secondary)]
        ${selected ? 'border-[var(--color-primary)]' : 'border-cyan-500'}
        shadow-sm
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-cyan-500"
      />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {data.label || typeInfo.name}
        </span>
      </div>

      {/* 分支输出 */}
      <div className="space-y-1">
        {branches.map((branch: any) => (
          <div key={branch.id} className="flex items-center justify-end">
            <span className="text-xs text-[var(--color-text-tertiary)] mr-2">
              {branch.label}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={branch.id}
              className="!w-2.5 !h-2.5 !bg-cyan-400 !relative"
              style={{ top: 'auto', transform: 'none' }}
            />
          </div>
        ))}
        {/* 默认分支 */}
        <div className="flex items-center justify-end">
          <span className="text-xs text-[var(--color-text-tertiary)] mr-2">默认</span>
          <Handle
            type="source"
            position={Position.Right}
            id="default"
            className="!w-2.5 !h-2.5 !bg-gray-400 !relative"
            style={{ top: 'auto', transform: 'none' }}
          />
        </div>
      </div>
    </div>
  );
});
