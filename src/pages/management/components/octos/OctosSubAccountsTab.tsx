/**
 * Octos 子账户管理
 * 展示、创建、启停子账户
 */

import { useState, useEffect, useCallback } from "react";
import {
  List,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Tag,
  Typography,
  message,
  Empty,
  Spin,
  Card,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { OctosProfileResponse, OctosProfileConfig } from "@/types/octos";
import { OctosApiClient } from "@/services/real/octos";

const { Text, Title } = Typography;

interface Props {
  profileId: string;
  apiClient: OctosApiClient | any;
}

interface CreateFormValues {
  name: string;
  public_subdomain?: string;
  email?: string;
  system_prompt?: string;
}

const defaultConfig: Partial<OctosProfileConfig> = {
  provider: null,
  model: null,
  channels: [],
  gateway: {},
  env_vars: {},
};

export default function OctosSubAccountsTab({ profileId, apiClient }: Props) {
  const [loading, setLoading] = useState(true);
  const [subAccounts, setSubAccounts] = useState<OctosProfileResponse[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  const fetchSubAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.listSubAccounts(profileId);
      setSubAccounts(data);
    } catch (e: any) {
      message.error(e?.message || "加载子账户失败");
    } finally {
      setLoading(false);
    }
  }, [apiClient, profileId]);

  useEffect(() => {
    fetchSubAccounts();
  }, [fetchSubAccounts]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      const result = await apiClient.createSubAccount(profileId, {
        ...values,
        channels: [],
        env_vars: {},
      });
      message.success("创建成功");
      setCreateModalOpen(false);
      form.resetFields();
      fetchSubAccounts();
    } catch (e: any) {
      message.error(e?.message || "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleStartStop = async (subAccountId: string, action: "start" | "stop") => {
    try {
      if (action === "start") {
        await apiClient.startSubGateway(profileId, subAccountId);
      } else {
        await apiClient.stopSubGateway(profileId, subAccountId);
      }
      message.success(`${action === "start" ? "启动" : "停止"}成功`);
      fetchSubAccounts();
    } catch (e: any) {
      message.error(e?.message || "操作失败");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Title level={5} className="mb-0">
          <TeamOutlined /> 子账户
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => setCreateModalOpen(true)}
        >
          新建子账户
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spin tip="加载中..." />
        </div>
      ) : subAccounts.length === 0 ? (
        <Empty
          description="暂无子账户"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          styles={{ image: { height: 60 } }}
        />
      ) : (
        <List
          grid={{ gutter: 16, column: 2 }}
          dataSource={subAccounts}
          renderItem={(sub) => (
            <List.Item>
              <Card
                size="small"
                title={
                  <Space>
                    <Text strong>{sub.name}</Text>
                    <Tag color={sub.status.running ? "success" : "default"}>
                      {sub.status.running ? "运行中" : "已停止"}
                    </Tag>
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      size="small"
                      type="text"
                      icon={
                        sub.status.running ? (
                          <PauseCircleOutlined />
                        ) : (
                          <PlayCircleOutlined />
                        )
                      }
                      onClick={() =>
                        handleStartStop(sub.id, sub.status.running ? "stop" : "start")
                      }
                    />
                  </Space>
                }
              >
                <Space orientation="vertical" size={4} className="w-full">
                  {sub.public_subdomain && (
                    <div>
                      <Text type="secondary" className="text-xs">
                        子域名:
                      </Text>{" "}
                      <Text code className="text-xs">
                        {sub.public_subdomain}
                      </Text>
                    </div>
                  )}
                  <div>
                    <Text type="secondary" className="text-xs">
                      Profile ID:
                    </Text>{" "}
                    <Text code className="text-xs">
                      {sub.id}
                    </Text>
                  </div>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      )}

      {/* 创建子账户弹窗 */}
      <Modal
        title="新建子账户"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="创建"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input placeholder="My Sub Account" />
          </Form.Item>
          <Form.Item
            label="公共子域名（可选）"
            name="public_subdomain"
          >
            <Input placeholder="my-account" />
          </Form.Item>
          <Form.Item
            label="邮箱（可选）"
            name="email"
          >
            <Input placeholder="user@example.com" />
          </Form.Item>
          <Form.Item
            label="系统提示词（可选）"
            name="system_prompt"
          >
            <Input.TextArea
              placeholder="You are a helpful assistant."
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
