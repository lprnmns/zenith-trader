import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './stores/authStore';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { notificationService } from './services/notificationService';
import { Toaster } from 'sonner';
import './App.css';

function App() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Initialize notification service when app loads
    notificationService.init().then((success) => {
      if (success) {
        console.log('[App] Notification service initialized');
      } else {
        console.warn('[App] Notification service initialization failed');
      }
    });
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <AuthPage initial="login" /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/register"
          element={!isAuthenticated ? <AuthPage initial="register" /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="strategies" element={<StrategiesPage />} />
          <Route path="explorer" element={<ExplorerPage />} />
        </Route>
      </Routes>
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Toast notifications */}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton 
        duration={4000}
      />
    </Router>
  );
}

export default App;