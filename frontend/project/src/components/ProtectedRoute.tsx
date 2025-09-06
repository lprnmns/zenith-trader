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
  } catch (error) {
    console.error('ProtectedRoute auth store error:', error);
    return <Navigate to={redirectTo} replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole === 'ADMIN' && !isAdmin) {
    return <Navigate to="/explorer" replace />;
  }

  if (requiredRole === 'USER' && user?.role === 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}