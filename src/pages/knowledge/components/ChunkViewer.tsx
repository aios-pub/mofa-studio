/**
 * 分片查看器组件
 */

import { useState } from 'react';
import { Modal, List, Tag, Empty, Spin, Button } from 'antd';
import { FileTextOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { message } from 'antd';
import type { Chunk } from '../../../types/knowledge';

interface ChunkViewerProps {
  open: boolean;
  onClose: () => void;
  documentId?: string;
  chunks: Chunk[];
  loading?: boolean;
}

export default function ChunkViewer({
  open,
  onClose,
  documentId,
  chunks,
  loading,
}: ChunkViewerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (chunk: Chunk) => {
    try {
      await navigator.clipboard.writeText(chunk.content);
      setCopiedId(chunk.id);
      message.success('已复制到剪贴板');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      message.error('复制失败');
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined />
          <span>文档分片</span>
          <Tag color="blue">{chunks.length} 个分片</Tag>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : chunks.length === 0 ? (
        <Empty description="暂无分片数据" className="py-12" />
      ) : (
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {chunks.map((chunk, index) => (
            <div
              key={chunk.id}
              className="p-3 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Tag color="default">#{index + 1}</Tag>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    位置: {chunk.position}
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    Tokens: {chunk.tokens}
                  </span>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={copiedId === chunk.id ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={() => handleCopy(chunk)}
                />
              </div>
              <div className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap font-mono">
                {chunk.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
