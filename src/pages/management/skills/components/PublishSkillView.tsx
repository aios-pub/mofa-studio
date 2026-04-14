/**
 * 发布 Skill 视图组件
 */

import { useState } from 'react';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Typography,
  Card,
  message,
} from 'antd';
import {
  CloudUploadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useSkillHubStore } from '../../../../stores/useSkillHubStore';
import type { SkillParameter } from '@/services';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

interface ParameterFormItem {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  defaultValue?: string;
}

export function PublishSkillView() {
  const [form] = Form.useForm();
  const [parameters, setParameters] = useState<ParameterFormItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const { publishSkill, publishLoading } = useSkillHubStore();

  const handleAddParameter = () => {
    setParameters([
      ...parameters,
      { name: '', type: 'string', description: '', required: false },
    ]);
  };

  const handleRemoveParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleParameterChange = (
    index: number,
    field: keyof ParameterFormItem,
    value: unknown
  ) => {
    const newParams = [...parameters];
    newParams[index] = { ...newParams[index], [field]: value };
    setParameters(newParams);
  };

  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (values: any) => {
    // 转换参数格式
    const formattedParams: SkillParameter[] = parameters.map((p) => ({
      name: p.name,
      type: p.type,
      description: p.description,
      required: p.required,
      defaultValue: p.defaultValue ? JSON.parse(p.defaultValue) : undefined,
    }));

    const result = await publishSkill({
      name: values.name,
      description: values.description,
      type: values.type,
      category: values.category,
      parameters: formattedParams,
      timeout: values.timeout || 30000,
      tags,
      readme: values.readme,
    });

    if (result) {
      message.success('发布成功！');
      form.resetFields();
      setParameters([]);
      setTags([]);
    } else {
      message.error('发布失败，请重试');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-6 max-w-3xl mx-auto w-full">
        {/* 头部 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CloudUploadOutlined style={{ fontSize: 24 }} />
            <Title level={4} style={{ margin: 0 }}>发布 Skill 到 Hub</Title>
          </div>
          <Paragraph type="secondary">
            将你创建的 Skill 分享给其他用户。发布前请确保 Skill 功能正常。
          </Paragraph>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            type: 'custom',
            timeout: 30000,
          }}
        >
          {/* 基本信息 */}
          <Card
            title="基本信息"
            size="small"
            className="mb-4"
            styles={{
              header: { borderBottom: '1px solid var(--color-border)' },
            }}
          >
            <Form.Item
              name="name"
              label="Skill 名称"
              rules={[
                { required: true, message: '请输入 Skill 名称' },
                {
                  pattern: /^[a-z][a-z0-9_]*$/,
                  message: '只能包含小写字母、数字和下划线，且必须以字母开头',
                },
              ]}
            >
              <Input placeholder="例如：my_custom_skill" />
            </Form.Item>

            <Form.Item
              name="description"
              label="描述"
              rules={[{ required: true, message: '请输入描述' }]}
            >
              <TextArea rows={3} placeholder="简要描述 Skill 的功能" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="type"
                label="类型"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: '内置', value: 'builtin' },
                    { label: '自定义', value: 'custom' },
                    { label: 'API', value: 'api' },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select
                  placeholder="选择分类"
                  options={[
                    { label: '开发工具', value: '开发工具' },
                    { label: '通知', value: '通知' },
                    { label: '生活服务', value: '生活服务' },
                    { label: '文档处理', value: '文档处理' },
                    { label: 'AI 能力', value: 'AI 能力' },
                    { label: '数据库', value: '数据库' },
                    { label: '数据可视化', value: '数据可视化' },
                    { label: '网络', value: '网络' },
                    { label: '文件操作', value: '文件操作' },
                    { label: '搜索', value: '搜索' },
                    { label: '代码', value: '代码' },
                    { label: '数据', value: '数据' },
                  ]}
                />
              </Form.Item>
            </div>

            <Form.Item name="timeout" label="超时时间 (毫秒)">
              <InputNumber min={1000} max={300000} step={1000} style={{ width: '100%' }} />
            </Form.Item>
          </Card>

          {/* 标签 */}
          <Card
            title="标签"
            size="small"
            className="mb-4"
            styles={{
              header: { borderBottom: '1px solid var(--color-border)' },
            }}
          >
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="输入标签"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onPressEnter={handleAddTag}
                style={{ flex: 1 }}
              />
              <Button icon={<PlusOutlined />} onClick={handleAddTag}>
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Button
                  key={tag}
                  size="small"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} <DeleteOutlined className="ml-1" />
                </Button>
              ))}
            </div>
          </Card>

          {/* 参数定义 */}
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>参数定义</span>
                <Button
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={handleAddParameter}
                  size="small"
                >
                  添加参数
                </Button>
              </div>
            }
            size="small"
            className="mb-4"
            styles={{
              header: { borderBottom: '1px solid var(--color-border)' },
            }}
          >
            {parameters.length === 0 ? (
              <div className="text-center py-4 text-[var(--color-text-tertiary)]">
                暂无参数，点击上方按钮添加
              </div>
            ) : (
              <div className="space-y-3">
                {parameters.map((param, index) => (
                  <div
                    key={index}
                    className="p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Text strong>参数 {index + 1}</Text>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveParameter(index)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="参数名"
                        value={param.name}
                        onChange={(e) =>
                          handleParameterChange(index, 'name', e.target.value)
                        }
                      />
                      <Select
                        value={param.type}
                        onChange={(value) => handleParameterChange(index, 'type', value)}
                        options={[
                          { label: 'String', value: 'string' },
                          { label: 'Number', value: 'number' },
                          { label: 'Boolean', value: 'boolean' },
                          { label: 'Object', value: 'object' },
                          { label: 'Array', value: 'array' },
                        ]}
                      />
                    </div>
                    <Input
                      className="mt-2"
                      placeholder="描述"
                      value={param.description}
                      onChange={(e) =>
                        handleParameterChange(index, 'description', e.target.value)
                      }
                    />
                    <div className="flex items-center gap-4 mt-2">
                      <Input
                        placeholder="默认值 (JSON 格式)"
                        value={param.defaultValue}
                        onChange={(e) =>
                          handleParameterChange(index, 'defaultValue', e.target.value)
                        }
                        style={{ flex: 1 }}
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) =>
                            handleParameterChange(index, 'required', e.target.checked)
                          }
                          className="mr-1"
                        />
                        必填
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* README */}
          <Card
            title="README"
            size="small"
            className="mb-4"
            styles={{
              header: { borderBottom: '1px solid var(--color-border)' },
            }}
          >
            <Form.Item name="readme" noStyle>
              <TextArea
                rows={6}
                placeholder="使用 Markdown 格式编写 Skill 的使用说明..."
              />
            </Form.Item>
          </Card>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-2">
            <Button onClick={() => form.resetFields()}>重置</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<CloudUploadOutlined />}
              loading={publishLoading}
            >
              发布到 Hub
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
