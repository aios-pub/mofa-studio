/**
 * Star 按钮组件
 */

import { Button, Tooltip } from 'antd';
import { StarOutlined, StarFilled } from '@ant-design/icons';
import { useSkillHubStore } from '@/stores/useSkillHubStore';
import { useEffect } from 'react';

interface StarButtonProps {
  skillId: string;
  showCount?: boolean;
}

export function StarButton({ skillId, showCount = false }: StarButtonProps) {
  const { starredSkillIds, starSkill, unstarSkill } = useSkillHubStore();
  const isStarred = starredSkillIds.has(skillId);

  const handleClick = async () => {
    if (isStarred) {
      await unstarSkill(skillId);
    } else {
      await starSkill(skillId);
    }
  };

  return (
    <Tooltip title={isStarred ? '取消 Star' : 'Star'}>
      <Button
        type="text"
        icon={isStarred ? <StarFilled /> : <StarOutlined />}
        onClick={handleClick}
        className={isStarred ? 'text-yellow-500' : ''}
      >
        {showCount && <span className="ml-1">Star</span>}
      </Button>
    </Tooltip>
  );
}
