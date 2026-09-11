import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../../app/hooks';

type AllowedRole = 'farmer' | 'organization' | 'admin';

interface ProtectedRouteProps {
  role: AllowedRole;
  children: React.ReactNode;
}

const LOGIN_PATHS: Record<AllowedRole, string> = {
  farmer: '/farmer/login',
  organization: '/organization/login',
  admin: '/admin/login',
};

export default function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAppSelector(s => s.auth);

  // While session is being restored, show a spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🌿</div>
          <p className="text-text-muted text-sm">Loading FarmGrid...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={LOGIN_PATHS[role]} replace />;
  }

  if (user.role !== role) {
    // Redirect to correct portal
    if (user.role === 'farmer') return <Navigate to="/farmer/dashboard" replace />;
    if (user.role === 'organization') return <Navigate to="/organization/dashboard" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
