/**
 * 模型选择步骤组件
 * 用于创建 Provider 后选择要启用的模型
 * 支持模糊搜索、全选/取消全选、添加自定义模型
 */

import React, { useState, useMemo } from 'react';
import { Input, Checkbox, Tag, Button, Modal, message } from 'antd';
import { SearchOutlined, ThunderboltOutlined, PlusOutlined } from '@ant-design/icons';
import { fuzzyMatch } from '../../../utils/fuzzySearch';

export interface SelectableModel {
  id: string;
  name: string;
  isCustom?: boolean;
}

interface ModelSelectionStepProps {
  availableModels: SelectableModel[];
  selectedIds: Set<string>;
  onToggle: (modelId: string) => void;
  onToggleAll: (selectAll: boolean) => void;
  onAddCustomModel?: (model: SelectableModel) => void;
}

export const ModelSelectionStep: React.FC<ModelSelectionStepProps> = ({
  availableModels,
  selectedIds,
  onToggle,
  onToggleAll,
  onAddCustomModel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customModelId, setCustomModelId] = useState('');

  const filteredModels = useMemo(
    () =>
      availableModels.filter((m) =>
        fuzzyMatch(searchQuery, m.name) || fuzzyMatch(searchQuery, m.id),
      ),
    [availableModels, searchQuery],
  );

  const allFilteredSelected =
    filteredModels.length > 0 &&
    filteredModels.every((m) => selectedIds.has(m.id));

  const handleAddCustom = () => {
    const id = customModelId.trim();
    if (!id) return;
    if (availableModels.some(m => m.id === id)) {
      message.warning('该模型 ID 已存在');
      return;
    }
    onAddCustomModel?.({ id, name: id, isCustom: true });
    setCustomModelId('');
    setShowAddCustom(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 搜索栏 */}
      <div className="flex items-center gap-3 mb-3">
        <Input
          placeholder="搜索模型名称或 ID..."
          prefix={<SearchOutlined className="text-[var(--color-text-tertiary)]" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          className="flex-1"
        />
        <span className="text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">
          已选 {selectedIds.size} / {availableModels.length} 个模型
        </span>
      </div>

      {/* 全选控制 */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--color-border)]">
        <Checkbox
          checked={allFilteredSelected}
          indeterminate={
            filteredModels.some((m) => selectedIds.has(m.id)) &&
            !allFilteredSelected
          }
          onChange={(e) => onToggleAll(e.target.checked)}
        >
          <span className="text-sm text-[var(--color-text-secondary)]">
            {allFilteredSelected ? '取消全选' : '全选当前'}
          </span>
        </Checkbox>
        <Tag color="blue" className="text-xs m-0">
          {filteredModels.length} 个结果
        </Tag>
        {onAddCustomModel && (
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setShowAddCustom(true)}
            className="ml-auto"
          >
            添加自定义模型
          </Button>
        )}
      </div>

      {/* 模型列表 */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {filteredModels.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-tertiary)]">
            <ThunderboltOutlined className="text-2xl mb-2 opacity-50" />
            <p>{searchQuery ? '未找到匹配的模型' : '暂无可用模型'}</p>
          </div>
        ) : (
          filteredModels.map((model) => {
            const checked = selectedIds.has(model.id);
            return (
              <div
                key={model.id}
                onClick={() => onToggle(model.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  checked
                    ? 'border border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border border-transparent hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                <Checkbox
                  checked={checked}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggle(model.id);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-[var(--color-text-primary)] text-sm">
                    {model.name}
                  </span>
                  {model.isCustom && (
                    <Tag color="orange" className="text-xs m-0 ml-2">自定义</Tag>
                  )}
                </div>
                <code className="text-xs px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-tertiary)] max-w-[200px] truncate">
                  {model.id}
                </code>
              </div>
            );
          })
        )}
      </div>

      {/* 添加自定义模型弹窗 */}
      <Modal
        title="添加自定义模型"
        open={showAddCustom}
        onCancel={() => {
          setShowAddCustom(false);
          setCustomModelId('');
        }}
        onOk={handleAddCustom}
        okText="添加"
        cancelText="取消"
        okButtonProps={{ disabled: !customModelId.trim() }}
      >
        <div className="py-2">
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
            模型 ID <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="例如: gpt-4-custom"
            value={customModelId}
            onChange={(e) => setCustomModelId(e.target.value)}
          />
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            调用 API 时使用的模型标识符
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ModelSelectionStep;
