import React, { useState, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from './Sidebar';
import { MobileNavBar } from './MobileNavBar';
import { Menu, X, Bell } from 'lucide-react';
import { FloatingCryptoSymbols } from '@/components/ui/FloatingCryptoSymbols';
import NotificationSettings from '@/components/NotificationSettings';
import { Toaster } from "@/components/ui/sonner";
import { MobileMenu } from './MobileMenu';

export function AppLayout() {
  const navigate = useNavigate();
  
  let user;
  try {
    const authStore = useAuthStore();
    user = authStore.user;
  } catch (error) {
    console.error('AppLayout auth store error:', error);
    navigate('/login');
    return null;
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const toggleNotificationPanel = useCallback(() => {
    setIsNotificationPanelOpen(prev => !prev);
  }, []);

  return (
    // Ana kapsayıcı: Ekranı kaplar ve Flexbox uygular
    <div className="flex h-screen bg-slate-900 text-foreground"> {/* ANA ARKA PLAN RENGİ */}
      
      {/* 1. Sütun: Sabit ve Stilli Sidebar - Only on desktop */}
      <div className="hidden lg:block">
        <Sidebar onNotificationClick={toggleNotificationPanel} />
      </div>

      {/* 2. Sütun: Kaydırılabilir Ana İçerik Alanı */}
      {/* 'bg-slate-900' veya temanızın ana arka plan rengi */}
      <main className="flex-1 overflow-y-auto bg-slate-900 p-4 sm:p-6 md:p-8 relative">
        <FloatingCryptoSymbols />
        
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50">
          <div className="flex items-center justify-between px-4 py-3">
            <button aria-label="Open menu" onClick={() => setIsMobileMenuOpen(true)} className="text-slate-200">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-semibold">Zenith Trader</span>
            </div>
            <button aria-label="Open notifications" onClick={toggleNotificationPanel} className="text-slate-200">
              <Bell className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="lg:pt-0 pt-16 pb-20 lg:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNavBar />

      {/* Mobile Side Menu */}
      <Sheet open={isMobileMenuOpen} onOpenChange={(o) => {
        setIsMobileMenuOpen(o);
        if (o) {
          document.body.classList.add('lock-scroll');
        } else {
          document.body.classList.remove('lock-scroll');
        }
      }}>
        <SheetContent side="left" className="w-[85vw] max-w-sm bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
          {/* Mobile menu content */}
          {/* Lazy import yerine doğrudan import ettik */}
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore */}
          <MobileMenu onNavigate={(path: string) => { setIsMobileMenuOpen(false); navigate(path); }} onClose={() => setIsMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Notification Panel */}
      <Sheet open={isNotificationPanelOpen} onOpenChange={setIsNotificationPanelOpen}>
        <SheetContent side="right" className="w-full sm:w-96 bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Notifications</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNotificationPanelOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <NotificationSettings userId={user?.id} />
          </div>
        </SheetContent>
      </Sheet>
      
      <Toaster />
    </div>
  );
}
