/**
 * 知识库列表页面
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Dropdown, message, Modal, Tag, Empty, Spin, Progress, Switch } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  SearchOutlined as SearchIcon,
  SettingOutlined,
} from '@ant-design/icons';
import { knowledgeApi, embeddingModelTypeConfig, vectorStoreTypeConfig } from '../../services/mock/knowledge';
import KnowledgeBaseConfigForm from './components/KnowledgeBaseConfigForm';
import DocumentUploader from './components/DocumentUploader';
import SearchPanel from './components/SearchPanel';
import type { KnowledgeBase, Document } from '../../types/knowledge';

// 格式化文件大小
const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

export default function KnowledgeBaseListPage() {
  const navigate = useNavigate();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'documents' | 'search' | 'settings'>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const data = await knowledgeApi.getAllKnowledgeBases();
      setKnowledgeBases(data);
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载文档
  useEffect(() => {
    if (selectedKB) {
      loadDocuments(selectedKB.id);
    }
  }, [selectedKB?.id]);

  const loadDocuments = async (kbId: string) => {
    try {
      setDocumentsLoading(true);
      const docs = await knowledgeApi.getDocuments(kbId);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDelete = async (kb: KnowledgeBase) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除知识库「${kb.name}」吗？删除后无法恢复，所有文档和向量数据都将被删除。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await knowledgeApi.deleteKnowledgeBase(kb.id);
          setKnowledgeBases(knowledgeBases.filter((k) => k.id !== kb.id));
          if (selectedKB?.id === kb.id) {
            setSelectedKB(null);
          }
          message.success('知识库已删除');
        } catch (error) {
          console.error('Failed to delete knowledge base:', error);
          message.error('删除失败');
        }
      },
    });
  };

  const handleToggleEnabled = async (kb: KnowledgeBase) => {
    try {
      const updated = await knowledgeApi.updateKnowledgeBase(kb.id, { enabled: !kb.enabled });
      if (updated) {
        setKnowledgeBases(knowledgeBases.map((k) => (k.id === updated.id ? updated : k)));
        if (selectedKB?.id === updated.id) {
          setSelectedKB(updated);
        }
        message.success(updated.enabled ? '知识库已启用' : '知识库已禁用');
      }
    } catch (error) {
      console.error('Failed to toggle knowledge base:', error);
      message.error('操作失败');
    }
  };

  const handleCreateKB = async (data: Partial<KnowledgeBase>) => {
    try {
      const newKB = await knowledgeApi.createKnowledgeBase(data);
      setKnowledgeBases([...knowledgeBases, newKB]);
      setShowCreateModal(false);
      setSelectedKB(newKB);
      message.success('知识库创建成功');
    } catch (error) {
      console.error('Failed to create knowledge base:', error);
      message.error('创建失败');
    }
  };

  const handleUploadDocument = async (file: File) => {
    if (!selectedKB) return;
    try {
      const doc = await knowledgeApi.uploadDocument(selectedKB.id, {
        name: file.name,
        type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.md') ? 'md' : 'txt',
        size: file.size,
      });
      setDocuments([...documents, doc]);
      message.success('文档上传成功，正在处理中...');
    } catch (error) {
      console.error('Failed to upload document:', error);
      message.error('上传失败');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await knowledgeApi.deleteDocument(docId);
      setDocuments(documents.filter((d) => d.id !== docId));
      message.success('文档已删除');
    } catch (error) {
      console.error('Failed to delete document:', error);
      message.error('删除失败');
    }
  };

  const getActionMenuItems = (kb: KnowledgeBase) => [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: () => setSelectedKB(kb),
    },
    {
      key: 'toggle',
      label: kb.enabled ? '禁用' : '启用',
      onClick: () => handleToggleEnabled(kb),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(kb),
    },
  ];

  const filteredKBs = knowledgeBases.filter(
    (kb) =>
      kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kb.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        {/* 头部 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">知识库</h2>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            />
          </div>

          <Input
            placeholder="搜索知识库..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : filteredKBs.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无知识库"
              className="py-8"
            />
          ) : (
            filteredKBs.map((kb) => (
              <div
                key={kb.id}
                onClick={() => setSelectedKB(kb)}
                className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedKB?.id === kb.id
                    ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30'
                    : 'hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {vectorStoreTypeConfig[kb.config.vectorStore.type]?.icon || '📚'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--color-text-primary)] truncate">
                        {kb.name}
                      </span>
                      <Tag color={kb.enabled ? 'green' : 'default'} className="text-xs">
                        {kb.enabled ? '启用' : '禁用'}
                      </Tag>
                    </div>
                    <p className="text-sm text-[var(--color-text-tertiary)] truncate mt-1">
                      {kb.stats.documentCount} 文档 · {kb.stats.chunkCount} 分片
                    </p>
                  </div>
                  <Dropdown
                    menu={{ items: getActionMenuItems(kb) }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<MoreOutlined />}
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-y-auto">
        {selectedKB ? (
          <KnowledgeBaseDetail
            knowledgeBase={selectedKB}
            documents={documents}
            documentsLoading={documentsLoading}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onUploadDocument={handleUploadDocument}
            onDeleteDocument={handleDeleteDocument}
            onRefreshDocuments={() => loadDocuments(selectedKB.id)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <DatabaseOutlined className="text-5xl text-[var(--color-text-tertiary)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">选择一个知识库</h3>
              <p className="text-[var(--color-text-secondary)]">从左侧列表中选择查看详情</p>
            </div>
          </div>
        )}
      </div>

      {/* 创建知识库弹窗 */}
      <Modal
        title="创建知识库"
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <KnowledgeBaseConfigForm onSave={handleCreateKB} onCancel={() => setShowCreateModal(false)} />
      </Modal>
    </div>
  );
}

// 知识库详情组件
function KnowledgeBaseDetail({
  knowledgeBase,
  documents,
  documentsLoading,
  activeTab,
  setActiveTab,
  onUploadDocument,
  onDeleteDocument,
  onRefreshDocuments,
}: {
  knowledgeBase: KnowledgeBase;
  documents: Document[];
  documentsLoading: boolean;
  activeTab: 'documents' | 'search' | 'settings';
  setActiveTab: (tab: 'documents' | 'search' | 'settings') => void;
  onUploadDocument: (file: File) => void;
  onDeleteDocument: (docId: string) => void;
  onRefreshDocuments: () => void;
}) {
  const tabs = [
    { key: 'documents', label: '文档管理', icon: FileTextOutlined },
    { key: 'search', label: '知识搜索', icon: SearchIcon },
    { key: 'settings', label: '配置', icon: SettingOutlined },
  ];

  const embeddingModelInfo = embeddingModelTypeConfig[knowledgeBase.config.embeddingModel.type];
  const vectorStoreInfo = vectorStoreTypeConfig[knowledgeBase.config.vectorStore.type];

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-start gap-4 mb-6">
        <div className="text-4xl">{vectorStoreInfo?.icon || '📚'}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {knowledgeBase.name}
            </h2>
            <Tag color={knowledgeBase.enabled ? 'green' : 'default'}>
              {knowledgeBase.enabled ? '启用' : '禁用'}
            </Tag>
          </div>
          <p className="text-[var(--color-text-secondary)] mt-1">
            {knowledgeBase.description || '暂无描述'}
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="文档数" value={knowledgeBase.stats.documentCount.toString()} />
        <StatCard title="分片数" value={knowledgeBase.stats.chunkCount.toLocaleString()} />
        <StatCard title="向量数" value={knowledgeBase.stats.vectorCount.toLocaleString()} />
        <StatCard title="存储大小" value={formatSize(knowledgeBase.stats.totalSize)} />
      </div>

      {/* 配置信息 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3">
          <div className="text-sm text-[var(--color-text-tertiary)]">嵌入模型</div>
          <div className="font-medium text-[var(--color-text-primary)] mt-1">
            {embeddingModelInfo?.name || knowledgeBase.config.embeddingModel.type}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {knowledgeBase.config.embeddingModel.dimensions} 维度
          </div>
        </div>
        <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3">
          <div className="text-sm text-[var(--color-text-tertiary)]">向量数据库</div>
          <div className="font-medium text-[var(--color-text-primary)] mt-1">
            {vectorStoreInfo?.name || knowledgeBase.config.vectorStore.type}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
            分片大小: {knowledgeBase.config.chunkingStrategy.chunkSize} 字符
          </div>
        </div>
      </div>

      {/* 标签栏 */}
      <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
        {activeTab === 'documents' && (
          <DocumentManager
            documents={documents}
            loading={documentsLoading}
            onUpload={onUploadDocument}
            onDelete={onDeleteDocument}
            onRefresh={onRefreshDocuments}
          />
        )}
        {activeTab === 'search' && <SearchPanel knowledgeBaseId={knowledgeBase.id} />}
        {activeTab === 'settings' && (
          <KnowledgeBaseSettings knowledgeBase={knowledgeBase} />
        )}
      </div>
    </div>
  );
}

// 统计卡片
function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4">
      <div className="text-sm text-[var(--color-text-tertiary)]">{title}</div>
      <div className="text-xl font-semibold text-[var(--color-text-primary)] mt-1">{value}</div>
    </div>
  );
}

// 文档管理组件
function DocumentManager({
  documents,
  loading,
  onUpload,
  onDelete,
  onRefresh,
}: {
  documents: Document[];
  loading: boolean;
  onUpload: (file: File) => void;
  onDelete: (docId: string) => void;
  onRefresh: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      await onUpload(file);
      setUploading(false);
    }
  };

  const statusConfig: Record<string, { color: string; text: string }> = {
    pending: { color: 'default', text: '待处理' },
    processing: { color: 'blue', text: '处理中' },
    completed: { color: 'green', text: '已完成' },
    failed: { color: 'red', text: '失败' },
    deleted: { color: 'default', text: '已删除' },
  };

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div className="flex items-center gap-4">
        <label className="cursor-pointer">
          <input type="file" className="hidden" accept=".pdf,.txt,.md,.docx" onChange={handleFileChange} />
          <Button type="primary" icon={<CloudUploadOutlined />} loading={uploading}>
            上传文档
          </Button>
        </label>
        <span className="text-sm text-[var(--color-text-tertiary)]">
          支持 PDF、TXT、MD、DOCX 格式
        </span>
      </div>

      {/* 文档列表 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : documents.length === 0 ? (
        <Empty description="暂无文档，点击上方按钮上传" className="py-8" />
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileTextOutlined className="text-xl text-[var(--color-text-tertiary)]" />
                <div>
                  <div className="font-medium text-[var(--color-text-primary)]">{doc.name}</div>
                  <div className="text-sm text-[var(--color-text-tertiary)]">
                    {formatSize(doc.size)} · {doc.chunkCount} 分片 · {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Tag color={statusConfig[doc.status].color}>{statusConfig[doc.status].text}</Tag>
                <Button type="text" danger size="small" onClick={() => onDelete(doc.id)}>
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 知识库设置组件
function KnowledgeBaseSettings({ knowledgeBase }: { knowledgeBase: KnowledgeBase }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">分片配置</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-[var(--color-text-tertiary)]">分片策略</div>
            <div className="text-[var(--color-text-primary)] mt-1">
              {knowledgeBase.config.chunkingStrategy.type}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--color-text-tertiary)]">分片大小</div>
            <div className="text-[var(--color-text-primary)] mt-1">
              {knowledgeBase.config.chunkingStrategy.chunkSize} 字符
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--color-text-tertiary)]">重叠大小</div>
            <div className="text-[var(--color-text-primary)] mt-1">
              {knowledgeBase.config.chunkingStrategy.chunkOverlap} 字符
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">检索配置</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-[var(--color-text-tertiary)]">返回数量 (Top K)</div>
            <div className="text-[var(--color-text-primary)] mt-1">
              {knowledgeBase.config.retrievalConfig.topK}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--color-text-tertiary)]">相似度阈值</div>
            <div className="text-[var(--color-text-primary)] mt-1">
              {knowledgeBase.config.retrievalConfig.scoreThreshold}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--color-text-tertiary)]">混合搜索</div>
            <div className="text-[var(--color-text-primary)] mt-1">
              {knowledgeBase.config.retrievalConfig.hybridSearchEnabled ? '已启用' : '未启用'}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--color-text-tertiary)]">重排序</div>
            <div className="text-[var(--color-text-primary)] mt-1">
              {knowledgeBase.config.retrievalConfig.rerankingEnabled ? '已启用' : '未启用'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
