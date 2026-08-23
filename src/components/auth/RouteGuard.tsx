/**
 * Route guard component
 * Protects routes that require authentication.
 * In local-first mode (embedded Tauri backend) the on-device user is
 * implicit, so no login is required on any route.
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '../../stores/useUserStore';
import { isLocalMode } from '@/config';

interface RouteGuardProps {
  children: ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated && !isLocalMode()) {
    // Save the current path to redirect back after login
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
