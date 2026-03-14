/**
 * Agent 权限配置组件
 */

import { useState, useEffect } from 'react';
import { Shield, Save, RotateCcw, AlertCircle } from 'lucide-react';
import {
  permissionApi,
  featurePermissionDefinitions,
  mockPermissionTemplates,
} from '../../services/mock/permissions';
import { mockSkills } from '../../services/mock/skills';
import { mockPrompts } from '../../services/mock/prompts';
import type { PermissionConfig } from '../../types/permission';

interface PermissionConfigProps {
  agentId: string;
  agentName: string;
  onSave?: () => void;
}

export default function PermissionConfig({ agentId, onSave }: PermissionConfigProps) {
  const [config, setConfig] = useState<PermissionConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<PermissionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPermission();
  }, [agentId]);

  useEffect(() => {
    if (config && originalConfig) {
      setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
    }
  }, [config, originalConfig]);

  const loadPermission = async () => {
    try {
      setLoading(true);
      const data = await permissionApi.getAgentPermission(agentId);
      if (data) {
        setConfig(data);
        setOriginalConfig(JSON.parse(JSON.stringify(data)));
      } else {
        // 默认配置
        const defaultConfig: PermissionConfig = {
          features: {
            webSearch: true,
            webFetch: true,
            codeExec: false,
            fileRead: true,
            fileWrite: false,
            systemCommand: false,
            databaseAccess: false,
          },
          accessibleSkills: [],
          accessiblePrompts: [],
          dataScope: 'self',
          allowSensitiveData: false,
          historyRetentionDays: 30,
        };
        setConfig(defaultConfig);
        setOriginalConfig(JSON.parse(JSON.stringify(defaultConfig)));
      }
    } catch (error) {
      console.error('Failed to load permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await permissionApi.updateAgentPermission(agentId, config);
      setOriginalConfig(JSON.parse(JSON.stringify(config)));
      setHasChanges(false);
      onSave?.();
    } catch (error) {
      console.error('Failed to save permission:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig(JSON.parse(JSON.stringify(originalConfig)));
      setHasChanges(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const newConfig = await permissionApi.applyTemplate(agentId, selectedTemplate);
      setConfig(newConfig);
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  const toggleFeature = (key: keyof PermissionConfig['features']) => {
    if (!config) return;
    setConfig({
      ...config,
      features: {
        ...config.features,
        [key]: !config.features[key],
      },
    });
  };

  const toggleSkill = (skillId: string) => {
    if (!config) return;
    const skills = config.accessibleSkills.includes(skillId)
      ? config.accessibleSkills.filter((id) => id !== skillId)
      : [...config.accessibleSkills, skillId];
    setConfig({ ...config, accessibleSkills: skills });
  };

  const togglePrompt = (promptId: string) => {
    if (!config) return;
    const prompts = config.accessiblePrompts.includes(promptId)
      ? config.accessiblePrompts.filter((id) => id !== promptId)
      : [...config.accessiblePrompts, promptId];
    setConfig({ ...config, accessiblePrompts: prompts });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-[var(--color-text-tertiary)]">加载中...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-[var(--color-text-tertiary)]">无法加载权限配置</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 - 权限模板 */}
      <div className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
          快速应用权限模板
        </h3>
        <div className="flex gap-2">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="flex-1 px-3 py-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]"
          >
            <option value="">选择模板...</option>
            {mockPermissionTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} - {template.description}
              </option>
            ))}
          </select>
          <button
            onClick={handleApplyTemplate}
            disabled={!selectedTemplate}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            应用
          </button>
        </div>
      </div>

      {/* 功能权限 */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
          <Shield className="w-4 h-4" />
          功能权限
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {featurePermissionDefinitions.map((feature) => (
            <label
              key={feature.key}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                config.features[feature.key as keyof typeof config.features]
                  ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30'
                  : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
              }`}
            >
              <input
                type="checkbox"
                checked={config.features[feature.key as keyof typeof config.features]}
                onChange={() => toggleFeature(feature.key as keyof typeof config.features)}
                className="mt-0.5 rounded border-[var(--color-border)]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span>{feature.icon}</span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {feature.label}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                  {feature.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Skills 访问权限 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Skills 访问权限</h3>
        <div className="grid grid-cols-3 gap-2">
          {mockSkills.map((skill) => (
            <label
              key={skill.id}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                config.accessibleSkills.includes(skill.id)
                  ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30'
                  : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
              }`}
            >
              <input
                type="checkbox"
                checked={config.accessibleSkills.includes(skill.id)}
                onChange={() => toggleSkill(skill.id)}
                className="rounded border-[var(--color-border)]"
              />
              <span className="text-sm text-[var(--color-text-primary)]">{skill.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 提示词访问权限 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">提示词访问权限</h3>
        <div className="grid grid-cols-2 gap-2">
          {mockPrompts.map((prompt) => (
            <label
              key={prompt.id}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                config.accessiblePrompts.includes(prompt.id)
                  ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30'
                  : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
              }`}
            >
              <input
                type="checkbox"
                checked={config.accessiblePrompts.includes(prompt.id)}
                onChange={() => togglePrompt(prompt.id)}
                className="rounded border-[var(--color-border)]"
              />
              <span className="text-sm text-[var(--color-text-primary)]">{prompt.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 数据权限 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">数据权限</h3>
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              数据范围
            </label>
            <select
              value={config.dataScope}
              onChange={(e) =>
                setConfig({ ...config, dataScope: e.target.value as typeof config.dataScope })
              }
              className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]"
            >
              <option value="self">仅自己的数据</option>
              <option value="department">部门数据</option>
              <option value="organization">组织数据</option>
            </select>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.allowSensitiveData}
              onChange={(e) =>
                setConfig({ ...config, allowSensitiveData: e.target.checked })
              }
              className="rounded border-[var(--color-border)]"
            />
            <span className="text-sm text-[var(--color-text-primary)]">允许访问敏感数据</span>
          </label>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              历史记录保留天数
            </label>
            <select
              value={config.historyRetentionDays}
              onChange={(e) =>
                setConfig({ ...config, historyRetentionDays: Number(e.target.value) })
              }
              className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)]"
            >
              <option value={7}>7 天</option>
              <option value={14}>14 天</option>
              <option value={30}>30 天</option>
              <option value={60}>60 天</option>
              <option value={90}>90 天</option>
              <option value={180}>180 天</option>
              <option value={365}>365 天</option>
            </select>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
          {hasChanges && (
            <>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span>有未保存的更改</span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex items-center gap-1 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}
