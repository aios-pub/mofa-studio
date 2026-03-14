/**
 * 文档上传组件
 */

import { useState, useRef } from 'react';
import { Upload, Button, message, Progress, List } from 'antd';
import { CloudUploadOutlined, FileTextOutlined, DeleteOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

interface DocumentUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFileSize?: number; // MB
  accept?: string;
}

interface UploadingFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export default function DocumentUploader({
  onUpload,
  maxFileSize = 50,
  accept = '.pdf,.txt,.md,.docx,.doc',
}: DocumentUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 验证文件大小
    const oversizedFiles = files.filter((f) => f.size > maxFileSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      message.error(`以下文件超过 ${maxFileSize}MB 限制: ${oversizedFiles.map((f) => f.name).join(', ')}`);
      return;
    }

    // 添加到上传列表
    const newFiles: UploadingFile[] = files.map((file) => ({
      file,
      status: 'pending',
      progress: 0,
    }));
    setUploadingFiles((prev) => [...prev, ...newFiles]);

    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 开始上传
    for (const uf of newFiles) {
      // 更新状态为上传中
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.file === uf.file ? { ...item, status: 'uploading' } : item
        )
      );

      try {
        await onUpload([uf.file]);
        setUploadingFiles((prev) =>
          prev.map((item) =>
            item.file === uf.file ? { ...item, status: 'success', progress: 100 } : item
          )
        );
      } catch (error) {
        setUploadingFiles((prev) =>
          prev.map((item) =>
            item.file === uf.file
              ? { ...item, status: 'error', error: String(error) }
              : item
          )
        );
      }
    }
  };

  const handleRemove = (file: File) => {
    setUploadingFiles((prev) => prev.filter((item) => item.file !== file));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getFileTypeIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return '📕';
      case 'doc':
      case 'docx':
        return '📘';
      case 'md':
        return '📝';
      case 'txt':
        return '📄';
      default:
        return '📁';
    }
  };

  return (
    <div className="space-y-4">
      {/* 上传按钮 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="primary"
        icon={<CloudUploadOutlined />}
        onClick={() => fileInputRef.current?.click()}
      >
        上传文档
      </Button>

      {/* 上传列表 */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((item) => (
            <div
              key={item.file.name + item.file.size}
              className="flex items-center gap-3 p-3 bg-[var(--color-bg-tertiary)] rounded-lg"
            >
              <span className="text-xl">{getFileTypeIcon(item.file.name)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--color-text-primary)] truncate">
                    {item.file.name}
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    {formatSize(item.file.size)}
                  </span>
                </div>
                {item.status === 'uploading' && (
                  <Progress percent={item.progress} size="small" className="mt-1" />
                )}
                {item.status === 'error' && (
                  <span className="text-xs text-red-500">{item.error}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.status === 'success' && (
                  <CheckCircleOutlined className="text-green-500" />
                )}
                {item.status === 'uploading' && (
                  <LoadingOutlined className="text-blue-500" />
                )}
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemove(item.file)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 提示信息 */}
      <div className="text-sm text-[var(--color-text-tertiary)]">
        <p>支持的格式: PDF, TXT, MD, DOCX</p>
        <p>单个文件最大: {maxFileSize}MB</p>
      </div>
    </div>
  );
}
