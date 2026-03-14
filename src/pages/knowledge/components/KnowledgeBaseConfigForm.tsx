/**
 * 知识库配置表单组件
 */

import { useState } from 'react';
import { Form, Input, Select, InputNumber, Switch, Divider, Button, Space } from 'antd';
import { knowledgeApi, embeddingModelTypeConfig, vectorStoreTypeConfig } from '../../../services/mock/knowledge';
import type { KnowledgeBase, VectorStoreType, EmbeddingModelType } from '../../../types/knowledge';

interface KnowledgeBaseConfigFormProps {
  knowledgeBase?: KnowledgeBase;
  onSave: (data: Partial<KnowledgeBase>) => void;
  onCancel: () => void;
}

export default function KnowledgeBaseConfigForm({
  knowledgeBase,
  onSave,
  onCancel,
}: KnowledgeBaseConfigFormProps) {
  const [form] = Form.useForm();
  const isEdit = !!knowledgeBase;

  const embeddingModels = Object.entries(embeddingModelTypeConfig).map(([key, value]) => ({
    value: key,
    label: (
      <div className="flex justify-between">
        <span>{value.name}</span>
        <span className="text-xs text-[var(--color-text-tertiary)]">{value.dimensions}d</span>
      </div>
    ),
  }));

  const vectorStores = Object.entries(vectorStoreTypeConfig).map(([key, value]) => ({
    value: key,
    label: (
      <div className="flex items-center gap-2">
        <span>{value.icon}</span>
        <span>{value.name}</span>
        {value.recommended && (
          <span className="text-xs bg-[var(--color-primary)] text-white px-1 rounded">推荐</span>
        )}
      </div>
    ),
  }));

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const embeddingType = values.embeddingModelType as EmbeddingModelType;
      const vectorStoreType = values.vectorStoreType as VectorStoreType;

      const data: Partial<KnowledgeBase> = {
        name: values.name,
        description: values.description,
        config: {
          embeddingModel: {
            type: embeddingType,
            dimensions: embeddingModelTypeConfig[embeddingType]?.dimensions || 1536,
          },
          vectorStore: {
            type: vectorStoreType,
            collection: values.collectionName,
          },
          chunkingStrategy: {
            type: values.chunkingStrategy,
            chunkSize: values.chunkSize,
            chunkOverlap: values.chunkOverlap,
          },
          retrievalConfig: {
            topK: values.topK,
            scoreThreshold: values.scoreThreshold,
            rerankingEnabled: values.rerankingEnabled || false,
            hybridSearchEnabled: values.hybridSearchEnabled || false,
          },
        },
      };

      onSave(data);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        name: knowledgeBase?.name || '',
        description: knowledgeBase?.description || '',
        embeddingModelType: knowledgeBase?.config.embeddingModel.type || 'openai_text_embedding_3_small',
        vectorStoreType: knowledgeBase?.config.vectorStore.type || 'chroma',
        collectionName: knowledgeBase?.config.vectorStore.collection || '',
        chunkingStrategy: knowledgeBase?.config.chunkingStrategy.type || 'semantic',
        chunkSize: knowledgeBase?.config.chunkingStrategy.chunkSize || 500,
        chunkOverlap: knowledgeBase?.config.chunkingStrategy.chunkOverlap || 50,
        topK: knowledgeBase?.config.retrievalConfig.topK || 5,
        scoreThreshold: knowledgeBase?.config.retrievalConfig.scoreThreshold || 0.7,
        rerankingEnabled: knowledgeBase?.config.retrievalConfig.rerankingEnabled || false,
        hybridSearchEnabled: knowledgeBase?.config.retrievalConfig.hybridSearchEnabled || false,
      }}
    >
      {/* 基本信息 */}
      <Form.Item name="name" label="知识库名称" rules={[{ required: true }]}>
        <Input placeholder="请输入知识库名称" />
      </Form.Item>

      <Form.Item name="description" label="描述">
        <Input.TextArea rows={2} placeholder="请输入描述（可选）" />
      </Form.Item>

      <Divider>嵌入模型配置</Divider>

      <Form.Item name="embeddingModelType" label="嵌入模型" rules={[{ required: true }]}>
        <Select options={embeddingModels} placeholder="选择嵌入模型" />
      </Form.Item>

      <Divider>向量数据库配置</Divider>

      <Form.Item name="vectorStoreType" label="向量数据库" rules={[{ required: true }]}>
        <Select options={vectorStores} placeholder="选择向量数据库" />
      </Form.Item>

      <Form.Item name="collectionName" label="集合名称">
        <Input placeholder="向量库集合名称（可选）" />
      </Form.Item>

      <Divider>分片配置</Divider>

      <Form.Item name="chunkingStrategy" label="分片策略" rules={[{ required: true }]}>
        <Select
          options={[
            { value: 'fixed_size', label: '固定大小' },
            { value: 'semantic', label: '语义分片' },
            { value: 'recursive', label: '递归分片' },
          ]}
        />
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item name="chunkSize" label="分片大小" rules={[{ required: true }]}>
          <InputNumber min={100} max={4000} className="w-full" />
        </Form.Item>
        <Form.Item name="chunkOverlap" label="重叠大小" rules={[{ required: true }]}>
          <InputNumber min={0} max={500} className="w-full" />
        </Form.Item>
      </div>

      <Divider>检索配置</Divider>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item name="topK" label="返回数量 (Top K)" rules={[{ required: true }]}>
          <InputNumber min={1} max={20} className="w-full" />
        </Form.Item>
        <Form.Item name="scoreThreshold" label="相似度阈值" rules={[{ required: true }]}>
          <InputNumber min={0} max={1} step={0.05} className="w-full" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item name="hybridSearchEnabled" label="启用混合搜索" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="rerankingEnabled" label="启用重排序" valuePropName="checked">
          <Switch />
        </Form.Item>
      </div>

      <Divider />

      <Form.Item className="mb-0">
        <Space className="w-full justify-end">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            {isEdit ? '保存' : '创建'}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
