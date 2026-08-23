/**
 * 发布 Skill 视图组件
 * 支持 ZIP 上传、SKILL.md 预览、命名空间选择
 */

import { useState, useEffect } from "react";
import {
  Form,
  Select,
  Button,
  Typography,
  Card,
  Upload,
  Progress,
  App,
  Radio,
  Alert,
  Descriptions,
  Tag,
  Divider,
  Modal,
} from "antd";
import {
  CloudUploadOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useSkillHubStore } from "@/stores/useSkillHubStore";
import type { SkillVisibility } from "@/types/skill";
import JSZip from "jszip";

const { Title, Paragraph } = Typography;
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

interface PublishSkillViewProps {
  onSwitchToNamespaces?: () => void;
}

export function PublishSkillView({
  onSwitchToNamespaces,
}: PublishSkillViewProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedMetadata, setParsedMetadata] = useState<ParsedMetadata | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [formatModalOpen, setFormatModalOpen] = useState(false);

  const { namespaces, loadNamespaces, publish, publishLoading, publishResult } =
    useSkillHubStore();

  // Load namespaces on mount
  useEffect(() => {
    loadNamespaces();
  }, []);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setParsedMetadata(null);

    // Check file type
    if (!file.name.endsWith(".zip")) {
      setError("请上传 ZIP 格式的文件");
      return false;
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError("文件大小不能超过 50MB");
      return false;
    }

    // Parse ZIP to find SKILL.md
    try {
      const zip = await JSZip.loadAsync(file);

      // Recursively search for SKILL.md (case-insensitive)
      const allFiles = Object.keys(zip.files);
      const skillMdPath = allFiles.find(path => {
        const fileName = path.split('/').pop()?.toLowerCase();
        return fileName === 'skill.md';
      });

      let metadata: ParsedMetadata | null = null;
      if (skillMdPath) {
        const skillMdFile = zip.file(skillMdPath);
        if (skillMdFile) {
          const content = await skillMdFile.async("string");
          metadata = parseSkillMd(content);
          setParsedMetadata(metadata);
        }
      }

      if (!metadata) {
        // List files in the ZIP for debugging
        message.info(`ZIP 包包含 ${allFiles.length} 个文件 (未找到 SKILL.md)。文件列表: ${allFiles.slice(0, 5).join(', ')}${allFiles.length > 5 ? '...' : ''}`);
      }

      // Count files and total size
      const fileCount = Object.keys(zip.files).length;
      message.success(`解析成功: ${fileCount} 个文件`);
    } catch (err) {
      setError("ZIP 文件解析失败");
      return false;
    }

    setFileList([file]);
    return false; // Prevent auto upload
  };

  const parseSkillMd = (content: string): ParsedMetadata => {
    const lines = content.split("\n");
    const metadata: ParsedMetadata = {};
    let inFrontMatter = false;
    let frontMatterLines: string[] = [];
    let readmeLines: string[] = [];

    for (const line of lines) {
      if (line === "---") {
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
        if (key === "tags") {
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

    metadata.readme = readmeLines.join("\n").trim();
    return metadata;
  };

  const handleSubmit = async (values: {
    namespace: string;
    visibility: SkillVisibility;
  }) => {
    if (fileList.length === 0) {
      message.error("请先选择要上传的文件");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const file = fileList[0].originFileObj;
      if (!file) {
        message.error("文件对象无效，请重新选择文件");
        return;
      }

      const result = await publish(
        values.namespace,
        file,
        values.visibility,
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result) {
        message.success("发布成功！技能已进入审核流程");
        // Reset form
        setFileList([]);
        setParsedMetadata(null);
        setError(null);
        setUploadProgress(0);
      } else {
        message.error("发布失败，请重试");
      }
    } catch (err) {
      clearInterval(progressInterval);
      message.error("发布失败: " + (err as Error).message);
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
            <Title level={4} style={{ margin: 0 }}>
              发布 Skill 到 Hub
            </Title>
          </div>
          <Paragraph type="secondary">
            上传技能包 (ZIP) 到技能仓库。ZIP 包应包含 SKILL.md
            元数据文件和技能代码。
          </Paragraph>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            visibility: "NAMESPACE_ONLY" as SkillVisibility,
          }}
        >
          {/* 上传区域 */}
          <Card
            title="上传技能包"
            size="small"
            className="mb-4"
            extra={
              <a onClick={() => setFormatModalOpen(true)}>SKILL.md 格式说明</a>
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

            {uploading && <Progress percent={uploadProgress} status="active" />}

            {error && (
              <Alert
                type="error"
                title={error}
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 16 }}
              />
            )}

            {parsedMetadata && (
              <Alert
                type="success"
                title="SKILL.md 解析成功"
                showIcon
                icon={<CheckCircleOutlined />}
                style={{ marginBottom: 16 }}
              >
                <Descriptions size="small" column={2}>
                  {parsedMetadata.display_name && (
                    <Descriptions.Item label="名称">
                      {parsedMetadata.display_name}
                    </Descriptions.Item>
                  )}
                  {parsedMetadata.name && (
                    <Descriptions.Item label="标识">
                      {parsedMetadata.name}
                    </Descriptions.Item>
                  )}
                  {parsedMetadata.version && (
                    <Descriptions.Item label="版本">
                      {parsedMetadata.version}
                    </Descriptions.Item>
                  )}
                  {parsedMetadata.author && (
                    <Descriptions.Item label="作者">
                      {parsedMetadata.author}
                    </Descriptions.Item>
                  )}
                </Descriptions>
                {parsedMetadata.description && (
                  <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                    {parsedMetadata.description}
                  </Paragraph>
                )}
                {parsedMetadata.tags && parsedMetadata.tags.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {parsedMetadata.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                )}
              </Alert>
            )}
          </Card>

          {/* 发布设置 */}
          <Card title="发布设置" size="small" className="mb-4">
            {namespaces.length === 0 && (
              <Alert
                title="暂无可用命名空间"
                description="发布技能需要先创建命名空间。请前往命名空间管理页面创建。"
                type="warning"
                showIcon
                action={
                  <Button
                    type="primary"
                    size="small"
                    icon={<TeamOutlined />}
                    onClick={onSwitchToNamespaces}
                  >
                    前往创建
                  </Button>
                }
                style={{ marginBottom: 16 }}
              />
            )}
            <Form.Item
              name="namespace"
              label="命名空间"
              rules={[{ required: true, message: "请选择命名空间" }]}
            >
              <Select
                placeholder="选择命名空间"
                loading={namespaces.length === 0}
                options={namespaces.map((ns) => ({
                  label: `${ns.display_name} (${ns.slug})`,
                  value: ns.slug,
                  disabled: ns.status !== "ACTIVE",
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
              <br />• 私有: 仅自己可见
            </Paragraph>
          </Card>

          {/* 发布说明 */}
          <Card title="发布流程" size="small" className="mb-4">
            <ol className="pl-4 space-y-1 text-sm text-gray-600">
              <li>上传 ZIP 包后，系统会自动解析 SKILL.md 文件</li>
              <li>
                技能将进入 <Tag color="default">草稿</Tag> 状态
              </li>
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
              {publishLoading ? "发布中..." : "发布到 Hub"}
            </Button>
          </div>
        </Form>

        {/* 发布结果 */}
        {publishResult && (
          <Card
            title="发布结果"
            size="small"
            className="mt-4"
            extra={
              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 20 }} />
            }
          >
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="技能 ID">
                {publishResult.skill_id}
              </Descriptions.Item>
              <Descriptions.Item label="标识">
                {publishResult.slug}
              </Descriptions.Item>
              <Descriptions.Item label="版本">
                {publishResult.version}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {publishResult.status}
              </Descriptions.Item>
              <Descriptions.Item label="文件数">
                {publishResult.file_count}
              </Descriptions.Item>
              <Descriptions.Item label="大小">
                {(publishResult.total_size / 1024).toFixed(1)} KB
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </div>

      {/* SKILL.md 格式说明Modal */}
      <Modal
        title="SKILL.md 格式说明"
        open={formatModalOpen}
        onCancel={() => setFormatModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setFormatModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        <div className="space-y-4">
          {/* 技能包结构 */}
          <div>
            <Title level={5}>技能包结构</Title>
            <Paragraph type="secondary">一个标准的技能包结构如下：</Paragraph>
            <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm">
              my-skill/
              <br />
              ├─ SKILL.md{" "}
              <span className="text-gray-500"># 主入口文件（必需）</span>
              <br />
              ├─ references/{" "}
              <span className="text-gray-500"># 参考资料（可选）</span>
              <br />
              ├─ scripts/ <span className="text-gray-500"># 脚本（可选）</span>
              <br />
              └─ assets/{" "}
              <span className="text-gray-500"># 静态资源（可选）</span>
            </div>
          </div>

          <Divider />

          {/* SKILL.md 格式 */}
          <div>
            <Title level={5}>SKILL.md 格式</Title>
            <Paragraph type="secondary">
              SKILL.md 使用 YAML frontmatter + Markdown 正文格式：
            </Paragraph>
            <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre-wrap">
                ---
                <span className="text-blue-600">name</span>: my-skill
                <span className="text-blue-600">description</span>:
                一句话描述这个技能的用途
                <span className="text-blue-600">version</span>: 1.0.0
                <span className="text-blue-600">author</span>: Your Name
                <span className="text-blue-600">tags</span>: ["category1",
                "category2"] --- # 技能说明 这里是技能的详细说明...
              </pre>
            </div>
          </div>

          <Divider />

          {/* Frontmatter 字段说明 */}
          <div>
            <Title level={5}>Frontmatter 字段说明</Title>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold">字段</th>
                    <th className="text-left py-2 px-3 font-semibold">必需</th>
                    <th className="text-left py-2 px-3 font-semibold">说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-mono text-blue-600">name</td>
                    <td className="py-2 px-3">
                      <Tag color="red" className="m-0">
                        是
                      </Tag>
                    </td>
                    <td className="py-2 px-3">
                      技能标识，kebab-case 格式（小写字母、数字、连字符）
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-mono text-blue-600">
                      description
                    </td>
                    <td className="py-2 px-3">
                      <Tag color="red" className="m-0">
                        是
                      </Tag>
                    </td>
                    <td className="py-2 px-3">技能简短描述</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-mono text-blue-600">
                      version
                    </td>
                    <td className="py-2 px-3">
                      <Tag color="default" className="m-0">
                        否
                      </Tag>
                    </td>
                    <td className="py-2 px-3">
                      版本号，遵循语义化版本规范（如 1.0.0）
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-mono text-blue-600">
                      author
                    </td>
                    <td className="py-2 px-3">
                      <Tag color="default" className="m-0">
                        否
                      </Tag>
                    </td>
                    <td className="py-2 px-3">作者名称</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-mono text-blue-600">tags</td>
                    <td className="py-2 px-3">
                      <Tag color="default" className="m-0">
                        否
                      </Tag>
                    </td>
                    <td className="py-2 px-3">
                      标签数组，JSON 格式，如 ["code", "review"]
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Divider />

          {/* 文件限制 */}
          <div>
            <Title level={5}>文件限制</Title>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
              <li>单文件大小：最大 1MB</li>
              <li>总包大小：最大 50MB</li>
              <li>文件数量：最多 100 个</li>
              <li>
                允许的文件类型：
                <code className="bg-gray-100 px-1 rounded">.md</code>、
                <code className="bg-gray-100 px-1 rounded">.txt</code>、
                <code className="bg-gray-100 px-1 rounded">.json</code>、
                <code className="bg-gray-100 px-1 rounded">.yaml</code>、
                <code className="bg-gray-100 px-1 rounded">.yml</code>、
                <code className="bg-gray-100 px-1 rounded">.js</code>、
                <code className="bg-gray-100 px-1 rounded">.ts</code>、
                <code className="bg-gray-100 px-1 rounded">.py</code>、
                <code className="bg-gray-100 px-1 rounded">.sh</code>、
                <code className="bg-gray-100 px-1 rounded">.png</code>、
                <code className="bg-gray-100 px-1 rounded">.jpg</code>、
                <code className="bg-gray-100 px-1 rounded">.svg</code>
              </li>
            </ul>
          </div>

          {/* 示例 */}
          <div>
            <Title level={5}>完整示例</Title>
            <Paragraph type="secondary">
              以下是一个完整的 SKILL.md 示例：
            </Paragraph>
            <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre-wrap">
                ---
                <span className="text-blue-600">name</span>: email-helper
                <span className="text-blue-600">displayName</span>: 邮件助手
                <span className="text-blue-600">description</span>:
                帮助处理邮件相关任务，包括编写、回复、分类等
                <span className="text-blue-600">version</span>: 1.2.0
                <span className="text-blue-600">author</span>: Your Team
                <span className="text-blue-600">tags</span>: ["email",
                "productivity", "automation"] --- # 邮件助手
                这个技能帮助你处理各种邮件相关任务。 ## 功能 - 编写专业邮件 -
                回复常见邮件 - 分类整理邮件 ## 使用方法 直接告诉 AI
                你需要处理的邮件内容，它会帮你完成相应任务。
              </pre>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
