/**
 * AvatarGroup 头像组组件
 * 用于显示多个头像，支持最大显示数量和折叠
 */

import { Avatar, Badge, Tooltip } from 'antd';
import type { AvatarProps, BadgeProps } from 'antd';
import { cn } from '../../utils';

export interface AvatarGroupItem {
  /** 唯一标识 */
  id: string;
  /** 头像地址 */
  src?: string;
  /** 显示名称 */
  name: string;
  /** 徽标配置 */
  badge?: {
    status?: BadgeProps['status'];
    text?: React.ReactNode;
    color?: string;
    dot?: boolean;
  };
}

export interface AvatarGroupProps {
  /** 头像数据列表 */
  avatars: AvatarGroupItem[];
  /** 最大显示数量 */
  max?: number;
  /** 头像大小 */
  size?: AvatarProps['size'];
  /** 间距（负值用于重叠效果） */
  spacing?: number;
  /** 重叠边框宽度 */
  borderWidth?: number;
  /** 重叠边框颜色 */
  borderColor?: string;
  /** 布局方向 */
  direction?: 'ltr' | 'rtl';
  /** Custom类名 */
  className?: string;
  /** 点击头像回调 */
  onAvatarClick?: (avatar: AvatarGroupItem) => void;
  /** 点击更多回调 */
  onMoreClick?: () => void;
}

export default function AvatarGroup({
  avatars,
  max = 4,
  size = 'default',
  spacing = -8,
  borderWidth = 2,
  borderColor = 'var(--color-bg-base)',
  direction = 'ltr',
  className,
  onAvatarClick,
  onMoreClick,
}: AvatarGroupProps) {
  const displayAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;
  const isRtl = direction === 'rtl';

  const avatarSize = typeof size === 'number' ? size : size === 'small' ? 24 : size === 'large' ? 40 : 32;
  const fontSize = avatarSize < 32 ? '10px' : avatarSize < 40 ? '12px' : '14px';

  return (
    <div
      className={cn('flex items-center', className)}
      style={{
        flexDirection: isRtl ? 'row-reverse' : 'row',
      }}
    >
      {(isRtl ? [...displayAvatars].reverse() : displayAvatars).map((avatar, index) => {
        const zIndex = isRtl ? displayAvatars.length - index : index + 1;

        let avatarContent: React.ReactNode = (
          <Avatar
            key={avatar.id}
            size={size}
            src={avatar.src}
            style={{
              marginLeft: index === 0 ? 0 : spacing,
              marginRight: 0,
              border: `${borderWidth}px solid ${borderColor}`,
              zIndex,
              cursor: onAvatarClick ? 'pointer' : 'default',
            }}
            onClick={() => onAvatarClick?.(avatar)}
          >
            {!avatar.src && avatar.name.charAt(0).toUpperCase()}
          </Avatar>
        );

        if (avatar.badge) {
          avatarContent = (
            <Badge
              key={avatar.id}
              status={avatar.badge.status}
              text={avatar.badge.text}
              color={avatar.badge.color}
              dot={avatar.badge.dot}
              offset={[-4, 4]}
            >
              {avatarContent}
            </Badge>
          );
        }

        return (
          <Tooltip key={avatar.id} title={avatar.name} placement="top">
            {avatarContent}
          </Tooltip>
        );
      })}

      {remainingCount > 0 && (
        <Tooltip
          title={
            <div className="max-w-[200px]">
              <div className="font-medium mb-1">其他成员</div>
              <div className="text-xs opacity-80">
                {avatars.slice(max).map(a => a.name).join('、')}
              </div>
            </div>
          }
          placement="top"
        >
          <Avatar
            size={size}
            style={{
              [isRtl ? 'marginRight' : 'marginLeft']: spacing,
              [isRtl ? 'marginLeft' : 'marginRight']: 0,
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              border: `${borderWidth}px solid ${borderColor}`,
              zIndex: max + 1,
              fontSize,
              cursor: onMoreClick ? 'pointer' : 'default',
            }}
            onClick={onMoreClick}
          >
            +{remainingCount}
          </Avatar>
        </Tooltip>
      )}
    </div>
  );
}

/**
 * 简单头像组 - 不带折叠
 */
export function SimpleAvatarGroup({
  avatars,
  size = 'default',
  spacing = 8,
  className,
}: {
  avatars: AvatarGroupItem[];
  size?: AvatarProps['size'];
  spacing?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center', className)} style={{ gap: spacing }}>
      {avatars.map(avatar => (
        <Tooltip key={avatar.id} title={avatar.name}>
          <Avatar size={size} src={avatar.src}>
            {!avatar.src && avatar.name.charAt(0).toUpperCase()}
          </Avatar>
        </Tooltip>
      ))}
    </div>
  );
}

/**
 * 带状态的在线头像组
 */
export function OnlineAvatarGroup({
  avatars,
  max = 4,
  size = 'default',
  className,
}: {
  avatars: (AvatarGroupItem & { online?: boolean })[];
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}) {
  const onlineAvatars = avatars.filter(a => a.online);
  const offlineAvatars = avatars.filter(a => !a.online);
  const sortedAvatars = [...onlineAvatars, ...offlineAvatars];

  return (
    <AvatarGroup
      avatars={sortedAvatars.map(a => ({
        ...a,
        badge: a.online ? { status: 'success', dot: true } : undefined,
      }))}
      max={max}
      size={size}
      className={className}
    />
  );
}
