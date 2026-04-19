/**
 * 发布 Skill 视图组件 (V2)
 * 支持 ZIP 上传、SKILL.md 预览、命名空间选择
 */

import { useState, useCallback } from 'react';
import {
  Form,
  Select,
  Button,
  Typography,
  Card,
  Upload,
  Progress,
  message,
  Radio,
  Alert,
  Descriptions,
  Tag,
  Space,
  Divider,
} from 'antd';
import {
  CloudUploadOutlined,
  InboxOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useSkillHubStore } from '@/stores/useSkillHubStore';
import type { SkillVisibility, NamespaceType } from '@/types/skill';
import JSZip from 'jszip';

const { Text, Title, Paragraph } = Typography;
const { Dragger } = Upload;

interface ParsedMetadata {
  name?: string;
  displayName?: string;
  description?: string;
  version?: string;
  author?: string;
  tags?: string[];
  readme?: string;
}

export function PublishSkillViewV2() {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedMetadata, setParsedMetadata] = useState<ParsedMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    namespaces,
    loadNamespaces,
    publish,
    publishLoading,
    publishResult,
  } = useSkillHubStore();

  // Load namespaces on mount
  useState(() => {
    loadNamespaces();
  });

  const handleFileSelect = async (file: File) => {
    setError(null);
    setParsedMetadata(null);

    // Check file type
    if (!file.name.endsWith('.zip')) {
      setError('请上传 ZIP 格式的文件');
      return false;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('文件大小不能超过 50MB');
      return false;
    }

    // Parse ZIP to find SKILL.md
    try {
      const zip = await JSZip.loadAsync(file);
      const skillMdFile = zip.file('SKILL.md') || zip.file('skill.md');

      if (skillMdFile) {
        const content = await skillMdFile.async('string');
        const metadata = parseSkillMd(content);
        setParsedMetadata(metadata);
      } else {
        // List files in the ZIP
        const files = Object.keys(zip.files);
        message.info(`ZIP 包包含 ${files.length} 个文件 (未找到 SKILL.md)`);
      }

      // Count files and total size
      const fileCount = Object.keys(zip.files).length;
      message.success(`解析成功: ${fileCount} 个文件`);
    } catch (err) {
      setError('ZIP 文件解析失败');
      return false;
    }

    setFileList([file]);
    return false; // Prevent auto upload
  };

  const parseSkillMd = (content: string): ParsedMetadata => {
    const lines = content.split('\n');
    const metadata: ParsedMetadata = {};
    let inFrontMatter = false;
    let frontMatterLines: string[] = [];
    let readmeLines: string[] = [];

    for (const line of lines) {
      if (line === '---') {
        if (!inFrontMatter) {
          inFrontMatter = true;
          continue;
        } else {
          inFrontMatter = false;
          continue;
        }
      }

      if (inFrontMatter) {
        frontMatterLines.push(line);
      } else {
        readmeLines.push(line);
      }
    }

    // Parse front matter
    for (const line of frontMatterLines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        if (key === 'tags') {
          try {
            metadata[key as keyof ParsedMetadata] = JSON.parse(value);
          } catch {
            // Skip invalid JSON
          }
        } else {
          metadata[key as keyof ParsedMetadata] = value;
        }
      }
    }

    metadata.readme = readmeLines.join('\n').trim();
    return metadata;
  };

  const handleSubmit = async (values: {
    namespace: string;
    visibility: SkillVisibility;
  }) => {
    if (fileList.length === 0) {
      message.error('请先选择要上传的文件');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const result = await publish(values.namespace, fileList[0], values.visibility);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result) {
        message.success('发布成功！技能已进入审核流程');
        // Reset form
        setFileList([]);
        setParsedMetadata(null);
        setError(null);
        setUploadProgress(0);
      } else {
        message.error('发布失败，请重试');
      }
    } catch (err) {
      clearInterval(progressInterval);
      message.error('发布失败: ' + (err as Error).message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const uploadProps: UploadProps = {
    fileList,
    onChange: ({ fileList }) => setFileList(fileList),
    beforeUpload: handleFileSelect,
    onRemove: () => {
      setFileList([]);
      setParsedMetadata(null);
      setError(null);
    },
    maxCount: 1,
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto w-full">
        {/* 头部 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CloudUploadOutlined style={{ fontSize: 24 }} />
            <Title level={4} style={{ margin: 0 }}>发布 Skill 到 Hub</Title>
          </div>
          <Paragraph type="secondary">
            上传技能包 (ZIP) 到技能仓库。ZIP 包应包含 SKILL.md 元数据文件和技能代码。
          </Paragraph>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            visibility: 'PUBLIC' as SkillVisibility,
          }}
        >
          {/* 上传区域 */}
          <Card
            title="上传技能包"
            size="small"
            className="mb-4"
            extra={
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // Show SKILL.md format guide
                  message.info('SKILL.md 格式: --- 字段名: 值 ---\\n\\nREADME 内容');
                }}
              >
                SKILL.md 格式说明
              </a>
            }
          >
            <Dragger
              {...uploadProps}
              disabled={uploading}
              accept=".zip"
              style={{ marginBottom: 16 }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 48 }} />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">支持 ZIP 格式，最大 50MB</p>
            </Dragger>

            {uploading && (
              <Progress percent={uploadProgress} status="active" />
            )}

            {error && (
              <Alert
                type="error"
                message={error}
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 16 }}
              />
            )}

            {parsedMetadata && (
              <Alert
                type="success"
                message="SKILL.md 解析成功"
                showIcon
                icon={<CheckCircleOutlined />}
                style={{ marginBottom: 16 }}
              >
                <Descriptions size="small" column={2}>
                  {parsedMetadata.displayName && (
                    <Descriptions.Item label="名称">{parsedMetadata.displayName}</Descriptions.Item>
                  )}
                  {parsedMetadata.name && (
                    <Descriptions.Item label="标识">{parsedMetadata.name}</Descriptions.Item>
                  )}
                  {parsedMetadata.version && (
                    <Descriptions.Item label="版本">{parsedMetadata.version}</Descriptions.Item>
                  )}
                  {parsedMetadata.author && (
                    <Descriptions.Item label="作者">{parsedMetadata.author}</Descriptions.Item>
                  )}
                </Descriptions>
                {parsedMetadata.description && (
                  <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                    {parsedMetadata.description}
                  </Paragraph>
                )}
                {parsedMetadata.tags && parsedMetadata.tags.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {parsedMetadata.tags.map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                )}
              </Alert>
            )}
          </Card>

          {/* 发布设置 */}
          <Card title="发布设置" size="small" className="mb-4">
            <Form.Item
              name="namespace"
              label="命名空间"
              rules={[{ required: true, message: '请选择命名空间' }]}
            >
              <Select
                placeholder="选择命名空间"
                loading={namespaces.length === 0}
                options={namespaces.map(ns => ({
                  label: `${ns.displayName} (${ns.slug})`,
                  value: ns.slug,
                  disabled: ns.status !== 'ACTIVE',
                }))}
              />
            </Form.Item>

            <Form.Item
              name="visibility"
              label="可见性"
              rules={[{ required: true }]}
            >
              <Radio.Group>
                <Radio value="PUBLIC">公开</Radio>
                <Radio value="NAMESPACE_ONLY">仅命名空间内</Radio>
                <Radio value="PRIVATE">私有</Radio>
              </Radio.Group>
            </Form.Item>

            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              • 公开: 所有人可见可安装
              <br />
              • 仅命名空间内: 只有命名空间成员可见
              <br />
              • 私有: 仅自己可见
            </Paragraph>
          </Card>

          {/* 发布说明 */}
          <Card title="发布流程" size="small" className="mb-4">
            <ol className="pl-4 space-y-1 text-sm text-gray-600">
              <li>上传 ZIP 包后，系统会自动解析 SKILL.md 文件</li>
              <li>技能将进入 <Tag color="default">草稿</Tag> 状态</li>
              <li>你可以选择直接发布（私有）或提交审核（公开/命名空间）</li>
              <li>审核通过后，技能将发布到 Hub 供其他用户安装</li>
            </ol>
          </Card>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setFileList([]);
                setParsedMetadata(null);
                setError(null);
                form.resetFields();
              }}
              disabled={uploading}
            >
              重置
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<CloudUploadOutlined />}
              loading={publishLoading}
              disabled={fileList.length === 0 || uploading}
            >
              {publishLoading ? '发布中...' : '发布到 Hub'}
            </Button>
          </div>
        </Form>

        {/* 发布结果 */}
        {publishResult && (
          <Card
            title="发布结果"
            size="small"
            className="mt-4"
            extra={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />}
          >
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="技能 ID">{publishResult.skillId}</Descriptions.Item>
              <Descriptions.Item label="标识">{publishResult.slug}</Descriptions.Item>
              <Descriptions.Item label="版本">{publishResult.version}</Descriptions.Item>
              <Descriptions.Item label="状态">{publishResult.status}</Descriptions.Item>
              <Descriptions.Item label="文件数">{publishResult.fileCount}</Descriptions.Item>
              <Descriptions.Item label="大小">{(publishResult.totalSize / 1024).toFixed(1)} KB</Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </div>
    </div>
  );
}
