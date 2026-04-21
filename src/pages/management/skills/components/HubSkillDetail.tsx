/**
 * Hub Skill 详情页
 * 多 Tab 布局：概览、版本、文件、README
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Tabs,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Card,
  Divider,
  message,
  Spin,
  Tooltip,
} from "antd";
import {
  DownloadOutlined,
  ShareAltOutlined,
  FlagOutlined,
  CloudDownloadOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useSkillHubStore } from "@/stores/useSkillHubStore";
import { InstallCommand } from "@/components/skill-hub/install-command";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { VersionList } from "./VersionList";
import { FileTreeBrowser } from "./FileTreeBrowser";
import { FilePreview } from "./FilePreview";
import { StarButton } from "./StarButton";
import { RatingInput } from "./RatingInput";
import { LabelPanel } from "./LabelPanel";

const { Title, Paragraph, Text } = Typography;

export function HubSkillDetail() {
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
    installSkillFromHub,
    installingSkillIds,
    installedSkillIds,
  } = useSkillHubStore();

  const [activeTab, setActiveTab] = useState("overview");
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
    setActiveTab("files");
  };

  const handleFileSelect = (path: string) => {
    if (namespace && slug && selectedVersion) {
      loadFileContent(namespace, slug, selectedVersion, path);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    message.success("链接已复制到剪贴板");
  };

  const handleDownload = async () => {
    if (!namespace || !slug) return;
    try {
      const blob = await useSkillHubStore
        .getState()
        .downloadSkillBundle(namespace, slug);
      if (!blob) {
        message.error("下载失败");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${namespace}--${slug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("下载成功");
    } catch {
      message.error("下载失败");
    }
  };

  const handleInstall = async () => {
    if (!namespace || !slug || !selectedHubSkill) return;
    const success = await installSkillFromHub(
      namespace,
      slug,
      selectedHubSkill.id,
    );
    if (success) {
      message.success("安装成功");
    }
  };

  const handleBack = () => {
    navigate("/management/skills");
  };

  if (detailLoading || !selectedHubSkill) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const { latestVersion, labels, tags } = selectedHubSkill;

  const isInstalling = selectedHubSkill
    ? installingSkillIds.has(selectedHubSkill.id)
    : false;
  const isInstalled = selectedHubSkill
    ? installedSkillIds.has(selectedHubSkill.id)
    : false;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={handleBack}
        className="mb-4"
        type="text"
      >
        返回 Skill Hub
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Title level={2} className="m-0">
                {selectedHubSkill.displayName || selectedHubSkill.slug}
              </Title>
              <Tag color="blue">{selectedHubSkill.visibility}</Tag>
              <Tag
                color={selectedHubSkill.status === "ACTIVE" ? "green" : "red"}
              >
                {selectedHubSkill.status}
              </Tag>
            </div>
            <Paragraph className="text-gray-600 mb-4">
              {selectedHubSkill.summary || "暂无描述"}
            </Paragraph>
            <Text type="secondary">
              {selectedHubSkill.namespaceSlug}/{selectedHubSkill.slug}
            </Text>
            <Divider type="vertical" />
            <Text type="secondary">
              作者: {selectedHubSkill.ownerName || selectedHubSkill.ownerId}
            </Text>
          </div>

          {/* Action Buttons */}
          <Space>
            <StarButton skillId={selectedHubSkill.id} />
            <RatingInput skillId={selectedHubSkill.id} />
            <Button
              type={isInstalled ? "default" : "primary"}
              icon={
                isInstalling ? (
                  <Spin size="small" />
                ) : isInstalled ? (
                  <CheckCircleOutlined />
                ) : (
                  <CloudDownloadOutlined />
                )
              }
              onClick={handleInstall}
              disabled={isInstalling || isInstalled}
            >
              {isInstalling ? "安装中..." : isInstalled ? "已安装" : "安装"}
            </Button>
            <Tooltip title="下载 ZIP 包">
              <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                下载
              </Button>
            </Tooltip>
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
            <div className="text-lg font-semibold">
              {selectedHubSkill.downloadCount}
            </div>
          </div>
          <div>
            <Text type="secondary">Star</Text>
            <div className="text-lg font-semibold">
              {selectedHubSkill.starCount}
            </div>
          </div>
          <div>
            <Text type="secondary">评分</Text>
            <div className="text-lg font-semibold">
              {selectedHubSkill.ratingCount > 0
                ? `${selectedHubSkill.ratingAvg} (${selectedHubSkill.ratingCount})`
                : "-"}
            </div>
          </div>
          <div>
            <Text type="secondary">版本</Text>
            <div className="text-lg font-semibold">
              {latestVersion?.version || "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Labels & Tags */}
      {(labels.length > 0 || tags.length > 0) && (
        <div className="mb-4">
          <Space wrap>
            {labels.map((label) => (
              <Tag
                key={label.id}
                color={label.type === "RECOMMENDED" ? "blue" : "purple"}
              >
                {label.displayName}
              </Tag>
            ))}
            {tags.map((tag) => (
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
            key: "overview",
            label: "概览",
            children: (
              <div className="space-y-4">
                <Card title="技能信息" bordered={false}>
                  <Descriptions column={2}>
                    <Descriptions.Item label="ID">
                      {selectedHubSkill.id}
                    </Descriptions.Item>
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

                {/* Install Command */}
                <Card title="安装命令" bordered={false}>
                  <InstallCommand
                    namespace={selectedHubSkill.namespaceSlug}
                    slug={selectedHubSkill.slug}
                    version={latestVersion?.version}
                  />
                  <Paragraph type="secondary" className="mt-2 text-xs">
                    复制以上命令到终端执行，即可通过 CLI 安装此技能
                  </Paragraph>
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
                          "# 暂无说明",
                      )}
                    </ReactMarkdown>
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: "versions",
            label: "版本",
            children: (
              <VersionList
                namespace={namespace || ""}
                slug={slug || ""}
                versions={selectedHubSkillVersions?.items || []}
                onVersionSelect={handleVersionSelect}
                onRefresh={() =>
                  namespace && slug && loadVersions(namespace, slug)
                }
              />
            ),
          },
          {
            key: "files",
            label: "文件",
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
            key: "labels",
            label: "标签",
            children: <LabelPanel skillId={selectedHubSkill.id} />,
          },
        ]}
      />
    </div>
  );
}
