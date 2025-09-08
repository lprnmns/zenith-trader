import React, { useState, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { 
  LayoutDashboard, 
  Target, 
  Search, 
  LogOut,
  Zap,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface SidebarProps {
  onNotificationClick?: () => void;
}

export function Sidebar({ onNotificationClick }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  let user, logout;
  try {
    const authStore = useAuthStore();
    user = authStore.user;
    logout = authStore.logout;
  } catch (error) {
    console.error('Sidebar auth store error:', error);
    // If store fails, redirect to login
    navigate('/login');
    return null;
  }

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
  }, [navigate]);

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50">
      <div className="p-6 flex-shrink-0">
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
      
      <div className="mt-auto p-6 flex-shrink-0">
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
          onClick={onNotificationClick}
        >
          <Bell className="w-5 h-5" />
          Notifications
        </Button>
      </div>
    </div>
  );
}