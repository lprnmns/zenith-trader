import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Target, Search, Bell, LogOut, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

interface MobileMenuProps {
  onNavigate: (path: string) => void;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ onNavigate, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const items = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/strategies', icon: Target, label: 'My Strategies' },
    { path: '/explorer', icon: Search, label: 'Wallet Explorer' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  const handleClick = (path: string) => {
    onNavigate(path);
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <img src="/icon-192x192.png" alt="Zenith Trader logo" className="w-7 h-7 rounded-md" />
          <span className="text-base font-semibold">Zenith Trader</span>
        </div>
      </div>

      <nav className="p-3 space-y-2">
        {items.map((it) => {
          const isActive = location.pathname === it.path;
          const Icon = it.icon;
          return (
            <Button
              key={it.path}
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 h-12 text-slate-300 hover:text-white hover:bg-slate-800/60',
                isActive && 'bg-emerald-500/20 text-emerald-400 hover:text-emerald-400'
              )}
              onClick={() => handleClick(it.path)}
            >
              <Icon className="w-5 h-5" />
              {it.label}
            </Button>
          );
        })}
      </nav>

      <div className="mt-auto p-3 border-t border-slate-700/50">
        <div className="text-xs text-slate-400 mb-2 truncate">{user?.email}</div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </div>
  );
};