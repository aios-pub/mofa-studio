/**
 * Skill source tag component
 */

import { Tag } from 'antd';
import { CloudOutlined, CloudDownloadOutlined, HomeOutlined } from '@ant-design/icons';
import type { SkillSource } from '../../../../types/skill';

interface SkillSourceTagProps {
  source: SkillSource;
  hasUpdate?: boolean;
}

export function SkillSourceTag({ source, hasUpdate }: SkillSourceTagProps) {
  const config: Record<SkillSource, { color: string; label: string; icon: React.ReactNode }> = {
    local: { color: 'default', label: '本地', icon: <HomeOutlined /> },
    hub: { color: 'blue', label: 'Hub', icon: <CloudOutlined /> },
    installed: { color: 'green', label: '已安装', icon: <CloudDownloadOutlined /> },
  };

  const { color, label, icon } = config[source];

  return (
    <Tag color={hasUpdate ? 'orange' : color} icon={icon}>
      {hasUpdate ? '可更新' : label}
    </Tag>
  );
}
