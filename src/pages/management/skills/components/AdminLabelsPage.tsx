/**
 * Admin Labels Page
 * Admin label management page
 */

import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
  Popconfirm,
  Switch,
  InputNumber,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { skillHubV2Api } from '@/services';
import type { HubLabel, LabelDefinition, LabelType, LabelTranslation } from '@/types/skill';

const { Title, Text } = Typography;
const { Option } = Select;

export function AdminLabelsPage() {
  const [labels, setLabels] = useState<LabelDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LabelDefinition | null>(null);
  const [form] = Form.useForm();

  const loadLabels = async () => {
    setLoading(true);
    try {
      // For now, we'll use the getLabels endpoint and transform the data
      const hubLabels = await skillHubV2Api.getLabels('zh-CN');
      // Transform HubLabel[] to LabelDefinition[]
      const labelDefinitions: LabelDefinition[] = hubLabels.map((label, index) => ({
        id: label.id,
        tenantId: '',
        slug: label.slug,
        type: label.type,
        visibleInFilter: label.visibleInFilter,
        sortOrder: label.sortOrder,
        translations: [{ locale: 'zh-CN', displayName: label.display_name }],
        createdAt: new Date(),
      }));
      setLabels(labelDefinitions);
    } catch (error) {
      message.error('加载标签失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabels();
  }, []);

  const handleCreate = () => {
    setEditingLabel(null);
    form.resetFields();
    form.setFieldsValue({
      translations: [{ locale: 'zh-CN', displayName: '' }],
      visibleInFilter: true,
      sortOrder: labels.length,
    });
    setModalVisible(true);
  };

  const handleEdit = (label: LabelDefinition) => {
    setEditingLabel(label);
    form.setFieldsValue({
      slug: label.slug,
      type: label.type,
      visibleInFilter: label.visibleInFilter,
      sortOrder: label.sortOrder,
      translations: label.translations,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await skillHubV2Api.deleteLabel(id);
      message.success('删除成功');
      loadLabels();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingLabel) {
        await skillHubV2Api.updateLabel(editingLabel.id, values);
        message.success('更新成功');
      } else {
        await skillHubV2Api.createLabel(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadLabels();
    } catch (error) {
      message.error(editingLabel ? '更新失败' : '创建失败');
    }
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => <code>{slug}</code>,
    },
    {
      title: '显示名称',
      dataIndex: 'translations',
      key: 'displayName',
      render: (translations: LabelTranslation[]) => {
        const zhTranslation = translations.find(t => t.locale === 'zh-CN');
        return zhTranslation?.display_name || translations[0]?.display_name || '-';
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: LabelType) => (
        <Tag color={type === 'RECOMMENDED' ? 'blue' : 'purple'}>{type}</Tag>
      ),
    },
    {
      title: '筛选可见',
      dataIndex: 'visibleInFilter',
      key: 'visibleInFilter',
      render: (visible: boolean) => (visible ? '是' : '否'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: LabelDefinition) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个标签吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Title level={3} className="m-0">
          标签管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建标签
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={labels}
        loading={loading}
        rowKey="id"
        pagination={false}
      />

      <Modal
        title={editingLabel ? '编辑标签' : '新建标签'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Slug"
            name="slug"
            rules={[{ required: true, message: '请输入 slug' }]}
          >
            <Input placeholder="例如: recommended, experimental" />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select placeholder="选择标签类型">
              <Option value="RECOMMENDED">推荐 (RECOMMENDED)</Option>
              <Option value="PRIVILEGED">特权 (PRIVILEGED)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="显示名称"
            name={['translations', 0, 'displayName']}
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="例如: 推荐技能" />
          </Form.Item>

          <Form.Item
            label="在筛选中可见"
            name="visibleInFilter"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="排序顺序"
            name="sortOrder"
            rules={[{ required: true, message: '请输入排序顺序' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
