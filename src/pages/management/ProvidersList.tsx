import { useTranslation } from "react-i18next";
/**
 * Provider management page
 */

import { useState, useEffect } from "react";
import { Input, Button, Tag, Modal, message } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  SyncOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  CloudServerOutlined,
} from "@ant-design/icons";
import type { CreateProviderFormData } from "../../types/provider";
import type { Provider, ExternalModel } from "../../services/real/providers";
import { providerApi } from "@/services";
import { getProviderTypeConfig } from "../../services/provider/providerConfigs";
import {
  AddProviderModal,
  type ProviderWithModels,
} from "./components/AddProviderModal";
import { ModelSelectionStep } from "./components/ModelSelectionStep";
import { formatDate } from "@/utils";
import ResizableSidebar from "@/components/layout/ResizableSidebar";
import { fuzzyMatch } from "@/utils/fuzzySearch";

export default function ProvidersListPage() {  const { t } = useTranslation();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    new Set(),
  );
  const [validatingKey, setValidatingKey] = useState<string | null>(null);
  const [refreshingModels, setRefreshingModels] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  // Refresh model selection dialog state
  const [refreshModalOpen, setRefreshModalOpen] = useState(false);
  const [refreshingProviderId, setRefreshingProviderId] = useState<
    string | null
  >(null);
  const [refreshedModels, setRefreshedModels] = useState<ExternalModel[]>([]);
  const [refreshSelectedIds, setRefreshSelectedIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await providerApi.getAll();
      setProviders(data);
      return data;
    } catch (error) {
      console.error("Failed to load providers:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Filter providers
  const filteredProviders = providers.filter((p) => {
    const matchesSearch =
      (p.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.type ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const toggleProvider = (id: string) => {
    const newExpanded = new Set(expandedProviders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedProviders(newExpanded);
  };

  const handleDelete = async (id: string) => {
    try {
      await providerApi.delete(id);
      setProviders(providers.filter((p) => p.id !== id));
      if (selectedProvider?.id === id) {
        setSelectedProvider(null);
      }
      message.success(t("Provider 已删除"));
    } catch (error) {
      console.error("Failed to delete provider:", error);
      message.error(t("删除失败"));
    }
  };

  const handleValidateKey = async (id: string) => {
    setValidatingKey(id);
    try {
      const result = await providerApi.validateApiKey(id);
      if (result.valid) {
        message.success(result.message);
      } else {
        message.error(t("验证失败: {{p0}}", { p0: result.message }));
      }
    } catch (error) {
      console.error("Failed to validate key:", error);
      message.error(t("验证失败"));
    } finally {
      setValidatingKey(null);
    }
  };

  const handleRefreshModels = async (id: string) => {
    setRefreshingModels(id);
    try {
      const models = await providerApi.refreshModels(id);
      setRefreshedModels(models);
      setRefreshingProviderId(id);
      // Preselect currently enabled models
      const provider = providers.find((p) => p.id === id);
      const enabledIds = new Set(provider?.models.map((m) => m.name) ?? []);
      setRefreshSelectedIds(enabledIds);
      setRefreshModalOpen(true);
    } catch (error) {
      console.error("Failed to refresh models:", error);
      message.error(t("获取模型列表失败"));
    } finally {
      setRefreshingModels(null);
    }
  };

  const handleRefreshConfirm = async () => {
    if (!refreshingProviderId) return;
    try {
      await providerApi.selectModels(
        refreshingProviderId,
        Array.from(refreshSelectedIds),
      );
      setRefreshModalOpen(false);
      const allProviders = await loadProviders();
      const updated = allProviders.find((p) => p.id === refreshingProviderId);
      if (selectedProvider?.id === refreshingProviderId && updated) {
        setSelectedProvider(updated);
      }
      message.success(t("模型列表已更新"));
    } catch (error) {
      console.error("Failed to save model selection:", error);
      message.error(t("保存失败"));
    }
  };

  const handleToggleModel = async (
    providerId: string,
    modelId: string,
    enabled: boolean,
  ) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    const currentIds = provider.models.map((m) => m.name);
    const updatedIds = enabled
      ? [...currentIds, modelId]
      : currentIds.filter((id) => id !== modelId);

    try {
      await providerApi.selectModels(providerId, updatedIds);
      const allProviders = await loadProviders();
      const updated = allProviders.find((p) => p.id === providerId);
      if (selectedProvider?.id === providerId && updated) {
        setSelectedProvider(updated);
      }
      message.success(enabled ? "模型已启用" : "模型已禁用");
    } catch (error) {
      console.error("Failed to toggle model:", error);
      message.error(t("操作失败"));
    }
  };

  // Add a model to a provider individually
  const handleAddModel = async (providerId: string, modelId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;
    const currentIds = provider.models.map((m) => m.name);
    if (currentIds.includes(modelId)) {
      message.warning(t("该模型已存在"));
      return;
    }
    const updatedIds = [...currentIds, modelId];
    try {
      await providerApi.selectModels(providerId, updatedIds);
      const allProviders = await loadProviders();
      const updated = allProviders.find((p) => p.id === providerId);
      if (selectedProvider?.id === providerId && updated) {
        setSelectedProvider(updated);
      }
      message.success(t("模型 \"{{p0}}\" 添加成功", { p0: modelId }));
    } catch (error) {
      console.error("Failed to add model:", error);
      message.error(t("添加失败"));
    }
  };

  // Handle provider creation
  const handleAddProvider = async (
    formData: CreateProviderFormData,
  ): Promise<ProviderWithModels | void> => {
    const newProvider = await providerApi.createFromFormData(formData);
    message.success(t("Provider \"{{p0}}\" 添加成功", { p0: newProvider.name }));
    return {
      id: newProvider.id,
      name: newProvider.name,
      type: newProvider.type,
      baseUrl: newProvider.baseUrl,
      apiKey: newProvider.apiKey,
      availableModels: newProvider.availableModels,
      models: newProvider.models,
    };
  };

  // Handle provider editing
  const handleEditProvider = async (
    id: string,
    formData: CreateProviderFormData,
  ) => {
    const updateData: Record<string, unknown> = {
      name: formData.name,
      baseUrl: formData.baseUrl,
      type: formData.type,
    };
    // Only pass apiKey when actually modified (omitted from formData otherwise)
    if (formData.apiKey !== undefined) {
      updateData.apiKey = formData.apiKey;
    }
    const updated = await providerApi.update(id, updateData);
    setProviders(providers.map((p) => (p.id === id ? updated : p)));
    setSelectedProvider(updated);
    message.success(t("Provider \"{{p0}}\" 更新成功", { p0: updated.name }));
  };

  return (
    <div className="flex h-full">
      {/* Left list */}
      <ResizableSidebar className="border-r border-(--color-border) bg-[var(--color-bg-secondary)]" storageKey="sidebar:providers">
        {/* Header */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Provider 管理
            </h2>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="small"
              onClick={() => setAddModalOpen(true)}
            />
          </div>

          {/* Search */}
          <Input
            placeholder={t("搜索 Providers...")}
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              加载中...
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-tertiary)]">
              <CloudServerOutlined className="text-3xl mb-2 opacity-50" />
              <p>{t("暂无 Providers")}</p>
            </div>
          ) : (
            filteredProviders.map((provider) => (
              <div key={provider.id} className="mb-2">
                <div
                  onClick={() => setSelectedProvider(provider)}
                  className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedProvider?.id === provider.id
                      ? "bg-[var(--color-primary)]/10 border border-(--color-primary)/30"
                      : "hover:bg-(--color-bg-tertiary)"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`p-1.5 rounded ${
                        getProviderTypeConfig(provider.type)?.color === "green"
                          ? "bg-green-500/10"
                          : getProviderTypeConfig(provider.type)?.color ===
                              "orange"
                            ? "bg-orange-500/10"
                            : getProviderTypeConfig(provider.type)?.color ===
                                "blue"
                              ? "bg-blue-500/10"
                              : getProviderTypeConfig(provider.type)?.color ===
                                  "purple"
                                ? "bg-purple-500/10"
                                : "bg-gray-500/10"
                      }`}
                    >
                      <span className="text-lg">
                        {getProviderTypeConfig(provider.type)?.icon || "⚙️"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-text-primary)] truncate">
                          {provider.name || "-"}
                        </span>
                        {getStatusIcon(provider.status)}
                      </div>
                      <p className="text-sm text-[var(--color-text-tertiary)]">
                        {provider.models?.length ?? 0} 个模型
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {provider.usage?.totalCalls ?? "-"} 次调用
                        </span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          •
                        </span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {provider.usage?.totalTokens
                            ? (provider.usage.totalTokens / 1000).toFixed(0) +
                              "K"
                            : "-"}
                          tokens
                        </span>
                      </div>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={
                        expandedProviders.has(provider.id) ? (
                          <CaretDownOutlined />
                        ) : (
                          <CaretRightOutlined />
                        )
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProvider(provider.id);
                      }}
                    />
                  </div>
                </div>

                {/* Expanded model list */}
                {expandedProviders.has(provider.id) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {(provider.models ?? []).map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between p-2 bg-(--color-bg-tertiary) rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-text-primary)]">
                            {model.name}
                          </span>
                          {!model.enabled && (
                            <span className="text-xs text-[var(--color-text-tertiary)]">
                              (已禁用)
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {model.pricing.input > 0
                            ? `$${model.pricing.input.toFixed(4)}/1K`
                            : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ResizableSidebar>

      {/* Right details */}
      <div className="flex-1 overflow-hidden">
        {selectedProvider ? (
          <ProviderDetail
            provider={selectedProvider}
            onDelete={handleDelete}
            onValidateKey={handleValidateKey}
            onRefreshModels={handleRefreshModels}
            onToggleModel={handleToggleModel}
            onAddModel={handleAddModel}
            onEdit={(provider) => {
              setEditingProvider(provider);
              setEditModalOpen(true);
            }}
            validatingKey={validatingKey === selectedProvider.id}
            refreshingModels={refreshingModels === selectedProvider.id}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CloudServerOutlined className="text-5xl text-[var(--color-text-tertiary)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                选择一个 Provider
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                从左侧列表中选择查看详情
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add provider modal */}
      <AddProviderModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={async (data) => {
          await handleAddProvider(data);
          await loadProviders();
        }}
      />

      {/* Edit provider modal */}
      <AddProviderModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingProvider(null);
        }}
        onSubmit={handleAddProvider}
        provider={editingProvider}
        onEdit={handleEditProvider}
      />

      {/* Refresh model selection dialog */}
      <Modal
        open={refreshModalOpen}
        title={t("选择要启用的模型")}
        onCancel={() => setRefreshModalOpen(false)}
        onOk={handleRefreshConfirm}
        okText={t("确认选择")}
        cancelText={t("取消")}
        width={560}
      >
        <div className="h-[400px]">
          <ModelSelectionStep
            availableModels={refreshedModels.map((m) => ({
              id: m.model_id,
              name: m.model_id,
            }))}
            selectedIds={refreshSelectedIds}
            onToggle={(id) => {
              setRefreshSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onToggleAll={(all) => {
              if (all) {
                setRefreshSelectedIds(
                  new Set(refreshedModels.map((m) => m.model_id)),
                );
              } else {
                setRefreshSelectedIds(new Set());
              }
            }}
          />
        </div>
      </Modal>
    </div>
  );
}

// Provider detail component
function ProviderDetail({
  provider,
  onDelete,
  onValidateKey,
  onRefreshModels,
  onToggleModel,
  onAddModel,
  onEdit,
  validatingKey,
  refreshingModels,
}: {
  provider: Provider;
  onDelete: (id: string) => void;
  onValidateKey: (id: string) => void;
  onRefreshModels: (id: string) => void;
  onToggleModel: (
    providerId: string,
    modelId: string,
    enabled: boolean,
  ) => void;
  onAddModel: (providerId: string, modelId: string) => Promise<void>;
  onEdit: (provider: Provider) => void;
  validatingKey: boolean;
  refreshingModels: boolean;
}) {  const { t } = useTranslation();

  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<"models" | "usage" | "settings">(
    "models",
  );
  const [modelSearch, setModelSearch] = useState("");
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [addModelId, setAddModelId] = useState("");
  const [addingModel, setAddingModel] = useState(false);

  const typeConfig = getProviderTypeConfig(provider.type);

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(4)}`;
  };

  // Estimate cost
  const estimatedCost =
    ((provider.usage?.totalTokens ?? 0) / 1000) *
    (provider.models?.[0]?.pricing.input || 0);

  const tabs = [
    { key: "models", label: t("模型列表"), icon: ThunderboltOutlined },
    { key: "usage", label: t("使用统计"), icon: DollarOutlined },
    { key: "settings", label: t("配置设置"), icon: KeyOutlined },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-6 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{typeConfig?.icon || "⚙️"}</span>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {provider.name || "-"}
            </h2>
            <Tag color={typeConfig?.color || "default"}>
              {typeConfig?.name || provider.type || "-"}
            </Tag>
          </div>
          <p className="text-[var(--color-text-secondary)] mt-1">
            {provider.status === "active"
              ? "运行正常"
              : provider.status === "inactive"
                ? "未激活"
                : "连接错误"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(provider.id)}
          >
            删除
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => onEdit(provider)}
          >
            编辑
          </Button>
        </div>
      </div>

      {/* Meta information */}
      <div className="grid grid-cols-4 gap-4 px-6 pb-4">
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            状态
          </span>
          <div className="flex items-center gap-1 mt-1">
            {getStatusIcon(provider.status)}
            <span className="text-sm text-[var(--color-text-primary)]">
              {provider.status === "active"
                ? "正常"
                : provider.status === "inactive"
                  ? "未激活"
                  : "错误"}
            </span>
          </div>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            模型数
          </span>
          <p className="text-sm text-[var(--color-text-primary)]">
            {provider.models.length}
          </p>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            总调用
          </span>
          <p className="text-sm text-[var(--color-text-primary)]">
            {provider.usage.totalCalls}
          </p>
        </div>
        <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            预估费用
          </span>
          <p className="text-sm text-[var(--color-text-primary)]">
            {formatCurrency(estimatedCost)}
          </p>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex gap-1 px-6 border-b border-(--color-border)">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "text-[var(--color-primary)] border-(--color-primary)"
                  : "text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "models" && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                可用模型
              </h3>
              <div className="flex gap-2">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setAddModelId("");
                    setAddModelOpen(true);
                  }}
                >
                  添加模型
                </Button>
                <Button
                  icon={
                    refreshingModels ? (
                      <LoadingOutlined />
                    ) : (
                      <SyncOutlined spin={refreshingModels} />
                    )
                  }
                  onClick={() => onRefreshModels(provider.id)}
                  disabled={refreshingModels}
                >
                  获取模型
                </Button>
              </div>
            </div>

            <Input
              placeholder={t("搜索模型...")}
              prefix={<SearchOutlined />}
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              allowClear
              className="mb-3"
            />

            <div className="space-y-2">
              {provider.models
                .filter((m) => !modelSearch || fuzzyMatch(modelSearch, m.name))
                .map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${model.enabled ? "bg-green-500" : "bg-gray-400"}`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {model.name || "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-tertiary)]">
                          <span>
                            {model.maxTokens
                              ? `最大 ${model.maxTokens.toLocaleString()} tokens`
                              : ""}
                          </span>
                          <span>•</span>
                          <span>
                            输入: {formatCurrency(model.pricing.input)}/1K
                          </span>
                          <span>•</span>
                          <span>
                            输出: {formatCurrency(model.pricing.output)}/1K
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="small"
                      type={model.enabled ? "primary" : "default"}
                      onClick={() =>
                        onToggleModel(provider.id, model.id, !model.enabled)
                      }
                      className={
                        model.enabled ? "bg-green-500 hover:bg-green-600" : ""
                      }
                    >
                      {model.enabled ? "已启用" : "已禁用"}
                    </Button>
                  </div>
                ))}
            </div>

            {/* Add model modal */}
            <Modal
              title={t("添加模型")}
              open={addModelOpen}
              onCancel={() => {
                setAddModelOpen(false);
                setAddModelId("");
              }}
              onOk={async () => {
                const id = addModelId.trim();
                if (!id) return;
                setAddingModel(true);
                try {
                  await onAddModel(provider.id, id);
                  setAddModelOpen(false);
                  setAddModelId("");
                } catch {
                  // error handled by caller
                } finally {
                  setAddingModel(false);
                }
              }}
              okText={t("添加")}
              cancelText={t("取消")}
              confirmLoading={addingModel}
              okButtonProps={{ disabled: !addModelId.trim() }}
            >
              <div className="py-2">
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  模型 ID <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder={t("例如: gpt-4o, claude-3-opus")}
                  value={addModelId}
                  onChange={(e) => setAddModelId(e.target.value)}
                />
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  输入模型标识符，将与已有模型一起保存
                </p>
              </div>
            </Modal>
          </div>
        )}

        {activeTab === "usage" && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
                <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-2">
                  <ThunderboltOutlined />
                  <span className="text-sm">{t("总调用次数")}</span>
                </div>
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  {provider.usage.totalCalls.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
                <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-2">
                  <ClockCircleOutlined />
                  <span className="text-sm">{t("总 Tokens")}</span>
                </div>
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  {(provider.usage.totalTokens / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
                <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-2">
                  <DollarOutlined />
                  <span className="text-sm">{t("预估费用")}</span>
                </div>
                <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
                  {formatCurrency(estimatedCost)}
                </p>
              </div>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">
                使用历史
              </h4>
              <div className="text-center text-[var(--color-text-tertiary)] py-8">
                <p>{t("使用历史图表开发中...")}</p>
                <p className="text-xs mt-1">{t("将显示调用趋势和 Token 消耗")}</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border)">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  最后使用时间
                </span>
                <span className="text-sm text-[var(--color-text-primary)]">
                  {formatDate(provider.usage.lastUsed)}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="p-6 h-full overflow-y-auto">
            <div className="space-y-4">
              {/* API Key */}
              <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
                    API 密钥
                  </h4>
                  <Button
                    size="small"
                    icon={
                      validatingKey ? (
                        <LoadingOutlined />
                      ) : (
                        <CheckCircleOutlined />
                      )
                    }
                    onClick={() => onValidateKey(provider.id)}
                    disabled={validatingKey}
                  >
                    验证
                  </Button>
                </div>
                {provider.apiKey ? (
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={
                        showApiKey
                          ? provider.apiKey
                          : "••••••••••••••••••••••••"
                      }
                      className="font-mono"
                    />
                    <Button
                      type="text"
                      icon={
                        showApiKey ? <EyeInvisibleOutlined /> : <EyeOutlined />
                      }
                      onClick={() => setShowApiKey(!showApiKey)}
                    />
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        if (provider.apiKey) {
                          navigator.clipboard.writeText(provider.apiKey);
                          message.success(t("已复制到剪贴板"));
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-tertiary)]">
                    未配置 API 密钥
                  </p>
                )}
              </div>

              {/* Base URL */}
              {provider.baseUrl && (
                <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4">
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
                    Base URL
                  </h4>
                  <Input
                    readOnly
                    value={provider.baseUrl}
                    className="font-mono"
                  />
                </div>
              )}

              {/* Provider type */}
              <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4">
                <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
                  Provider 类型
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{typeConfig?.icon}</span>
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {typeConfig?.name}
                  </span>
                </div>
              </div>

              {/* Created/updated time */}
              <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-4">
                <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
                  时间信息
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-tertiary)]">
                      创建时间
                    </span>
                    <span className="text-[var(--color-text-primary)]">
                      {formatDate(provider.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-tertiary)]">
                      更新时间
                    </span>
                    <span className="text-[var(--color-text-primary)]">
                      {formatDate(provider.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusIcon(status: Provider["status"]) {
  switch (status) {
    case "active":
      return <CheckCircleOutlined className="text-green-500" />;
    case "inactive":
      return <CloseCircleOutlined className="text-gray-400" />;
    case "error":
      return <WarningOutlined className="text-red-500" />;
  }
}
