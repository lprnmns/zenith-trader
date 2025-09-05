import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { Chrome, Lock } from 'lucide-react';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e‑posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loginError, setLoginError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoginError('');
      const result = await login(data.email, data.password);
      
      if (result.success) {
        toast.success('Giriş başarılı!');
        navigate('/dashboard');
      } else {
        setLoginError(result.error || 'Giriş başarısız');
        toast.error(result.error || 'Giriş başarısız');
      }
    } catch (error) {
      const errorMessage = 'Beklenmeyen bir hata oluştu';
      setLoginError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        disabled
        variant="outline"
        className="w-full h-11 border-slate-600 bg-slate-800/30 text-slate-500 cursor-not-allowed opacity-50"
      >
        <Chrome className="w-5 h-5 mr-2" />
        Google Sign-in (Yakında)
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-slate-950 px-3 text-slate-400">Email ile giriş yapın</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            {...register('email')}
            type="email"
            placeholder="Email address"
            className="h-11 bg-slate-900/60 border-slate-700 focus:border-emerald-400 text-white placeholder:text-slate-400"
          />
          {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Input
            {...register('password')}
            type="password"
            placeholder="Password"
            className="h-11 bg-slate-900/60 border-slate-700 focus:border-emerald-400 text-white placeholder:text-slate-400"
          />
          {errors.password && (
            <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        {loginError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-red-800 text-sm">{loginError}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
        >
          {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </Button>
      </form>

      {/* Admin hint */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-center space-x-2">
          <Lock className="h-4 w-4 text-blue-600" />
          <p className="text-blue-800 text-sm">
            <strong>Admin:</strong> admin@gmail.com (Copy trading erişimi)
          </p>
        </div>
      </div>

  <p className="text-center text-slate-400 text-base">
        Don’t have an account?{' '}
        <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default LoginForm;
