/**
 * Expert system page
 * Browse expert cards by industry category, summon to conversation,
 * manage my experts, and share/import cards.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal, Tag, Space, Card, Typography } from 'antd';
import { PlusOutlined, UserAddOutlined, ExportOutlined } from '@ant-design/icons';
import { PageContainer } from '@/components/layout';
import {
  BUILTIN_EXPERTS,
  exportExpertJson,
  loadMyExperts,
  parseExpertJson,
  saveMyExperts,
  type Expert,
} from '@/utils/experts';

const { Text } = Typography;

function downloadCard(expert: Expert) {
  const blob = new Blob([exportExpertJson(expert)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `expert-${expert.name}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ExpertsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [mine, setMine] = useState<Expert[]>(loadMyExperts);
  const [industry, setIndustry] = useState<string>('all');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: '', industry: '', persona: '', methodology: '' });
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveMyExperts(mine);
  }, [mine]);

  const all = useMemo(() => [...mine, ...BUILTIN_EXPERTS], [mine]);
  const industries = useMemo(
    () => ['all', ...Array.from(new Set(all.map((e) => e.industry)))],
    [all],
  );
  const visible = industry === 'all' ? all : all.filter((e) => e.industry === industry);

  const summon = (expert: Expert) => {
    navigate(`/?expert=${expert.id}`);
  };

  const createMine = () => {
    if (!draft.name.trim() || !draft.persona.trim()) {
      Modal.warning({
        title: t('提示'),
        content: t('名称与人设必填'),
      });
      return;
    }
    const expert: Expert = {
      id: `expert-${Date.now()}`,
      name: draft.name.trim().slice(0, 30),
      industry: draft.industry.trim().slice(0, 12) || '自定义',
      persona: draft.persona.trim().slice(0, 500),
      methodology: draft.methodology.trim().slice(0, 500),
      tools: [],
      avatar: '👤',
      builtin: false,
    };
    setMine((prev) => [expert, ...prev]);
    setCreating(false);
    setDraft({ name: '', industry: '', persona: '', methodology: '' });
    Modal.success({
      title: t('成功'),
      content: t('已创建「{{p0}}」', { p0: expert.name }),
    });
  };

  const importCard = async (file: File) => {
    const text = await file.text();
    const result = parseExpertJson(text);
    if (!result.ok) {
      Modal.error({
        title: t('导入失败'),
        content: t('导入失败：{{p0}}', { p0: result.reason }),
      });
      return;
    }
    setMine((prev) => [result.expert, ...prev]);
    Modal.success({
      title: t('成功'),
      content: t('已导入「{{p0}}」', { p0: result.expert.name }),
    });
  };

  return (
    <PageContainer
      title={t('专家')}
      description={t('以什么身份、什么视角处理 —— 召唤后整段对话按该专家的人设与方法作答')}
      headerActions={
        <Space>
          <Button icon={<UserAddOutlined />} onClick={() => setCreating(true)}>
            {t('我的专家')}
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => importRef.current?.click()}>
            {t('导入')}
          </Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importCard(file);
              e.target.value = '';
            }}
          />
        </Space>
      }
    >
      {/* Industry filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {industries.map((i) => (
          <button
            key={i}
            onClick={() => setIndustry(i)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              industry === i
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {i === 'all' ? t('全部') : i}
          </button>
        ))}
      </div>

      {/* Expert cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map((expert) => (
          <Card
            key={expert.id}
            className="rounded-xl hover:shadow-md transition-shadow"
            styles={{ body: { padding: '16px' } }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl" aria-hidden>
                {expert.avatar}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Text strong className="text-sm truncate">{expert.name}</Text>
                  {expert.builtin ? (
                    <Tag>{t('内置')}</Tag>
                  ) : (
                    <Tag color="blue">{t('我的')}</Tag>
                  )}
                </div>
                <Text type="secondary" className="text-xs">{expert.industry}</Text>
              </div>
            </div>
            <Text className="text-xs text-[var(--color-text-secondary)] line-clamp-3 block mb-2">
              {expert.persona}
            </Text>
            <Text className="text-xs text-[var(--color-text-tertiary)] line-clamp-2 block mb-3">
              {expert.methodology}
            </Text>
            <div className="flex gap-2 pt-1 border-t border-[var(--color-border)]">
              <Button type="primary" size="small" onClick={() => summon(expert)}>
                {t('召唤进对话')}
              </Button>
              <Button
                size="small"
                icon={<ExportOutlined />}
                onClick={() => downloadCard(expert)}
              >
                {t('分享')}
              </Button>
              {!expert.builtin && (
                <Button
                  size="small"
                  danger
                  onClick={() => {
                    setMine((prev) => prev.filter((e) => e.id !== expert.id));
                    Modal.info({
                      title: t('提示'),
                      content: t('已删除「{{p0}}」', { p0: expert.name }),
                    });
                  }}
                >
                  {t('删除')}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Create modal */}
      <Modal
        title={t('创建我的专家')}
        open={creating}
        onOk={() => createMine()}
        onCancel={() => setCreating(false)}
        okText={t('创建')}
        cancelText={t('取消')}
      >
        <div className="space-y-3 py-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              {t('名称 *')}
            </label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={t('例如：跨境电商运营')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              {t('行业')}
            </label>
            <Input
              value={draft.industry}
              onChange={(e) => setDraft((d) => ({ ...d, industry: e.target.value }))}
              placeholder={t('例如：电商')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              {t('人设 *（它是谁、怎么说话）')}
            </label>
            <Input.TextArea
              value={draft.persona}
              onChange={(e) => setDraft((d) => ({ ...d, persona: e.target.value }))}
              rows={3}
              placeholder={t('描述专家的角色和说话风格')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              {t('方法论（怎么干活）')}
            </label>
            <Input.TextArea
              value={draft.methodology}
              onChange={(e) => setDraft((d) => ({ ...d, methodology: e.target.value }))}
              rows={3}
              placeholder={t('描述专家的工作方法和流程')}
            />
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
