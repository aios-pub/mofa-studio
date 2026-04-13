/**
 * Provider 配置表单组件
 * 根据厂商类型动态生成配置字段
 */

import React, { useState, useEffect } from 'react';
import { Input, InputNumber, Select, Switch, Collapse, Tag, Checkbox, Alert, Button, Modal } from 'antd';
import {
  KeyOutlined,
  LinkOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ProviderConfig, ConfigField, ProviderModel, CreateProviderFormData } from '../../../types/provider';

interface ProviderConfigFormProps {
  config: ProviderConfig;
  formData: CreateProviderFormData;
  onChange: (data: Partial<CreateProviderFormData>) => void;
}

export const ProviderConfigForm: React.FC<ProviderConfigFormProps> = ({
  config,
  formData,
  onChange,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModel, setNewModel] = useState({ id: '', name: '', maxTokens: 4096, inputPrice: 0, outputPrice: 0 });

  // 初始化默认值
  useEffect(() => {
    const initialData: Partial<CreateProviderFormData> = {
      name: config.name,
      baseUrl: config.api.defaultBaseUrl,
      selectedModels: config.defaultModels.map(m => m.id),
    };

    // 设置配置字段默认值
    config.configFields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData.config = {
          ...initialData.config,
          [field.key]: field.defaultValue,
        };
      }
    });

    onChange(initialData);
  }, [config.type]);

  // 渲染配置字段
  const renderConfigField = (field: ConfigField) => {
    const value = formData.config?.[field.key] ?? field.defaultValue ?? '';

    const handleChange = (val: string | number) => {
      onChange({
        config: {
          ...formData.config,
          [field.key]: val,
        },
      });
    };

    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder}
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case 'password':
        return (
          <Input.Password
            placeholder={field.placeholder}
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case 'url':
        return (
          <Input
            prefix={<LinkOutlined className="text-[var(--color-text-tertiary)]" />}
            placeholder={field.placeholder}
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case 'number':
        return (
          <InputNumber
            className="w-full"
            placeholder={field.placeholder}
            value={value as number}
            onChange={(val) => handleChange(val ?? 0)}
          />
        );
      case 'select':
        return (
          <Select
            className="w-full"
            value={value as string}
            onChange={handleChange}
            options={field.options}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* 基本信息 */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
        <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          {config.name}
        </h4>

        {/* Provider 名称 */}
        <div className="mb-3">
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
            名称 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="输入 Provider 名称"
            value={formData.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        {/* 描述信息 */}
        <Alert
          message={config.description}
          type="info"
          showIcon
          className="mb-3"
        />

        {/* 链接 */}
        {(config.website || config.docs) && (
          <div className="flex gap-3 text-xs">
            {config.website && (
              <a
                href={config.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:underline"
              >
                官网
              </a>
            )}
            {config.docs && (
              <a
                href={config.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:underline"
              >
                文档
              </a>
            )}
          </div>
        )}
      </div>

      {/* API 配置 */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
        <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <KeyOutlined />
          API 配置
        </h4>

        {/* API Key */}
        {config.api.authType !== 'none' && (
          <div className="mb-3">
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              API Key <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder={config.api.apiKeyPlaceholder || '输入 API Key'}
                prefix={config.api.apiKeyPrefix ? <span className="text-[var(--color-text-tertiary)]">{config.api.apiKeyPrefix}</span> : undefined}
                value={formData.apiKey || ''}
                onChange={(e) => onChange({ apiKey: e.target.value })}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)]"
              >
                {showApiKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </button>
            </div>
          </div>
        )}

        {/* Base URL */}
        <div className="mb-3">
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
            Base URL
          </label>
          <Input
            prefix={<LinkOutlined className="text-[var(--color-text-tertiary)]" />}
            placeholder="API 基础地址"
            value={formData.baseUrl || ''}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
          />
          {config.api.defaultBaseUrl && (
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              默认: {config.api.defaultBaseUrl}
            </p>
          )}
        </div>

        {/* 厂商特定配置字段 */}
        {config.configFields.map((field) => (
          <div key={field.key} className="mb-3">
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </label>
            {renderConfigField(field)}
            {field.description && (
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                {field.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 模型选择 */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
        <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <ThunderboltOutlined />
          模型选择
          <span className="text-xs text-[var(--color-text-tertiary)] font-normal ml-auto">
            {formData.selectedModels?.length || 0} / {(config.defaultModels.length + (formData.customModels?.length || 0))} 个已选
          </span>
        </h4>

        {/* 全选/取消全选 */}
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const allIds = [...config.defaultModels, ...(formData.customModels || [])].map(m => m.id);
              const allSelected = formData.selectedModels?.length === allIds.length;
              onChange({
                selectedModels: allSelected ? [] : allIds,
              });
            }}
            className="text-xs text-[var(--color-primary)] hover:underline"
          >
            {formData.selectedModels?.length === (config.defaultModels.length + (formData.customModels?.length || 0)) ? '取消全选' : '全选'}
          </button>
        </div>

        {/* 默认模型列表 */}
        <div className="space-y-2">
          {config.defaultModels.map((model) => (
            <ModelItem
              key={model.id}
              model={model}
              checked={formData.selectedModels?.includes(model.id) ?? false}
              onChange={(checked) => {
                const currentSelected = formData.selectedModels || [];
                onChange({
                  selectedModels: checked
                    ? [...currentSelected, model.id]
                    : currentSelected.filter(id => id !== model.id),
                });
              }}
            />
          ))}
        </div>

        {/* 自定义模型 */}
        {formData.customModels && formData.customModels.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-[var(--color-text-secondary)] mb-2">自定义模型</div>
            <div className="space-y-2">
              {formData.customModels.map((model) => (
                <ModelItem
                  key={model.id}
                  model={model}
                  checked={formData.selectedModels?.includes(model.id) ?? false}
                  custom
                  onDelete={() => {
                    const updatedCustomModels = formData.customModels?.filter(m => m.id !== model.id) || [];
                    onChange({
                      customModels: updatedCustomModels,
                      selectedModels: formData.selectedModels?.filter(id => id !== model.id),
                    });
                  }}
                  onChange={(checked) => {
                    const currentSelected = formData.selectedModels || [];
                    onChange({
                      selectedModels: checked
                        ? [...currentSelected, model.id]
                        : currentSelected.filter(id => id !== model.id),
                    });
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 添加自定义模型按钮 */}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          className="w-full mt-3"
          onClick={() => {
            setNewModel({ id: '', name: '', maxTokens: 4096, inputPrice: 0, outputPrice: 0 });
            setShowAddModel(true);
          }}
        >
          添加自定义模型
        </Button>
      </div>

      {/* 添加自定义模型弹窗 */}
      <Modal
        title="添加自定义模型"
        open={showAddModel}
        onCancel={() => setShowAddModel(false)}
        onOk={() => {
          if (!newModel.id.trim() || !newModel.name.trim()) return;
          const customModel: ProviderModel = {
            id: newModel.id.trim(),
            name: newModel.name.trim(),
            maxTokens: newModel.maxTokens,
            pricing: { input: newModel.inputPrice, output: newModel.outputPrice },
            enabled: true,
          };
          const currentCustomModels = formData.customModels || [];
          // 避免重复 id
          if (currentCustomModels.some(m => m.id === customModel.id) || config.defaultModels.some(m => m.id === customModel.id)) {
            return;
          }
          const updatedCustomModels = [...currentCustomModels, customModel];
          onChange({
            customModels: updatedCustomModels,
            selectedModels: [...(formData.selectedModels || []), customModel.id],
          });
          setShowAddModel(false);
        }}
        okText="添加"
        cancelText="取消"
        okButtonProps={{ disabled: !newModel.id.trim() || !newModel.name.trim() }}
      >
        <div className="space-y-3 py-2">
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              模型 ID <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="例如: gpt-4-custom"
              value={newModel.id}
              onChange={(e) => setNewModel(prev => ({ ...prev, id: e.target.value }))}
            />
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              调用 API 时使用的模型标识符
            </p>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              显示名称 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="例如: GPT-4 Custom"
              value={newModel.name}
              onChange={(e) => setNewModel(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              最大 Tokens <span className="text-red-500">*</span>
            </label>
            <InputNumber
              className="w-full"
              min={1}
              max={2000000}
              placeholder="输入最大 Tokens 数"
              value={newModel.maxTokens}
              onChange={(val) => setNewModel(prev => ({ ...prev, maxTokens: val ?? 4096 }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                输入价格 ($/1K tokens)
              </label>
              <InputNumber
                className="w-full"
                min={0}
                step={0.0001}
                precision={4}
                placeholder="0.0000"
                value={newModel.inputPrice}
                onChange={(val) => setNewModel(prev => ({ ...prev, inputPrice: val ?? 0 }))}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                输出价格 ($/1K tokens)
              </label>
              <InputNumber
                className="w-full"
                min={0}
                step={0.0001}
                precision={4}
                placeholder="0.0000"
                value={newModel.outputPrice}
                onChange={(val) => setNewModel(prev => ({ ...prev, outputPrice: val ?? 0 }))}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 高级配置（可折叠） */}
      <Collapse
        ghost
        items={[
          {
            key: 'advanced',
            label: (
              <span className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
                <SettingOutlined />
                高级配置
              </span>
            ),
            children: (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-[var(--color-text-primary)]">启用流式输出</span>
                    <p className="text-xs text-[var(--color-text-tertiary)]">实时返回生成内容</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-[var(--color-text-primary)]">自动重试</span>
                    <p className="text-xs text-[var(--color-text-tertiary)]">请求失败时自动重试</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                    超时时间（秒）
                  </label>
                  <InputNumber
                    className="w-full"
                    min={5}
                    max={300}
                    defaultValue={60}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                    最大重试次数
                  </label>
                  <InputNumber
                    className="w-full"
                    min={0}
                    max={10}
                    defaultValue={3}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

// 模型项组件
interface ModelItemProps {
  model: ProviderModel;
  checked: boolean;
  onChange: (checked: boolean) => void;
  custom?: boolean;
  onDelete?: () => void;
}

const ModelItem: React.FC<ModelItemProps> = ({ model, checked, onChange, custom, onDelete }) => {
  const formatPrice = (price: number) => {
    if (price === 0) return '免费';
    return `$${price.toFixed(4)}/1K`;
  };

  return (
    <div
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        checked
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/30'
      }`}
    >
      <Checkbox
        checked={checked}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.checked);
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--color-text-primary)]">
            {model.name}
          </span>
          <code className="text-xs px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-tertiary)]">
            {model.id}
          </code>
          {custom && <Tag color="orange" className="text-xs m-0">自定义</Tag>}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-tertiary)]">
          <span>最大 {model.maxTokens.toLocaleString()} tokens</span>
          <span>•</span>
          <span>输入: {formatPrice(model.pricing.input)}</span>
          <span>•</span>
          <span>输出: {formatPrice(model.pricing.output)}</span>
        </div>
        {/* 能力标签 */}
        {model.capabilities && (
          <div className="flex gap-1 mt-1.5">
            {model.capabilities.vision && (
              <Tag color="blue" className="text-xs m-0">Vision</Tag>
            )}
            {model.capabilities.functionCalling && (
              <Tag color="green" className="text-xs m-0">Function Calling</Tag>
            )}
            {model.capabilities.streaming && (
              <Tag color="purple" className="text-xs m-0">Streaming</Tag>
            )}
          </div>
        )}
      </div>
      {custom && onDelete && (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        />
      )}
    </div>
  );
};

export default ProviderConfigForm;
