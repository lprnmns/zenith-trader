import React, { useState, useCallback, memo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/authStore';
import { 
  LayoutDashboard, 
  Target, 
  Search, 
  LogOut,
  TrendingUp,
  Zap,
  Menu,
  X,
  Settings,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingCryptoSymbols } from '@/components/ui/FloatingCryptoSymbols';
import NotificationSettings from '@/components/NotificationSettings';

// Memoized navigation item component
const NavItem = memo(({ 
  item, 
  isActive, 
  onClick 
}: { 
  item: any; 
  isActive: boolean; 
  onClick: () => void; 
}) => (
  <Button
    variant="ghost"
    className={cn(
      "w-full justify-start gap-3 h-12 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200",
      isActive && "bg-emerald-500/20 text-emerald-400 hover:text-emerald-400"
    )}
    onClick={onClick}
  >
    <item.icon className="w-5 h-5" />
    {item.label}
  </Button>
));

NavItem.displayName = 'NavItem';

// Memoized user info component
const UserInfo = memo(({ user }: { user: any }) => (
  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 mb-4">
    <div className="text-sm text-slate-400 mb-1">Welcome back</div>
    <div className="font-medium text-white truncate">{user?.name || user?.email}</div>
  </div>
));

UserInfo.displayName = 'UserInfo';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  let user, logout;
  try {
    const authStore = useAuthStore();
    user = authStore.user;
    logout = authStore.logout;
  } catch (error) {
    console.error('AppLayout auth store error:', error);
    // If store fails, redirect to login
    navigate('/login');
    return null;
  }
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  // Memoized navigation items - visible to all users
  const navItems = React.useMemo(() => [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/strategies', icon: Target, label: 'My Strategies' },
    { path: '/explorer', icon: Search, label: 'Wallet Explorer' },
  ], [user?.role]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  }, [navigate]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const toggleNotificationPanel = useCallback(() => {
    setIsNotificationPanelOpen(prev => !prev);
  }, []);

  const NavigationContent = useCallback(() => (
    <>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            Zenith Trader
          </h1>
        </div>
        
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            />
          ))}
        </nav>
      </div>
      
      <div className="absolute bottom-6 left-6 right-6">
        <UserInfo user={user} />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 mb-2"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
          onClick={toggleNotificationPanel}
        >
          <Bell className="w-5 h-5" />
          Notifications
        </Button>
      </div>
    </>
  ), [navItems, location.pathname, user, handleLogout, toggleNotificationPanel]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      <FloatingCryptoSymbols />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-300">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
                <NavigationContent />
              </SheetContent>
            </Sheet>
            <div className="w-6 h-6 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold">Zenith Trader</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300"
              onClick={() => setIsNotificationPanelOpen(true)}
            >
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 z-10">
        <NavigationContent />
      </div>
      
      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

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
    </div>
  );
}