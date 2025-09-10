import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { Zap, Chrome } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    // Mock login - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, simulate a successful login
    // In production, this would call the actual API
    const result = await login(data.email, data.password);
    
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth
    const envBase = (import.meta.env.VITE_OAUTH_BASE_URL as string | undefined);
    const host = window.location.hostname;
    const base = envBase && envBase.trim().length > 0
      ? envBase.trim()
      : (host.endsWith('zenithtrader.alperenmanas.app') ? 'https://api.zenithtrader.alperenmanas.app' : '');
    window.location.href = `${base}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDYwIDAgTCAwIDAgMCA2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
      
      <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border-slate-700/50 shadow-2xl">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              Zenith Trader
            </h1>
          </div>
          <p className="text-slate-400">Sign in to your trading account</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-12 border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 text-white"
          >
            <Chrome className="w-5 h-5 mr-2" />
            Sign in with Google
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-slate-900 px-4 text-slate-400">Or continue with email</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input
                {...register('email')}
                type="email"
                placeholder="Email address"
                className="h-12 bg-slate-800/50 border-slate-600 focus:border-emerald-400 text-white placeholder:text-slate-400"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <Input
                {...register('password')}
                type="password"
                placeholder="Password"
                className="h-12 bg-slate-800/50 border-slate-600 focus:border-emerald-400 text-white placeholder:text-slate-400"
              />
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-medium"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="text-center">
          <p className="text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
