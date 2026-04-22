/**
 * Provider 配置表单组件
 * 根据厂商类型动态生成配置字段
 */

import React, { useState, useEffect } from 'react';
import { Input, InputNumber, Select, Switch, Collapse, Alert } from 'antd';
import {
  KeyOutlined,
  LinkOutlined,
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import type { ProviderConfig, ConfigField, CreateProviderFormData } from '../../../types/provider';

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

  // 初始化默认值（仅在字段为空时设置）
  useEffect(() => {
    const initialData: Partial<CreateProviderFormData> = {};

    // 仅在 name 为空时设置默认值
    if (!formData.name) {
      initialData.name = config.name;
    }
    // 仅在 baseUrl 为空时设置默认值
    if (!formData.baseUrl) {
      initialData.baseUrl = config.api.defaultBaseUrl;
    }
    if (!formData.selectedModels) {
      initialData.selectedModels = [];
    }

    // 设置配置字段默认值
    config.configFields.forEach(field => {
      if (field.defaultValue !== undefined && formData.config?.[field.key] === undefined) {
        initialData.config = {
          ...initialData.config,
          [field.key]: field.defaultValue,
        };
      }
    });

    if (Object.keys(initialData).length > 0) {
      onChange(initialData);
    }
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
          title={config.description}
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

export default ProviderConfigForm;
