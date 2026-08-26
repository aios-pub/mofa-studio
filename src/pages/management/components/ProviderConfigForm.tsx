import { useTranslation } from "react-i18next";
/**
 * Provider configuration form component
 * Dynamically generate configuration fields by vendor type
 */

import React, { useState, useEffect } from "react";
import { Input, InputNumber, Select, Switch, Collapse, Alert } from "antd";
import {
  KeyOutlined,
  LinkOutlined,
  SettingOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import type {
  ProviderConfig,
  ConfigField,
  CreateProviderFormData,
} from "../../../types/provider";

interface ProviderConfigFormProps {
  config: ProviderConfig;
  formData: CreateProviderFormData;
  onChange: (data: Partial<CreateProviderFormData>) => void;
}

export const ProviderConfigForm: React.FC<ProviderConfigFormProps> = ({
  config,
  formData,
  onChange,
}) => {  const { t } = useTranslation();

  const [showApiKey, setShowApiKey] = useState(false);

  // Initialize defaults (only when fields are empty)
  useEffect(() => {
    const initialData: Partial<CreateProviderFormData> = {};

    // Set default only when name is empty
    if (!formData.name) {
      initialData.name = config.name;
    }
    // Set default only when baseUrl is empty
    if (!formData.baseUrl) {
      initialData.baseUrl = config.api.defaultBaseUrl;
    }
    if (!formData.selectedModels) {
      initialData.selectedModels = [];
    }

    // Set configuration field defaults
    config.configFields.forEach((field) => {
      if (
        field.defaultValue !== undefined &&
        formData.config?.[field.key] === undefined
      ) {
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

  // Render configuration fields
  const renderConfigField = (field: ConfigField) => {
    const value = formData.config?.[field.key] ?? field.defaultValue ?? "";

    const handleChange = (val: string | number) => {
      onChange({
        config: {
          ...formData.config,
          [field.key]: val,
        },
      });
    };

    switch (field.type) {
      case "text":
        return (
          <Input
            placeholder={field.placeholder}
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case "password":
        return (
          <Input.Password
            placeholder={field.placeholder}
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case "url":
        return (
          <Input
            prefix={
              <LinkOutlined className="text-[var(--color-text-tertiary)]" />
            }
            placeholder={field.placeholder}
            value={value as string}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      case "number":
        return (
          <InputNumber
            className="w-full"
            placeholder={field.placeholder}
            value={value as number}
            onChange={(val) => handleChange(val ?? 0)}
          />
        );
      case "select":
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
      {/* Basic information */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4">
        <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          {config.name}
        </h4>

        {/* Provider name */}
        <div className="mb-3">
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
            名称 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder={t("输入 Provider 名称")}
            value={formData.name || ""}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        {/* Description */}
        <Alert
          title={config.description}
          type="info"
          showIcon
          className="mb-3"
        />

        {/* Link */}
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

      {/* API configuration */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4">
        <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <KeyOutlined />
          API 配置
        </h4>

        {/* API Key */}
        {config.api.authType !== "none" && (
          <div className="mb-3">
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
              API Key <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder={config.api.apiKeyPlaceholder || "输入 API Key"}
                prefix={
                  config.api.apiKeyPrefix ? (
                    <span className="text-[var(--color-text-tertiary)]">
                      {config.api.apiKeyPrefix}
                    </span>
                  ) : undefined
                }
                value={formData.apiKey || ""}
                onChange={(e) => onChange({ apiKey: e.target.value })}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 border border-(--color-border) rounded-lg hover:bg-(--color-bg-tertiary)"
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
            prefix={
              <LinkOutlined className="text-[var(--color-text-tertiary)]" />
            }
            placeholder={t("API 基础地址")}
            value={formData.baseUrl || ""}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
          />
          {config.api.defaultBaseUrl && (
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              默认: {config.api.defaultBaseUrl}
            </p>
          )}
        </div>

        {/* Vendor-specific configuration fields */}
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

      {/* Advanced configuration (collapsible) */}
      <Collapse
        ghost
        items={[
          {
            key: "advanced",
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
                    <span className="text-sm text-[var(--color-text-primary)]">
                      启用流式输出
                    </span>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      实时返回生成内容
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-[var(--color-text-primary)]">
                      自动重试
                    </span>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      请求失败时自动重试
                    </p>
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
