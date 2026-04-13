/**
 * 知识库列表页面
 */

import { useState, useEffect } from 'react';
import { Input, Button, Dropdown, message, Modal, Tag, Empty, Spin } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { knowledgeApi } from '@/services';
import SearchPanel from './components/SearchPanel';
import type { KnowledgeBase, Document } from '../../types/knowledge';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
};

export default function KnowledgeBaseListPage() {
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

  useEffect(() => {
    if (selectedKB) loadDocuments(selectedKB.id);
  }, [selectedKB?.id]);

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      setKnowledgeBases(await knowledgeApi.getAllKnowledgeBases());
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (id: string) => {
    try {
      setDocumentsLoading(true);
      setDocuments(await knowledgeApi.getDocuments(id));
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDelete = (kb: KnowledgeBase) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除知识库「' + kb.name + '」吗？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        await knowledgeApi.deleteKnowledgeBase(kb.id);
        setKnowledgeBases(knowledgeBases.filter(k => k.id !== kb.id));
        if (selectedKB?.id === kb.id) setSelectedKB(null);
        message.success('已删除');
      }
    });
  };

  const handleToggleEnabled = async (kb: KnowledgeBase) => {
    const updated = await knowledgeApi.updateKnowledgeBase(kb.id, { enabled: !kb.enabled });
    if (updated) {
      setKnowledgeBases(knowledgeBases.map(k => k.id === updated.id ? updated : k));
      if (selectedKB?.id === updated.id) setSelectedKB(updated);
      message.success(updated.enabled ? '已启用' : '已禁用');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    await knowledgeApi.deleteDocument(id);
    setDocuments(documents.filter(d => d.id !== id));
    message.success('已删除');
  };

  const getMenuItems = (kb: KnowledgeBase) => [
    { key: 'edit', label: '编辑', icon: <EditOutlined />, onClick: () => setSelectedKB(kb) },
    { key: 'toggle', label: kb.enabled ? '禁用' : '启用', onClick: () => handleToggleEnabled(kb) },
    { type: 'divider' as const },
    { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(kb) },
  ];

  const filteredKBs = knowledgeBases.filter(kb =>
    kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kb.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusConfig: Record<string, { color: string; text: string }> = {
    pending: { color: 'default', text: '待处理' },
    processing: { color: 'blue', text: '处理中' },
    completed: { color: 'green', text: '已完成' },
    failed: { color: 'red', text: '失败' },
  };

  return (
    <div className="flex h-full">
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-secondary)]">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">知识库</h2>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)} />
          </div>
          <Input placeholder="搜索知识库..." prefix={<SearchOutlined />} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} allowClear />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? <div className="flex justify-center py-8"><Spin /></div> :
           filteredKBs.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无知识库" className="py-8" /> :
           filteredKBs.map(kb => (
             <div key={kb.id} onClick={() => setSelectedKB(kb)}
               className={'group p-3 rounded-lg cursor-pointer transition-colors ' + (selectedKB?.id === kb.id ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30' : 'hover:bg-[var(--color-bg-tertiary)]')}>
               <div className="flex items-start gap-3">
                 <div className="text-2xl">📚</div>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2">
                     <span className="font-medium text-[var(--color-text-primary)] truncate">{kb.name}</span>
                     <Tag color={kb.enabled ? 'green' : 'default'} className="text-xs">{kb.enabled ? '启用' : '禁用'}</Tag>
                   </div>
                   <p className="text-sm text-[var(--color-text-tertiary)] truncate mt-1">{kb.stats.documentCount} 文档 · {kb.stats.chunkCount} 分片</p>
                 </div>
                 <Dropdown menu={{ items: getMenuItems(kb) }} trigger={['click']} placement="bottomRight">
                   <Button type="text" size="small" icon={<MoreOutlined />} className="opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()} />
                 </Dropdown>
               </div>
             </div>
           ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {selectedKB ? (
          <div className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-4xl">📚</div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{selectedKB.name}</h2>
                  <Tag color={selectedKB.enabled ? 'green' : 'default'}>{selectedKB.enabled ? '启用' : '禁用'}</Tag>
                </div>
                <p className="text-[var(--color-text-secondary)] mt-1">{selectedKB.description || '暂无描述'}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[{ t: '文档数', v: selectedKB.stats.documentCount }, { t: '分片数', v: selectedKB.stats.chunkCount }, { t: '向量数', v: selectedKB.stats.vectorCount }, { t: '存储大小', v: formatSize(selectedKB.stats.totalSize) }].map((s, i) => (
                <div key={i} className="bg-[var(--color-bg-tertiary)] rounded-lg p-4">
                  <div className="text-sm text-[var(--color-text-tertiary)]">{s.t}</div>
                  <div className="text-xl font-semibold text-[var(--color-text-primary)] mt-1">{s.v}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
              {[{ k: 'documents', l: '文档管理', i: FileTextOutlined }, { k: 'search', l: '知识搜索', i: SearchOutlined }, { k: 'settings', l: '配置', i: SettingOutlined }].map(t => (
                <button key={t.k} onClick={() => setActiveTab(t.k as typeof activeTab)}
                  className={'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ' + (activeTab === t.k ? 'text-[var(--color-primary)] border-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]')}>
                  <t.i className="w-4 h-4" />{t.l}
                </button>
              ))}
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button type="primary" icon={<CloudUploadOutlined />}>上传文档</Button>
                    <span className="text-sm text-[var(--color-text-tertiary)]">支持 PDF、TXT、MD、DOCX 格式</span>
                  </div>
                  {documentsLoading ? <div className="flex justify-center py-8"><Spin /></div> :
                   documents.length === 0 ? <Empty description="暂无文档" className="py-8" /> :
                   <div className="space-y-2">
                     {documents.map(doc => (
                       <div key={doc.id} className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded-lg">
                         <div className="flex items-center gap-3">
                           <FileTextOutlined className="text-xl text-[var(--color-text-tertiary)]" />
                           <div>
                             <div className="font-medium text-[var(--color-text-primary)]">{doc.name}</div>
                             <div className="text-sm text-[var(--color-text-tertiary)]">{formatSize(doc.size)} · {doc.chunkCount} 分片</div>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <Tag color={statusConfig[doc.status]?.color}>{statusConfig[doc.status]?.text}</Tag>
                           <Button type="text" danger size="small" onClick={() => handleDeleteDocument(doc.id)}>删除</Button>
                         </div>
                       </div>
                     ))}
                   </div>}
                </div>
              )}
              {activeTab === 'search' && <SearchPanel knowledgeBaseId={selectedKB.id} />}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">分片配置</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div><div className="text-sm text-[var(--color-text-tertiary)]">分片大小</div><div className="text-[var(--color-text-primary)] mt-1">{selectedKB.config.chunkingStrategy.chunkSize} 字符</div></div>
                      <div><div className="text-sm text-[var(--color-text-tertiary)]">重叠大小</div><div className="text-[var(--color-text-primary)] mt-1">{selectedKB.config.chunkingStrategy.chunkOverlap} 字符</div></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">检索配置</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div><div className="text-sm text-[var(--color-text-tertiary)]">返回数量</div><div className="text-[var(--color-text-primary)] mt-1">{selectedKB.config.retrievalConfig.topK}</div></div>
                      <div><div className="text-sm text-[var(--color-text-tertiary)]">相似度阈值</div><div className="text-[var(--color-text-primary)] mt-1">{selectedKB.config.retrievalConfig.scoreThreshold}</div></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
      <Modal title="创建知识库" open={showCreateModal} onCancel={() => setShowCreateModal(false)} footer={null} width={600} destroyOnHidden>
        <div className="p-4 text-center text-[var(--color-text-secondary)]">知识库创建功能开发中...</div>
      </Modal>
    </div>
  );
}
