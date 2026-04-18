/**
 * Octos Profile Skills 管理
 * 展示已安装 Skills，支持安装/卸载
 */

import { useState, useEffect, useCallback } from "react";
import {
  List,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Space,
  Tag,
  Typography,
  message,
  Empty,
  Spin,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import type { OctosSkillEntry } from "@/types/octos";
import { OctosApiClient } from "@/services/real/octos";

const { Text, Title } = Typography;

interface Props {
  profileId: string;
  apiClient: OctosApiClient | any;
}

interface InstallFormValues {
  repo: string;
  branch: string;
  force: boolean;
}

export default function OctosSkillsTab({ profileId, apiClient }: Props) {
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<OctosSkillEntry[]>([]);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [form] = Form.useForm<InstallFormValues>();

  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.listProfileSkills(profileId);
      setSkills(data.skills || []);
    } catch (e: any) {
      message.error(e?.message || "加载 Skills 失败");
    } finally {
      setLoading(false);
    }
  }, [apiClient, profileId]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleInstall = async () => {
    try {
      const values = await form.validateFields();
      setInstalling(true);
      const result = await apiClient.installProfileSkill(profileId, {
        repo: values.repo,
        branch: values.branch,
        force: values.force,
      });
      if (result.ok) {
        message.success(`安装成功: ${result.installed.join(", ")}`);
        if (result.skipped.length > 0) {
          message.info(`跳过: ${result.skipped.join(", ")}`);
        }
        setInstallModalOpen(false);
        form.resetFields();
        fetchSkills();
      } else {
        message.error("安装失败");
      }
    } catch (e: any) {
      message.error(e?.message || "安装失败");
    } finally {
      setInstalling(false);
    }
  };

  const handleRemove = async (skillName: string) => {
    try {
      await apiClient.removeProfileSkill(profileId, skillName);
      message.success("已卸载");
      fetchSkills();
    } catch (e: any) {
      message.error(e?.message || "卸载失败");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Title level={5} className="mb-0">
          <AppstoreOutlined /> 已安装 Skills
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => setInstallModalOpen(true)}
        >
          安装 Skill
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spin tip="加载中..." />
        </div>
      ) : skills.length === 0 ? (
        <Empty
          description="暂无已安装 Skills"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={skills}
          renderItem={(skill) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="remove"
                  title="确认卸载此 Skill？"
                  onConfirm={() => handleRemove(skill.name)}
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                  >
                    卸载
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{skill.name}</Text>
                    {skill.version && <Tag color="blue">{skill.version}</Tag>}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    {skill.source_repo && (
                      <Text type="secondary" className="text-xs">
                        来源: {skill.source_repo}
                      </Text>
                    )}
                    <Text type="secondary" className="text-xs">
                      工具数量: {skill.tool_count}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}

      {/* 安装 Skill 弹窗 */}
      <Modal
        title="安装 Skill"
        open={installModalOpen}
        onCancel={() => setInstallModalOpen(false)}
        onOk={handleInstall}
        confirmLoading={installing}
        okText="安装"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="Skill 仓库 URL"
            name="repo"
            rules={[{ required: true, message: "请输入仓库 URL" }]}
          >
            <Input
              placeholder="github.com/octos/skills"
              addonBefore="https://"
            />
          </Form.Item>
          <Form.Item
            label="分支"
            name="branch"
            initialValue="main"
          >
            <Input placeholder="main" />
          </Form.Item>
          <Form.Item
            label="强制覆盖"
            name="force"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
