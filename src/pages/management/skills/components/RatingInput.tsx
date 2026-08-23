/**
 * Rating input component
 */

import { Rate, Space, Typography, Tooltip } from 'antd';
import { useSkillHubStore } from '@/stores/useSkillHubStore';

const { Text } = Typography;

interface RatingInputProps {
  skillId: string;
  readonly?: boolean;
  showCount?: boolean;
}

export function RatingInput({ skillId, readonly = false, showCount = false }: RatingInputProps) {
  const { userRatings, rateSkill } = useSkillHubStore();
  const userRating = userRatings.get(skillId) || 0;

  const handleChange = async (value: number) => {
    if (!readonly && value > 0) {
      await rateSkill(skillId, value);
    }
  };

  return (
    <Space>
      <Tooltip title={readonly ? '你的评分' : '点击评分'}>
        <Rate
          value={userRating}
          onChange={handleChange}
          disabled={readonly}
          allowHalf
        />
      </Tooltip>
      {showCount && userRating > 0 && (
        <Text type="secondary">({userRating})</Text>
      )}
    </Space>
  );
}
