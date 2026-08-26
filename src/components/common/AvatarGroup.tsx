import { useTranslation } from "react-i18next";
/**
 * AvatarGroup component
 * For displaying multiple avatars with max count and folding
 */

import { Avatar, Badge, Tooltip } from 'antd';
import type { AvatarProps, BadgeProps } from 'antd';
import { cn } from '../../utils';

export interface AvatarGroupItem {
  /** Unique identifier */
  id: string;
  /** Avatar URL */
  src?: string;
  /** Display name */
  name: string;
  /** Badge configuration */
  badge?: {
    status?: BadgeProps['status'];
    text?: React.ReactNode;
    color?: string;
    dot?: boolean;
  };
}

export interface AvatarGroupProps {
  /** Avatar data list */
  avatars: AvatarGroupItem[];
  /** Maximum display count */
  max?: number;
  /** Avatar size */
  size?: AvatarProps['size'];
  /** Spacing (negative for overlap effect) */
  spacing?: number;
  /** Overlap border width */
  borderWidth?: number;
  /** Overlap border color */
  borderColor?: string;
  /** Layout direction */
  direction?: 'ltr' | 'rtl';
  /** Custom class name */
  className?: string;
  /** Avatar click callback */
  onAvatarClick?: (avatar: AvatarGroupItem) => void;
  /** More click callback */
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
}: AvatarGroupProps) {  const { t } = useTranslation();

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
              <div className="font-medium mb-1">{t("其他成员")}</div>
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
 * Simple avatar group - no folding
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
 * Online avatar group with status
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
