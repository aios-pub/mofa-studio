import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { nodeTypeConfig } from '../../../services/mock/workflows';

const methodColors: Record<string, string> = {
  GET: 'text-green-500',
  POST: 'text-blue-500',
  PUT: 'text-orange-500',
  DELETE: 'text-red-500',
};

export default memo(function HttpRequestNode({ data }: NodeProps) {
  const typeInfo = nodeTypeConfig['http_request'];
  const nodeData = data as { label?: string; config?: any };
  const method = nodeData?.config?.method || 'GET';
  const url = nodeData?.config?.url;
  return (
    <div className="min-w-[160px] px-4 py-3 rounded-lg border-2 bg-[var(--color-bg-secondary)] border-indigo-500 shadow-sm">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-indigo-500" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-indigo-500" />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{nodeData?.label || typeInfo.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={'text-xs font-mono font-bold ' + (methodColors[method] || '')}>{method}</span>
        {url && <span className="text-xs text-[var(--color-text-tertiary)] truncate max-w-[100px]">{url.replace(/^https?:\/\//, '')}</span>}
      </div>
    </div>
  );
});
