import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { 
  LayoutDashboard, 
  Target, 
  Search, 
  LogOut,
  TrendingUp,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FloatingCryptoSymbols } from '@/components/ui/FloatingCryptoSymbols';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/strategies', icon: Target, label: 'My Strategies' },
    { path: '/explorer', icon: Search, label: 'Wallet Explorer' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      <FloatingCryptoSymbols />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700/50 z-10">
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
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-12 text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200",
                  location.pathname === item.path && "bg-emerald-500/20 text-emerald-400 hover:text-emerald-400"
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
        
        <div className="absolute bottom-6 left-6 right-6">
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 mb-4">
            <div className="text-sm text-slate-400 mb-1">Welcome back</div>
            <div className="font-medium text-white">{user?.name || user?.email}</div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}