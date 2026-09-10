import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  role: UserRole;
  children: React.ReactNode;
}

export default function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { user, token } = useAppSelector(s => s.auth);

  if (!user || !token) {
    const loginPaths: Record<UserRole, string> = {
      farmer: '/farmer/login',
      provider: '/provider/login',
      admin: '/admin/login',
    };
    return <Navigate to={loginPaths[role]} replace />;
  }

  if (user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
