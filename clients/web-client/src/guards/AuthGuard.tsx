import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import type { ReactNode } from 'react';
import type { UserRole } from '../types';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // 未登入 → 導向登入頁
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 角色不符 → 導向對應首頁
  if (requiredRole && user?.role !== requiredRole) {
    const roleHome: Record<UserRole, string> = {
      rider: '/rider/home',
      driver: '/driver/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={roleHome[user?.role || 'rider']} replace />;
  }

  return <>{children}</>;
}
