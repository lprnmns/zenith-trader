import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  Search, 
  Bell,
  User,
  LogOut,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  badge?: number;
}

export const MobileNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: 'Home',
      path: '/dashboard'
    },
    {
      icon: <Search className="w-5 h-5" />,
      label: 'Explore',
      path: '/explorer'
    },
    {
      icon: <Target className="w-5 h-5" />,
      label: 'Trade',
      path: '/strategies'
    },
    {
      icon: <Bell className="w-5 h-5" />,
      label: 'Alerts',
      path: '/notifications',
      badge: 0 // TODO: Add notification count
    },
    {
      icon: <User className="w-5 h-5" />,
      label: 'Profile',
      path: '#profile'
    }
  ];

  const handleNavClick = (path: string) => {
    if (path === '#profile') {
      setProfileOpen(true);
    } else {
      navigate(path);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50">
          <div className="grid grid-cols-5 h-16">
            {navItems.map((item) => {
              const isActive = item.path !== '#profile' && location.pathname === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 transition-colors",
                    isActive 
                      ? "text-emerald-400" 
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <div className="relative">
                    {item.icon}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Safe area padding for iPhone */}
          <div className="h-safe-area-inset-bottom bg-slate-900" />
        </div>
      </div>

      {/* Profile Bottom Sheet */}
      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent side="bottom" className="h-auto bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-white">Profile</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 pb-6">
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">{user?.name || 'User'}</p>
                <p className="text-slate-400 text-sm">{user?.email}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50"
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/settings');
                }}
              >
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};