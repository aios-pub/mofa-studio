/**
 * 嵌入模型选择组件
 */

import { Select, Tag, Tooltip } from 'antd';
import { knowledgeApi, embeddingModelTypeConfig } from '../../../services/mock/knowledge';
import type { EmbeddingModelType } from '../../../types/knowledge';

interface EmbeddingModelSelectProps {
  value?: EmbeddingModelType;
  onChange?: (value: EmbeddingModelType) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function EmbeddingModelSelect({
  value,
  onChange,
  placeholder = '选择嵌入模型',
  disabled,
}: EmbeddingModelSelectProps) {
  const models = Object.entries(embeddingModelTypeConfig).map(([key, config]) => ({
    value: key,
    label: (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{config.name}</span>
          {key === 'openai_text_embedding_3_small' && (
            <Tag color="blue" className="text-xs">推荐</Tag>
          )}
        </div>
        <span className="text-xs text-[var(--color-text-tertiary)]">{config.dimensions}d</span>
      </div>
    ),
  }));

  const selectedModel = value ? embeddingModelTypeConfig[value] : null;

  return (
    <div className="space-y-2">
      <Select
        value={value}
        onChange={onChange}
        options={models}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
      />
      {selectedModel && (
        <div className="text-xs text-[var(--color-text-tertiary)] space-y-1">
          <div>{selectedModel.description}</div>
          <div className="flex gap-4">
            <span>维度: {selectedModel.dimensions}</span>
            <span>最大Token: {selectedModel.maxTokens.toLocaleString()}</span>
            {selectedModel.pricing && (
              <span>
                价格: ${selectedModel.pricing.per1kTokens}/1K tokens
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
