import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  Search, 
  Bell,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  badge?: number;
}

export const MobileNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const navItems: NavItem[] = [
    {
      icon: <LayoutDashboard className="w-5 h-5" />,
      label: 'Dashboard',
      path: '/dashboard'
    },
    {
      icon: <Target className="w-5 h-5" />,
      label: 'Strategies',
      path: '/strategies'
    },
    {
      icon: <Search className="w-5 h-5" />,
      label: 'Explorer',
      path: '/explorer'
    },
    {
      icon: <Bell className="w-5 h-5" />,
      label: 'Alerts',
      path: '/notifications',
      badge: 0 // TODO: Add notification count
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
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
  );
};