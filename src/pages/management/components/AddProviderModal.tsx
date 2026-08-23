/**
 * 新增 Provider 弹窗组件
 * 步骤式流程：选择厂商 -> 配置信息 -> 模型选择 -> 完成确认
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Button, Steps, Result, Alert } from 'antd';
import type { ProviderConfig, ProviderType, CreateProviderFormData } from '../../../types/provider';
import type { ExternalModel } from '../../../services/real/providers';
import { ProviderTypeSelector } from './ProviderTypeSelector';
import { ProviderConfigForm } from './ProviderConfigForm';
import { ModelSelectionStep } from './ModelSelectionStep';
import { getProviderConfig } from '../../../services/provider/providerConfigs';
import { providerApi } from '@/services';

interface AddProviderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProviderFormData) => Promise<ProviderWithModels | void>;
  /** 传入 Provider 时进入编辑模式 */
  provider?: {
    id: string;
    name: string;
    type: string;
    apiKey?: string;
    baseUrl?: string;
    models: { id: string; name: string; enabled: boolean }[];
  } | null;
  onEdit?: (id: string, data: CreateProviderFormData) => Promise<void>;
}

/** 创建 Provider 后返回的结构（含可用模型列表） */
export interface ProviderWithModels {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  apiKey?: string;
  availableModels?: ExternalModel[];
  models: { id: string; name: string; enabled: boolean; pricing: { input: number; output: number }; maxTokens: number }[];
}

// 步骤定义
type StepKey = 'select' | 'config' | 'select_models' | 'complete';

const steps: { key: StepKey; title: string; description: string }[] = [
  { key: 'select', title: '选择厂商', description: '选择要添加的模型厂商' },
  { key: 'config', title: '配置信息', description: '填写 API 配置' },
  { key: 'select_models', title: '模型选择', description: '选择要启用的模型' },
  { key: 'complete', title: '完成', description: 'Provider 添加成功' },
];

export const AddProviderModal: React.FC<AddProviderModalProps> = ({
  open,
  onClose,
  onSubmit,
  provider,
  onEdit,
}) => {
  const isEditMode = !!provider;
  const [currentStep, setCurrentStep] = useState<number>(isEditMode ? 1 : 0);
  const [selectedConfig, setSelectedConfig] = useState<ProviderConfig | null>(null);
  // 编辑模式下记录原始 apiKey（后端返回的 masked 值），用于判断是否修改
  const [originalApiKey] = useState<string | undefined>(provider?.apiKey ?? '');
  const [formData, setFormData] = useState<CreateProviderFormData>({
    type: (provider?.type ?? 'custom') as ProviderType,
    name: provider?.name ?? '',
    apiKey: provider?.apiKey ?? '',
    baseUrl: provider?.baseUrl ?? '',
    config: {},
    selectedModels: [],
    customModels: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 模型选择相关状态
  const [createdProviderId, setCreatedProviderId] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<ExternalModel[]>([]);
  const [customModelIds, setCustomModelIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());

  // 编辑模式：初始化 selectedConfig
  useEffect(() => {
    if (provider) {
      const config = getProviderConfig(provider.type as ProviderType);
      if (config) {
        setSelectedConfig(config);
      }
      setFormData({
        type: provider.type as ProviderType,
        name: provider.name ?? '',
        apiKey: provider.apiKey ?? '',
        baseUrl: provider.baseUrl ?? '',
        config: {},
        selectedModels: [],
        customModels: [],
      });
      setCurrentStep(1);
    }
  }, [provider]);

  // 更新表单数据
  const handleFormDataChange = useCallback((data: Partial<CreateProviderFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    setError(null);
  }, []);

  // 选择厂商
  const handleSelectProvider = useCallback((config: ProviderConfig) => {
    setSelectedConfig(config);
    setFormData(prev => ({
      ...prev,
      type: config.type,
      name: config.name,
      baseUrl: prev.baseUrl || config.api.defaultBaseUrl,
      selectedModels: [],
    }));
  }, []);

  // 验证当前步骤
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0:
        if (!selectedConfig) {
          setError('请选择一个厂商');
          return false;
        }
        return true;
      case 1:
        if (!formData.name?.trim()) {
          setError('请输入 Provider 名称');
          return false;
        }
        if (selectedConfig?.api.authType !== 'none' && !formData.apiKey?.trim()) {
          setError('请输入 API Key');
          return false;
        }
        // 验证必填Configuration fields
        for (const field of selectedConfig?.configFields || []) {
          if (field.required && !formData.config?.[field.key]) {
            setError(`请填写 ${field.label}`);
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  // 下一步
  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (currentStep === 1) {
      handleCreate();
    } else if (currentStep === 2) {
      handleSelectModels();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  // 上一步
  const handlePrev = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
    setError(null);
  };

  // 创建/更新 Provider（步骤 1 -> 2）
  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isEditMode && onEdit && provider) {
        const submitData = { ...formData };
        if (submitData.apiKey === originalApiKey) {
          delete submitData.apiKey;
        }
        await onEdit(provider.id, submitData);
        setCreatedProviderId(provider.id);
        // 编辑模式：获取外部模型，预选已有模型
        try {
          const models = await providerApi.refreshModels(provider.id);
          setAvailableModels(models);
        } catch {
          setAvailableModels([]);
        }
        const existingIds = new Set(provider.models.map(m => m.name));
        setSelectedModelIds(existingIds);
        setCustomModelIds([]);
        setCurrentStep(2); // 进入模型选择步骤
      } else {
        const result = await onSubmit(formData);
        if (result?.id) {
          setCreatedProviderId(result.id);
          const models = result.availableModels || [];
          setAvailableModels(models);
          setSelectedModelIds(new Set());
          setCurrentStep(2);
        } else {
          setCurrentStep(3);
        }
      }
    } catch (err) {
      console.error('Failed to save provider:', err);
      setError(err instanceof Error ? err.message : (isEditMode ? '更新失败，请重试' : '添加失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  // 确认模型选择（步骤 2 -> 3）
  const handleSelectModels = async () => {
    if (!createdProviderId) {
      setCurrentStep(3);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { providerApi } = await import('../../../services');
      await providerApi.selectModels(createdProviderId, Array.from(selectedModelIds));
      setCurrentStep(3);
    } catch (err) {
      console.error('Failed to select models:', err);
      setError(err instanceof Error ? err.message : '模型选择失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 模型选择操作
  const handleToggleModel = (modelId: string) => {
    setSelectedModelIds(prev => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  };

  const handleToggleAllModels = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedModelIds(new Set([
        ...availableModels.map(m => m.model_id),
        ...customModelIds,
      ]));
    } else {
      setSelectedModelIds(new Set());
    }
  };

  // 关闭并重置
  const handleClose = () => {
    setCurrentStep(isEditMode ? 1 : 0);
    setSelectedConfig(null);
    setFormData({
      type: 'custom' as ProviderType,
      name: '',
      apiKey: '',
      baseUrl: '',
      config: {},
      selectedModels: [],
    });
    setLoading(false);
    setError(null);
    setCreatedProviderId(null);
    setAvailableModels([]);
    setCustomModelIds([]);
    setSelectedModelIds(new Set());
    onClose();
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="h-[400px]">
            <ProviderTypeSelector
              selectedType={selectedConfig?.type}
              onSelect={handleSelectProvider}
            />
          </div>
        );
      case 1:
        if (!selectedConfig) return null;
        return (
          <div className="h-[400px] overflow-y-auto pr-2">
            <ProviderConfigForm
              config={selectedConfig}
              formData={formData}
              onChange={handleFormDataChange}
            />
          </div>
        );
      case 2:
        return (
          <div className="h-[400px]">
            <ModelSelectionStep
              availableModels={[
                ...availableModels.map(m => ({ id: m.model_id, name: m.model_id })),
                ...customModelIds.map(id => ({ id, name: id, isCustom: true })),
              ]}
              selectedIds={selectedModelIds}
              onToggle={handleToggleModel}
              onToggleAll={handleToggleAllModels}
              onAddCustomModel={(model) => {
                setCustomModelIds(prev => [...prev, model.id]);
                setSelectedModelIds(prev => new Set([...prev, model.id]));
              }}
              onRefreshModels={createdProviderId ? async () => {
                const models = await providerApi.refreshModels(createdProviderId);
                setAvailableModels(models);
              } : undefined}
            />
          </div>
        );
      case 3:
        return (
          <div className="py-8">
            <Result
              status="success"
              title={isEditMode ? "Provider 更新成功" : "Provider 添加成功"}
              subTitle={
                <div className="text-[var(--color-text-secondary)]">
                  <p className="text-lg font-medium mb-2">{formData.name}</p>
                  <p>
                    {selectedModelIds.size > 0
                      ? `已选择 ${selectedModelIds.size} 个模型`
                      : '您可以稍后在 Provider 详情中选择要启用的模型'}
                  </p>
                </div>
              }
              extra={[
                <Button type="primary" key="close" onClick={handleClose}>
                  完成
                </Button>,
                ...(!isEditMode ? [
                  <Button key="addAnother" onClick={() => {
                    setCurrentStep(0);
                    setSelectedConfig(null);
                    setFormData({
                      type: 'custom' as ProviderType,
                      name: '',
                      apiKey: '',
                      baseUrl: '',
                      config: {},
                      selectedModels: [],
                    });
                    setCreatedProviderId(null);
                    setAvailableModels([]);
                    setCustomModelIds([]);
                    setSelectedModelIds(new Set());
                  }}>
                    继续添加
                  </Button>,
                ] : []),
              ]}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // 底部按钮
  const renderFooter = () => {
    if (currentStep === 3) return null;

    const nextLabel = (() => {
      if (currentStep === 1) {
        return loading ? (isEditMode ? '保存中...' : '添加中...') : (isEditMode ? '保存并继续' : '添加 Provider');
      }
      if (currentStep === 2) {
        return loading ? '保存中...' : '确认选择';
      }
      return '下一步';
    })();

    return (
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          {currentStep > (isEditMode ? 1 : 0) && (
            <Button onClick={handlePrev} disabled={loading}>
              上一步
            </Button>
          )}
          <Button
            type="primary"
            onClick={handleNext}
            loading={loading}
            disabled={currentStep === 0 && !selectedConfig}
          >
            {nextLabel}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={currentStep === 3 ? handleClose : onClose}
      title={
        <div className="flex items-center gap-3">
          <span>{isEditMode ? '编辑 Provider' : '新增 Provider'}</span>
        </div>
      }
      width={currentStep === 0 ? 720 : 560}
      footer={renderFooter()}
      destroyOnHidden={false}
      mask={{ closable: false }}
    >
      {/* Steps bar */}
      <div className="mb-6">
        <Steps
          current={isEditMode ? currentStep - 1 : currentStep}
          size="small"
          items={(isEditMode ? steps.slice(1) : steps).map((step, index) => ({
            title: step.title,
            description: (isEditMode ? currentStep - 1 : currentStep) >= index ? step.description : undefined,
            status: (isEditMode ? currentStep - 1 : currentStep) === index ? 'process' : (isEditMode ? currentStep - 1 : currentStep) > index ? 'finish' : 'wait',
          }))}
        />
      </div>

      {/* 步骤内容 */}
      {renderStepContent()}

      {/* 错误提示 */}
      {error && currentStep !== 3 && (
        <Alert
          type="error"
          title={error}
          showIcon
          closable
          onClose={() => setError(null)}
          className="mt-3"
        />
      )}
    </Modal>
  );
};

export default AddProviderModal;
