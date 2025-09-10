import React, { useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingState } from './components/AsyncState';
import { useAuthStore } from './stores/authStore';
import { Toaster } from 'sonner';
import './App.css';
import './utils/pwa';

// Import components directly to avoid lazy loading issues
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Import pages directly to avoid lazy loading issues
import { DashboardPage } from './pages/DashboardPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OAuthSuccessPage } from './pages/OAuthSuccessPage';
import { OAuthErrorPage } from './pages/OAuthErrorPage';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import TestPage from './pages/TestPage';

// Import AuthPage directly
import { AuthPage } from './pages/AuthPage';

// Import notification service directly to avoid lazy loading issues
import { notificationService } from './services/notificationService';

function App() {
  const { isAuthenticated, user } = useAuthStore();

  // Role-based default route
  const defaultRoute = useMemo(() => {
    if (!isAuthenticated || !user) return '/dashboard';
    return user.role === 'ADMIN' ? '/dashboard' : '/explorer';
  }, [isAuthenticated, user]);

  const initializeNotifications = useCallback(async () => {
    try {
      const success = await notificationService.init();
      if (success) {
        console.log('[App] Notification service initialized');
      } else {
        console.warn('[App] Notification service initialization failed');
      }
    } catch (error) {
      console.error('[App] Notification service initialization error:', error);
    }
  }, []);

  const setupPWAEventListeners = useCallback(() => {
    const handlePWAUpdateAvailable = () => {
      console.log('[App] PWA update available');
    };
    
    const handlePWAOnline = async () => {
      console.log('[App] PWA online');
      notificationService.success('You are back online', {
        description: 'All features are now available'
      });
    };
    
    const handlePWAOffline = async () => {
      console.log('[App] PWA offline');
      notificationService.warning('You are offline', {
        description: 'Some features may be limited'
      });
    };
    
    const handlePWASyncComplete = async (event: CustomEvent) => {
      console.log('[App] PWA sync complete:', event.detail);
      notificationService.success('Sync completed', {
        description: `${event.detail.count || 'All'} items synced successfully`
      });
    };
    
    window.addEventListener('pwa-update-available', handlePWAUpdateAvailable);
    window.addEventListener('pwa-online', handlePWAOnline);
    window.addEventListener('pwa-offline', handlePWAOffline);
    window.addEventListener('pwa-sync-complete', handlePWASyncComplete as EventListener);
    
    return () => {
      window.removeEventListener('pwa-update-available', handlePWAUpdateAvailable);
      window.removeEventListener('pwa-online', handlePWAOnline);
      window.removeEventListener('pwa-offline', handlePWAOffline);
      window.removeEventListener('pwa-sync-complete', handlePWASyncComplete as EventListener);
    };
  }, []);

  useEffect(() => {
    initializeNotifications();
    const cleanupPWA = setupPWAEventListeners();
    return cleanupPWA;
  }, [initializeNotifications, setupPWAEventListeners]);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
            <Route
              path="/login"
              element={!isAuthenticated ? <AuthPage initial="login" /> : <Navigate to={defaultRoute} replace />}
            />
            <Route
              path="/register"
              element={!isAuthenticated ? <AuthPage initial="register" /> : <Navigate to={defaultRoute} replace />}
            />
            <Route path="/auth/success" element={<OAuthSuccessPage />} />
            <Route path="/auth/error" element={<OAuthErrorPage />} />
            <Route path="/test" element={<TestPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to={defaultRoute} replace />} />
              <Route 
                path="dashboard" 
                element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="strategies" 
                element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <StrategiesPage />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="explorer" 
                element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <ExplorerPage />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } 
              />
              <Route 
                path="notifications" 
                element={
                  <ErrorBoundary>
                    <ProtectedRoute>
                      <NotificationsPage />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } 
              />
            </Route>
          </Routes>
          
          {/* PWA Install Prompt */}
          <PWAInstallPrompt />
          
          {/* PWA Update Prompt */}
          <PWAUpdatePrompt />
        
        {/* Toast notifications */}
        <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          duration={4000}
        />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
