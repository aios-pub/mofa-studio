/**
 * Environment variable管理组件
 * 类似Postman的环境管理功能
 */

import { useState, useEffect, useRef } from "react";
import {
  Select,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Table,
  Switch,
  Tag,
  Popconfirm,
  message,
  Divider,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Environment, EnvironmentVariable, EnvironmentFormData } from "@/types/testset";
import { environmentApi } from "@/services";

interface EnvironmentManagerProps {
  value?: string;
  onChange?: (environmentId: string) => void;
  onVariablesChange?: (variables: EnvironmentVariable[]) => void;
  className?: string;
}

export function EnvironmentManager({
  value,
  onChange,
  onVariablesChange,
  className,
}: EnvironmentManagerProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironment, setActiveEnvironment] = useState<Environment | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [form] = Form.useForm<EnvironmentFormData>();
  const environmentsRequestIdRef = useRef(0);
  const activeEnvRequestIdRef = useRef(0);

  useEffect(() => {
    loadEnvironments();
    loadActiveEnvironment();
  }, []);

  // 当父组件传递的 value 变化时，同步更新选中状态
  useEffect(() => {
    if (value !== undefined) {
      const selectedEnv = environments.find((e) => e.id === value);
      if (selectedEnv) {
        setActiveEnvironment(selectedEnv);
        onVariablesChange?.(selectedEnv.variables);
      } else if (value === "") {
        setActiveEnvironment(null);
        onVariablesChange?.([]);
      } else {
        // value 指向的环境已被删除或不存在，清除状态
        setActiveEnvironment(null);
        onVariablesChange?.([]);
      }
    }
  }, [value, environments]);

  const loadEnvironments = async () => {
    const requestId = ++environmentsRequestIdRef.current;
    try {
      setLoading(true);
      const data = await environmentApi.getAll();
      if (requestId !== environmentsRequestIdRef.current) return;
      setEnvironments(data);
    } catch (error) {
      if (requestId !== environmentsRequestIdRef.current) return;
      console.error("Failed to load environments:", error);
      message.error("加载环境变量失败");
    } finally {
      if (requestId === environmentsRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const loadActiveEnvironment = async () => {
    const requestId = ++activeEnvRequestIdRef.current;
    try {
      const active = await environmentApi.getActive();
      if (requestId !== activeEnvRequestIdRef.current) return;
      setActiveEnvironment(active);
      if (active && value === undefined) {
        onChange?.(active.id);
      }
    } catch (error) {
      if (requestId !== activeEnvRequestIdRef.current) return;
      console.error("Failed to load active environment:", error);
    }
  };

  const handleSetActive = async (envId: string) => {
    // e.g.果选择了"不使用环境"，只通知父组件清除选择
    if (!envId) {
      onVariablesChange?.([]);
      onChange?.("");
      return;
    }

    try {
      await environmentApi.setActive(envId);
      await loadActiveEnvironment();

      // 获取选中的环境并通知父组件变量更新
      const selectedEnv = environments.find((e) => e.id === envId);
      if (selectedEnv && onVariablesChange) {
        onVariablesChange(selectedEnv.variables);
      }

      onChange?.(envId);
      message.success("已切换环境");
    } catch (error) {
      console.error("Failed to set active environment:", error);
      message.error("切换环境失败");
    }
  };

  const handleCreate = () => {
    setEditingEnvironment(null);
    form.resetFields();
    form.setFieldsValue({
      name: "",
      description: "",
      variables: [{ key: "", value: "", enabled: true, type: "string" as const }],
    } as any);
    setModalOpen(true);
  };

  const handleEdit = (env: Environment) => {
    setEditingEnvironment(env);
    form.setFieldsValue({
      name: env.name,
      description: env.description,
      variables: env.variables.map((v) => ({
        ...v,
      })),
    });
    setModalOpen(true);
  };

  const handleDelete = async (envId: string) => {
    try {
      await environmentApi.delete(envId);
      await loadEnvironments();
      if (activeEnvironment?.id === envId) {
        setActiveEnvironment(null);
        onChange?.("");
        onVariablesChange?.([]);
      }
      message.success("删除成功");
    } catch (error) {
      console.error("Failed to delete environment:", error);
      message.error("删除失败");
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const variables: EnvironmentVariable[] = (values.variables || [])
        .filter((v: any) => v.key && v.key.trim())
        .map((v: any) => ({
          key: v.key,
          value: v.value || "",
          description: v.description,
          enabled: v.enabled !== false,
          type: v.type || "string",
        }));

      if (editingEnvironment) {
        await environmentApi.update(editingEnvironment.id, {
          name: values.name,
          description: values.description,
          variables: variables.map(({ key, ...rest }) => ({ ...rest, key })),
        } as any);
        message.success("更新成功");
      } else {
        await environmentApi.create({
          name: values.name,
          description: values.description,
          variables,
          isGlobal: false,
        });
        message.success("创建成功");
      }

      setModalOpen(false);
      await loadEnvironments();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error("Failed to save environment:", error);
      message.error("保存失败");
    }
  };

  const columns: ColumnsType<EnvironmentVariable> = [
    {
      title: "启用",
      dataIndex: "enabled",
      width: 70,
      render: (_enabled, _record, index) => (
        <Form.Item
          name={["variables", index, "enabled"]}
          valuePropName="checked"
          style={{ margin: 0 }}
        >
          <Switch size="small" />
        </Form.Item>
      ),
    },
    {
      title: "变量名",
      dataIndex: "key",
      width: 200,
      render: (_key, _record, index) => (
        <Form.Item
          name={["variables", index, "key"]}
          rules={[{ required: true, message: "请输入变量名" }]}
          style={{ margin: 0 }}
        >
          <Input placeholder="变量名" />
        </Form.Item>
      ),
    },
    {
      title: "值",
      dataIndex: "value",
      width: 250,
      render: (_value, _record, index) => (
        <Form.Item
          name={["variables", index, "value"]}
          style={{ margin: 0 }}
        >
          <Input.Password placeholder="变量值" />
        </Form.Item>
      ),
    },
    {
      title: "描述",
      dataIndex: "description",
      width: 180,
      render: (_description, _record, index) => (
        <Form.Item
          name={["variables", index, "description"]}
          style={{ margin: 0 }}
        >
          <Input placeholder="描述（可选）" />
        </Form.Item>
      ),
    },
  ];

  return (
    <div className={className}>
      <Space.Compact style={{ width: "100%" }}>
        <Select
          value={value || undefined}
          onChange={handleSetActive}
          loading={loading}
          placeholder="选择环境"
          allowClear
          style={{ flex: 1 }}
          options={[
            {
              label: <span style={{ color: "#999" }}>不使用环境</span>,
              value: "",
            },
            ...environments.map((env) => ({
              label: (
                <Space>
                  {env.id === activeEnvironment?.id && (
                    <CheckCircleOutlined style={{ color: "#52c41a" }} />
                  )}
                  <span>{env.name}</span>
                  {env.isGlobal && <Tag color="blue">全局</Tag>}
                </Space>
              ),
              value: env.id,
            })),
          ]}
        />
        <Button
          icon={<EnvironmentOutlined />}
          onClick={() => {
            Modal.info({
              title: "环境变量管理",
              width: 800,
              content: (
                <EnvironmentListContent
                  environments={environments}
                  activeEnvironment={activeEnvironment}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCreate={handleCreate}
                />
              ),
            });
          }}
        >
          管理
        </Button>
      </Space.Compact>

      <Modal
        title={editingEnvironment ? "编辑环境" : "新建环境"}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        width={900}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="环境名称"
            rules={[{ required: true, message: "请输入环境名称" }]}
          >
            <Input placeholder="例如：开发环境、测试环境、生产环境" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="环境描述（可选）" rows={2} />
          </Form.Item>

          <Divider>变量列表</Divider>

          <Form.List name="variables">
            {(fields, { add, remove }) => (
              <>
                <Table
                  columns={columns.concat([
                    {
                      title: "操作",
                      width: 60,
                      key: "action",
                      render: (_value: unknown, _record: unknown, index: number) => (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => remove(index)}
                        />
                      ),
                    },
                  ]) as any}
                  dataSource={fields.map((field) => ({
                    key: field.key,
                  }))}
                  pagination={false}
                  size="small"
                  rowKey={(record) => record.key}
                />
                <Button
                  type="dashed"
                  onClick={() => add({ key: "", value: "", enabled: true })}
                  block
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                >
                  添加变量
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}

interface EnvironmentListContentProps {
  environments: Environment[];
  activeEnvironment: Environment | null;
  onEdit: (env: Environment) => void;
  onDelete: (envId: string) => void;
  onCreate: () => void;
}

function EnvironmentListContent({
  environments,
  activeEnvironment,
  onEdit,
  onDelete,
  onCreate,
}: EnvironmentListContentProps) {
  const columns: ColumnsType<Environment> = [
    {
      title: "环境名称",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <Space>
          <span>{name}</span>
          {record.id === activeEnvironment?.id && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              当前
            </Tag>
          )}
          {record.isGlobal && <Tag color="blue">全局</Tag>}
        </Space>
      ),
    },
    {
      title: "变量数量",
      dataIndex: "variables",
      key: "variables",
      width: 100,
      render: (variables) => variables.length,
    },
    {
      title: "操作",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此环境吗？"
            onConfirm={() => onDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreate}
        >
          新建环境
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={environments}
        rowKey="id"
        pagination={false}
        size="small"
      />
    </div>
  );
}
