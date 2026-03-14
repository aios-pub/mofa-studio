/**
 * HTTP 请求节点组件
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '../../../services/mock/workflows';
import type { NodeType } from '../../../types/workflow';

export default memo(({ data, selected }: NodeProps) => {
  const typeInfo = nodeTypeConfig['http_request' as NodeType];
  const method = data.config?.config?.method || 'GET';
  const url = data.config?.config?.url;

  const methodColors: Record<string, string> = {
    GET: 'text-green-500',
    POST: 'text-blue-500',
    PUT: 'text-orange-500',
    DELETE: 'text-red-500',
  };

  return (
    <div
      className={`
        min-w-[160px] px-4 py-3 rounded-lg border-2
        bg-[var(--color-bg-secondary)]
        ${selected ? 'border-[var(--color-primary)]' : 'border-indigo-500'}
        shadow-sm
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-500"
      />

      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {data.label || typeInfo.name}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono font-bold ${methodColors[method]}`}>
          {method}
        </span>
        {url && (
          <span className="text-xs text-[var(--color-text-tertiary)] truncate max-w-[100px]">
            {url.replace(/^https?:\/\//, '')}
          </span>
        )}
      </div>
    </div>
  );
});
