/**
 * 新增 Provider 弹窗组件
 * 步骤式流程：选择厂商 -> 配置信息 -> 完成确认
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Button, Steps, Result } from 'antd';
import type { ProviderConfig, ProviderType, CreateProviderFormData } from '../../../types/provider';
import { ProviderTypeSelector } from './ProviderTypeSelector';
import { ProviderConfigForm } from './ProviderConfigForm';
import { getProviderConfig } from '../../../services/provider/providerConfigs';

interface AddProviderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProviderFormData) => Promise<void>;
  /** 传入 Provider 时进入编辑模式 */
  provider?: {
    id: string;
    name: string;
    type: string;
    apiKey?: string;
    baseUrl?: string;
  } | null;
  onEdit?: (id: string, data: CreateProviderFormData) => Promise<void>;
}

// 步骤定义
type StepKey = 'select' | 'config' | 'complete';

const steps: { key: StepKey; title: string; description: string }[] = [
  { key: 'select', title: '选择厂商', description: '选择要添加的模型厂商' },
  { key: 'config', title: '配置信息', description: '填写 API 配置和模型选择' },
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
      baseUrl: config.api.defaultBaseUrl,
      selectedModels: config.defaultModels.map(m => m.id),
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
        // 验证必填配置字段
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
      handleSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  // 上一步
  const handlePrev = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
    setError(null);
  };

  // 提交
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isEditMode && onEdit && provider) {
        // 如果 apiKey 未被修改（与原始 masked 值相同），则不发送 apiKey
        const submitData = { ...formData };
        if (submitData.apiKey === originalApiKey) {
          delete submitData.apiKey;
        }
        await onEdit(provider.id, submitData);
        setCurrentStep(2);
      } else {
        await onSubmit(formData);
        setCurrentStep(2); // 跳转到完成步骤
      }
    } catch (err) {
      console.error('Failed to save provider:', err);
      setError(err instanceof Error ? err.message : (isEditMode ? '更新失败，请重试' : '添加失败，请重试'));
    } finally {
      setLoading(false);
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
          <div className="py-8">
            <Result
              status="success"
              title={isEditMode ? "Provider 更新成功" : "Provider 添加成功"}
              subTitle={
                <div className="text-[var(--color-text-secondary)]">
                  <p className="text-lg font-medium mb-2">{formData.name}</p>
                  <p>您现在可以使用此 Provider 的模型进行对话</p>
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
    if (currentStep === 2) return null;

    return (
      <div className="flex items-center justify-between">
        <div className="text-red-500 text-sm">{error}</div>
        <div className="flex gap-2">
          {!isEditMode && currentStep > 0 && (
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
            {currentStep === 1 ? (loading ? (isEditMode ? '更新中...' : '添加中...') : (isEditMode ? '保存修改' : '添加 Provider')) : '下一步'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={currentStep === 2 ? handleClose : onClose}
      title={
        <div className="flex items-center gap-3">
          <span>{isEditMode ? '编辑 Provider' : '新增 Provider'}</span>
        </div>
      }
      width={currentStep === 0 ? 720 : 560}
      footer={renderFooter()}
      destroyOnHidden={false}
      maskClosable={false}
    >
      {/* 步骤条 */}
      {!isEditMode && (
        <div className="mb-6">
          <Steps
            current={currentStep}
            size="small"
            items={steps.map((step, index) => ({
              title: step.title,
              description: currentStep >= index ? step.description : undefined,
              status: currentStep === index ? 'process' : currentStep > index ? 'finish' : 'wait',
            }))}
          />
        </div>
      )}

      {/* 步骤内容 */}
      {renderStepContent()}
    </Modal>
  );
};

export default AddProviderModal;
