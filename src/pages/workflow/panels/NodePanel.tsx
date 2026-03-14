/**
 * 节点面板 - 左侧节点库面板
 */

import { useState } from 'react';
import { Input, Collapse, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { workflowApi, nodeTypeConfig } from '../../../services/mock/workflows';
import type { NodeType } from '../../../types/workflow';

import type { Node } from '@xyflow/react';

interface NodePanelProps {
  onAddNode: (type: NodeType) => void;
}

// 节点分类
const nodeCategories = [
  {
    key: 'trigger',
    label: '触发器',
    types: ['start', 'webhook', 'schedule'] as NodeType[],
  },
  {
    key: 'action',
    label: '动作',
    types: ['agent', 'prompt', 'skill', 'http_request'] as NodeType[],
  },
  {
    key: 'logic',
    label: '逻辑',
    types: ['condition', 'loop', 'parallel', 'delay'] as NodeType[],
  },
  {
    key: 'transform',
    label: '转换',
    types: ['transform', 'variable', 'end'] as NodeType[],
  },
];

export default function NodePanel({ onAddNode }: NodePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤节点类型
  const filteredCategories = nodeCategories.map((category) => ({
    ...category,
    types: category.types.filter((type) => {
      const config = nodeTypeConfig[type];
      return (
        config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        config.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }),
  })).filter((category) => category.types.length > 0);

  return (
    <div className="w-64 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
      {/* 搜索 */}
      <div className="p-3 border-b border-[var(--color-border)]">
        <Input
          placeholder="搜索节点..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          size="small"
        />
      </div>

      {/* 节点列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        <Collapse
          defaultActiveKey={nodeCategories.map((c) => c.key)}
          ghost
          expandIconPosition="end"
          items={filteredCategories.map((category) => ({
            key: category.key,
            label: <span className="font-medium">{category.label}</span>,
            children: (
              <div className="space-y-1">
                {category.types.map((type) => {
                  const config = nodeTypeConfig[type];
                  return (
                    <div
                      key={type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/reactflow', type);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={() => onAddNode(type)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] cursor-pointer transition-colors group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-[var(--color-text-primary)]">
                          {config.name}
                        </div>
                        <div className="text-xs text-[var(--color-text-tertiary)] truncate">
                          {config.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ),
          }))}
        />
      </div>
    </div>
  );
}
