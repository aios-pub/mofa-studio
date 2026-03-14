/**
 * 路由守卫组件
 * 用于保护需要登录才能访问的路由
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '../../stores/useUserStore';

interface RouteGuardProps {
  children: ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    // 保存当前路径，登录后跳转回来
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
