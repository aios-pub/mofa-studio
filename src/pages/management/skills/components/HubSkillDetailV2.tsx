/**
 * Hub Skill 详情页 (V2)
 * 多 Tab 布局：概览、版本、文件、README
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tabs,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Card,
  Badge,
  Divider,
  message,
  Spin,
} from 'antd';
import {
  StarOutlined,
  StarFilled,
  DownloadOutlined,
  ShareAltOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import { useSkillHubStore } from '@/stores/useSkillHubStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { VersionList } from './VersionList';
import { FileTreeBrowser } from './FileTreeBrowser';
import { FilePreview } from './FilePreview';
import { StarButton } from './StarButton';
import { RatingInput } from './RatingInput';
import { LabelPanel } from './LabelPanel';

const { Title, Paragraph, Text } = Typography;

export function HubSkillDetailV2() {
  const { namespace, slug } = useParams<{ namespace: string; slug: string }>();
  const navigate = useNavigate();

  const {
    selectedHubSkill,
    detailLoading,
    loadSkillDetail,
    loadVersions,
    selectedHubSkillVersions,
    loadFiles,
    currentFiles,
    loadFileContent,
    selectedFileContent,
    selectedFileName,
    fileLoading,
  } = useSkillHubStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>();

  useEffect(() => {
    if (namespace && slug) {
      loadSkillDetail(namespace, slug);
      loadVersions(namespace, slug);
    }
  }, [namespace, slug]);

  const handleVersionSelect = (version: string) => {
    setSelectedVersion(version);
    if (namespace && slug) {
      loadFiles(namespace, slug, version);
    }
    setActiveTab('files');
  };

  const handleFileSelect = (path: string) => {
    if (namespace && slug && selectedVersion) {
      loadFileContent(namespace, slug, selectedVersion, path);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    message.success('链接已复制到剪贴板');
  };

  const handleDownload = async () => {
    if (!namespace || !slug) return;
    try {
      const blob = await useSkillHubStore.getState().publishResult
        ? new Blob()
        : await fetch(`/api/skill-hub/v1/${namespace}/${slug}/download`).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('下载成功');
    } catch {
      message.error('下载失败');
    }
  };

  if (detailLoading || !selectedHubSkill) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const { latestVersion, labels, tags } = selectedHubSkill;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Title level={2} className="m-0">
                {selectedHubSkill.displayName || selectedHubSkill.slug}
              </Title>
              <Tag color="blue">{selectedHubSkill.visibility}</Tag>
              <Tag color={selectedHubSkill.status === 'ACTIVE' ? 'green' : 'red'}>
                {selectedHubSkill.status}
              </Tag>
            </div>
            <Paragraph className="text-gray-600 mb-4">
              {selectedHubSkill.summary || '暂无描述'}
            </Paragraph>
            <Text type="secondary">
              {selectedHubSkill.namespaceSlug}/{selectedHubSkill.slug}
            </Text>
            <Divider type="vertical" />
            <Text type="secondary">作者: {selectedHubSkill.ownerDisplayName || selectedHubSkill.ownerId}</Text>
          </div>

          {/* Action Buttons */}
          <Space>
            <StarButton skillId={selectedHubSkill.id} />
            <RatingInput skillId={selectedHubSkill.id} />
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              下载
            </Button>
            <Button icon={<ShareAltOutlined />} onClick={handleShare}>
              分享
            </Button>
            <Button icon={<FlagOutlined />} type="text" danger>
              举报
            </Button>
          </Space>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <div>
            <Text type="secondary">下载</Text>
            <div className="text-lg font-semibold">{selectedHubSkill.downloadCount}</div>
          </div>
          <div>
            <Text type="secondary">Star</Text>
            <div className="text-lg font-semibold">{selectedHubSkill.starCount}</div>
          </div>
          <div>
            <Text type="secondary">评分</Text>
            <div className="text-lg font-semibold">
              {selectedHubSkill.ratingCount > 0
                ? `${selectedHubSkill.ratingAvg} (${selectedHubSkill.ratingCount})`
                : '-'}
            </div>
          </div>
          <div>
            <Text type="secondary">版本</Text>
            <div className="text-lg font-semibold">
              {latestVersion?.version || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Labels & Tags */}
      {(labels.length > 0 || tags.length > 0) && (
        <div className="mb-4">
          <Space wrap>
            {labels.map(label => (
              <Tag key={label.id} color={label.type === 'RECOMMENDED' ? 'blue' : 'purple'}>
                {label.displayName}
              </Tag>
            ))}
            {tags.map(tag => (
              <Tag key={tag} color="default">
                {tag}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: '概览',
            children: (
              <div className="space-y-4">
                <Card title="技能信息" bordered={false}>
                  <Descriptions column={2}>
                    <Descriptions.Item label="ID">{selectedHubSkill.id}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {selectedHubSkill.createdAt.toLocaleDateString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间">
                      {selectedHubSkill.updatedAt.toLocaleDateString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="可见性">
                      {selectedHubSkill.visibility}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                {latestVersion?.parsedMetadataJson && (
                  <Card title="README" bordered={false}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {String(
                        latestVersion.parsedMetadataJson.description ||
                          latestVersion.parsedMetadataJson.readme ||
                          '# 暂无说明'
                      )}
                    </ReactMarkdown>
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'versions',
            label: '版本',
            children: (
              <VersionList
                versions={selectedHubSkillVersions?.items || []}
                onVersionSelect={handleVersionSelect}
              />
            ),
          },
          {
            key: 'files',
            label: '文件',
            disabled: !selectedVersion,
            children: selectedVersion ? (
              <div className="flex gap-4">
                <div className="w-1/3">
                  <FileTreeBrowser
                    files={currentFiles}
                    onFileSelect={handleFileSelect}
                  />
                </div>
                <div className="flex-1">
                  {selectedFileName && (
                    <FilePreview
                      fileName={selectedFileName}
                      content={selectedFileContent}
                      loading={fileLoading}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                请先选择一个版本
              </div>
            ),
          },
          {
            key: 'labels',
            label: '标签',
            children: <LabelPanel skillId={selectedHubSkill.id} />,
          },
        ]}
      />
    </div>
  );
}
