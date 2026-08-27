/**
 * Stat card component
 * Displays statistics with icon, value, and optional trend indicator
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Tooltip, Typography } from 'antd';
import { RiseOutlined, FallOutlined, MinusOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type StatColor = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'cyan';

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  subValue?: string;
  trend?: number;
  /** Comparison baseline shown in the trend tooltip */
  trendLabel?: string;
  color?: StatColor;
  /** Extra content rendered in the top-right corner (e.g. mini chart) */
  extra?: React.ReactNode;
  className?: string;
}

const colorClasses: Record<StatColor, string> = {
  blue: 'bg-blue-500/10 text-blue-500',
  green: 'bg-green-500/10 text-green-500',
  orange: 'bg-orange-500/10 text-orange-500',
  purple: 'bg-purple-500/10 text-purple-500',
  red: 'bg-red-500/10 text-red-500',
  cyan: 'bg-cyan-500/10 text-cyan-500',
};

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subValue,
  trend,
  trendLabel,
  color = 'blue',
  extra,
  className = '',
}) => {
  const { t } = useTranslation();
  return (
    <Card
      className={`rounded-lg ${className}`}
      styles={{ body: { padding: '16px' } }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </span>
        {extra}
        {trend !== undefined && trend !== 0 && (
          <Tooltip
            title={t(
              (trend > 0
                ? `${trendLabel || '较昨日'}增长`
                : `${trendLabel || '较昨日'}下降`) + ' {{percent}}%',
              { percent: Math.abs(trend).toFixed(1) },
            )}
          >
            <span className={`flex items-center gap-0.5 text-xs ${
              trend > 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {trend > 0 ? <RiseOutlined /> : trend < 0 ? <FallOutlined className="rotate-180" /> : <MinusOutlined />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          </Tooltip>
        )}
      </div>
      <div className="text-2xl font-semibold text-[var(--color-text-primary)]">
        {value}
      </div>
      <div className="text-sm text-[var(--color-text-secondary)] mt-1">
        {label}
      </div>
      {subValue && (
        <Text type="secondary" className="text-xs mt-1 block">
          {subValue}
        </Text>
      )}
    </Card>
  );
};

export default StatCard;
