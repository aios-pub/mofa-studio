/**
 * 账户下拉菜单组件
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Avatar, Tag } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined, DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useUserInfo, useUserActions } from '../../stores/useUserStore';

interface AccountDropdownProps {
  collapsed?: boolean;
}

export default function AccountDropdown({ collapsed = false }: AccountDropdownProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userInfo = useUserInfo();
  const { clearUserInfoAndToken } = useUserActions();

  const handleLogout = () => {
    clearUserInfoAndToken();
    navigate('/auth/login');
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: t('nav.profile', '个人中心'),
      icon: <UserOutlined />,
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      label: t('nav.settings', '系统设置'),
      icon: <SettingOutlined />,
      onClick: () => navigate('/system/settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: t('auth.logout', '退出登录'),
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  const popupRender = (menu: React.ReactNode) => (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden min-w-[220px]">
      {/* 用户信息 */}
      <div className="flex items-center gap-3 p-3 border-b border-[var(--color-border)]">
        <Avatar
          size={40}
          src={userInfo.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
          icon={<UserOutlined />}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {userInfo.username}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] truncate">
            {userInfo.email}
          </div>
        </div>
      </div>

      {/* 角色标签 */}
      {userInfo.roles && userInfo.roles.length > 0 && (
        <div className="px-3 py-2 border-b border-[var(--color-border)]">
          <div className="flex flex-wrap gap-1">
            {userInfo.roles.map((role) => (
              <Tag key={role.code} color="blue" className="text-xs">
                {role.name}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* 菜单项 */}
      {menu}
    </div>
  );

  if (collapsed) {
    return (
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        popupRender={popupRender}
        placement="topRight"
      >
        <div className="flex justify-center cursor-pointer p-2 hover:bg-white/10 rounded-lg">
          <Avatar
            size={32}
            src={userInfo.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
            icon={<UserOutlined />}
          />
        </div>
      </Dropdown>
    );
  }

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      popupRender={popupRender}
      placement="topRight"
    >
      <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--color-action-hover)] transition-colors cursor-pointer">
        <Avatar
          size={32}
          src={userInfo.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
          icon={<UserOutlined />}
        />
        <div className="hidden md:block text-left flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {userInfo.username}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] truncate">
            {userInfo.email}
          </div>
        </div>
        <DownOutlined className="hidden md:block text-[var(--color-text-tertiary)] text-xs" />
      </div>
    </Dropdown>
  );
}
