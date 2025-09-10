import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'USER';
  redirectTo?: string;
}

export function ProtectedRoute({ children, requiredRole, redirectTo = '/login' }: ProtectedRouteProps) {
  // Safely get auth store values
  let isAuthenticated = false;
  let user = null;
  let isAdmin = false;
  
  try {
    const authStore = useAuthStore();
    isAuthenticated = authStore.isAuthenticated;
    user = authStore.user;
    isAdmin = authStore.isAdmin;
    console.log('[ProtectedRoute] Check:', { isAuthenticated, userRole: user?.role, isAdmin, requiredRole });
  } catch (error) {
    console.error('ProtectedRoute auth store error:', error);
    return <Navigate to={redirectTo} replace />;
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole === 'ADMIN' && !isAdmin) {
    console.log('[ProtectedRoute] User not ADMIN, redirecting to /explorer');
    return <Navigate to="/explorer" replace />;
  }

  // Admin users can access all routes, so no need to restrict them from USER routes
  if (requiredRole === 'USER' && user?.role === 'ADMIN') {
    console.log('[ProtectedRoute] ADMIN accessing USER route - allowing access');
    return <>{children}</>;
  }

  return <>{children}</>;
}
