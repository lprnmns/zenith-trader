import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FloatingCryptoSymbols } from '@/components/ui/FloatingCryptoSymbols';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

type Mode = 'login' | 'register';

export function AuthPage({ initial }: { initial?: Mode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const pathMode: Mode = React.useMemo(() => {
    if (location.pathname.includes('register')) return 'register';
    if (location.pathname.includes('login')) return 'login';
    return initial ?? 'login';
  }, [location.pathname, initial]);

  const [mode, setMode] = React.useState<Mode>(pathMode);

  // Keep URL and internal state in sync
  React.useEffect(() => {
    if (pathMode !== mode) setMode(pathMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathMode]);

  const switchTo = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    navigate(next === 'login' ? '/login' : '/register');
  };

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      <FloatingCryptoSymbols />
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-5xl px-4 py-8 sm:py-0">
        {/* Mobile Logo Header */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-4">
            <img src="/icon-192x192.png" alt="Zenith Trader logo" className="w-12 h-12 rounded-xl" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Zenith Trader</h1>
          </div>
          <p className="text-center text-slate-300 text-sm px-4">
            {isLogin
              ? 'Sign in to access your crypto trading strategies'
              : 'Join the platform to start copy trading'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:rounded-2xl border-0 lg:border border-slate-800/70 bg-slate-900/40 lg:bg-slate-900/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
          {/* Info / Marketing Panel (slides) */}
          <div className="relative hidden lg:block">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ x: isLogin ? -40 : 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isLogin ? 40 : -40, opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="h-full p-10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <img src="/icon-192x192.png" alt="Zenith Trader logo" className="w-10 h-10 rounded-xl" />
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Zenith Trader</h1>
                  </div>
                  <h2 className="text-3xl font-semibold text-white mb-3">
                    {isLogin ? 'Welcome back, trader' : 'Create your account'}
                  </h2>
                  <p className="text-slate-300 leading-relaxed">
                    {isLogin
                      ? 'Sign in to access your strategies, manage wallets, and monitor real‑time performance.'
                      : 'Join the platform to create strategies, copy top traders, and explore wallets securely.'}
                  </p>
                </div>
                <div className="space-y-3 text-slate-300/90">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-sm">2FA-ready secure auth</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span className="text-sm">Non-custodial wallet insights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                    <span className="text-sm">Strategy backtesting toolkit</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            {/* Sliding accent bar */}
            <motion.div
              aria-hidden
              className={cn(
                'absolute inset-y-0 w-1.5 bg-gradient-to-b from-emerald-400 to-blue-500',
                isLogin ? 'left-0' : 'right-0'
              )}
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>

          {/* Forms Panel */}
          <div className="relative p-6 sm:p-8 lg:p-10 bg-slate-950/30 backdrop-blur-2xl lg:border-l border-slate-800/60 rounded-2xl lg:rounded-none">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {isLogin ? 'Sign in' : 'Sign up'}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {isLogin ? 'Access your account and continue' : 'Create your account in minutes'}
                </p>
              </div>
        {/* Desktop switcher kaldırıldı */}
            </div>

            <div className="mt-8">
              <AnimatePresence mode="wait" initial={false}>
                {isLogin ? (
                  <motion.div
                    key="login"
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -40, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <LoginForm />
                  </motion.div>
                ) : (
                  <motion.div
                    key="register"
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 40, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <RegisterForm />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Alt mod switcher butonları kaldırıldı; yönlendirme için formlardaki linkler kullanılacak */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
