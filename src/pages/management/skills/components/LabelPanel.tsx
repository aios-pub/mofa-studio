/**
 * 标签面板组件
 */

import { useEffect, useState } from 'react';
import { Space, Tag, Checkbox, Empty, Spin } from 'antd';
import { useSkillHubStore } from '@/stores/useSkillHubStore';
import type { HubLabel } from '@/types/skill';

interface LabelPanelProps {
  skillId: string;
  editable?: boolean;
}

export function LabelPanel({ skillId, editable = false }: LabelPanelProps) {
  const { labels, loadLabels, getSkillLabels, assignLabels, removeLabel } = useSkillHubStore();
  const [skillLabels, setSkillLabels] = useState<HubLabel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLabels('zh-CN');
    loadSkillLabelsData();
  }, [skillId]);

  const loadSkillLabelsData = async () => {
    setLoading(true);
    try {
      const labelData = await getSkillLabels(skillId);
      setSkillLabels(labelData);
    } finally {
      setLoading(false);
    }
  };

  const handleLabelToggle = async (labelId: string, checked: boolean) => {
    if (checked) {
      await assignLabels(skillId, [labelId]);
    } else {
      await removeLabel(skillId, labelId);
    }
    await loadSkillLabelsData();
  };

  if (loading) {
    return <Spin />;
  }

  if (labels.length === 0) {
    return <Empty description="暂无标签" />;
  }

  const skillLabelIds = new Set(skillLabels.map(l => l.id));

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold mb-3">推荐标签</h4>
        <Space wrap>
          {labels
            .filter(l => l.type === 'RECOMMENDED')
            .map(label => (
              <Tag
                key={label.id}
                color={skillLabelIds.has(label.id) ? 'blue' : 'default'}
                className={editable ? 'cursor-pointer' : ''}
              >
                {editable && (
                  <Checkbox
                    checked={skillLabelIds.has(label.id)}
                    onChange={e => handleLabelToggle(label.id, e.target.checked)}
                    className="mr-1"
                  />
                )}
                {label.displayName}
              </Tag>
            ))}
        </Space>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3">特权标签</h4>
        <Space wrap>
          {labels
            .filter(l => l.type === 'PRIVILEGED')
            .map(label => (
              <Tag
                key={label.id}
                color={skillLabelIds.has(label.id) ? 'purple' : 'default'}
              >
                {editable && (
                  <Checkbox
                    checked={skillLabelIds.has(label.id)}
                    onChange={e => handleLabelToggle(label.id, e.target.checked)}
                    className="mr-1"
                  />
                )}
                {label.displayName}
              </Tag>
            ))}
        </Space>
      </div>
    </div>
  );
}
