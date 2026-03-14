/**
 * 向量库配置组件
 */

import { useState } from 'react';
import { Select, Input, InputNumber, Tag, Divider } from 'antd';
import { knowledgeApi, vectorStoreTypeConfig } from '../../../services/mock/knowledge';
import type { VectorStoreType, VectorStoreConfig } from '../../../types/knowledge';

interface VectorStoreConfigProps {
  value?: VectorStoreConfig;
  onChange?: (config: VectorStoreConfig) => void;
}

export default function VectorStoreConfigComponent({ value, onChange }: VectorStoreConfigProps) {
  const [selectedType, setSelectedType] = useState<VectorStoreType>(value?.type || 'chroma');

  const vectorStores = Object.entries(vectorStoreTypeConfig).map(([key, config]) => ({
    value: key,
    label: (
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.icon}</span>
        <div>
          <div className="font-medium">{config.name}</div>
          <div className="text-xs text-[var(--color-text-tertiary)]">{config.description}</div>
        </div>
        {config.recommended && (
          <Tag color="green" className="ml-auto">推荐</Tag>
        )}
      </div>
    ),
  }));

  const selectedConfig = vectorStoreTypeConfig[selectedType];

  const handleTypeChange = (type: VectorStoreType) => {
    setSelectedType(type);
    const newConfig: VectorStoreConfig = { type };
    onChange?.(newConfig);
  };

  const handleConfigChange = (field: string, val: any) => {
    onChange?.({
      ...value,
      type: selectedType,
      [field]: val,
    });
  };

  return (
    <div className="space-y-4">
      {/* 类型选择 */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          向量数据库类型
        </label>
        <Select
          value={selectedType}
          onChange={handleTypeChange}
          options={vectorStores}
          className="w-full"
        />
      </div>

      {/* 特性标签 */}
      {selectedConfig && (
        <div className="flex flex-wrap gap-1">
          {selectedConfig.features.map((feature) => (
            <Tag key={feature} color="default">{feature}</Tag>
          ))}
        </div>
      )}

      <Divider className="my-3" />

      {/* 根据类型显示不同配置 */}
      {selectedType === 'chroma' && (
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            集合名称
          </label>
          <Input
            value={value?.collection}
            onChange={(e) => handleConfigChange('collection', e.target.value)}
            placeholder="my_collection"
          />
        </div>
      )}

      {selectedType === 'pinecone' && (
        <>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              索引名称
            </label>
            <Input
              value={value?.indexName}
              onChange={(e) => handleConfigChange('indexName', e.target.value)}
              placeholder="my-index"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              环境
            </label>
            <Input
              value={value?.environment}
              onChange={(e) => handleConfigChange('environment', e.target.value)}
              placeholder="production"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              API Key
            </label>
            <Input.Password
              value={value?.apiKey}
              onChange={(e) => handleConfigChange('apiKey', e.target.value)}
              placeholder="Pinecone API Key"
            />
          </div>
        </>
      )}

      {selectedType === 'weaviate' && (
        <>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              集合名称
            </label>
            <Input
              value={value?.collection}
              onChange={(e) => handleConfigChange('collection', e.target.value)}
              placeholder="MyCollection"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              连接地址
            </label>
            <Input
              value={value?.host}
              onChange={(e) => handleConfigChange('host', e.target.value)}
              placeholder="https://your-cluster.weaviate.network"
            />
          </div>
        </>
      )}

      {selectedType === 'milvus' && (
        <>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              连接地址
            </label>
            <Input
              value={value?.host}
              onChange={(e) => handleConfigChange('host', e.target.value)}
              placeholder="localhost"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              端口
            </label>
            <InputNumber
              value={value?.port}
              onChange={(val) => handleConfigChange('port', val)}
              min={1}
              max={65535}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              数据库名
            </label>
            <Input
              value={value?.database}
              onChange={(e) => handleConfigChange('database', e.target.value)}
              placeholder="default"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              集合名称
            </label>
            <Input
              value={value?.collection}
              onChange={(e) => handleConfigChange('collection', e.target.value)}
              placeholder="my_collection"
            />
          </div>
        </>
      )}

      {selectedType === 'qdrant' && (
        <>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              连接地址
            </label>
            <Input
              value={value?.host}
              onChange={(e) => handleConfigChange('host', e.target.value)}
              placeholder="http://localhost:6333"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              集合名称
            </label>
            <Input
              value={value?.collection}
              onChange={(e) => handleConfigChange('collection', e.target.value)}
              placeholder="my_collection"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              API Key
            </label>
            <Input.Password
              value={value?.apiKey}
              onChange={(e) => handleConfigChange('apiKey', e.target.value)}
              placeholder="Qdrant API Key (可选)"
            />
          </div>
        </>
      )}

      {selectedType === 'pgvector' && (
        <>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              连接字符串
            </label>
            <Input.Password
              value={value?.connectionString}
              onChange={(e) => handleConfigChange('connectionString', e.target.value)}
              placeholder="postgresql://user:password@localhost:5432/vectordb"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              表名称
            </label>
            <Input
              value={value?.collection}
              onChange={(e) => handleConfigChange('collection', e.target.value)}
              placeholder="embeddings"
            />
          </div>
        </>
      )}
    </div>
  );
}
