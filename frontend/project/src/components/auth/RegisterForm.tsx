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

const registerSchema = z
  .object({
    email: z.string().email('Geçerli bir e‑posta girin'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const [registerError, setRegisterError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setRegisterError('');
      const result = await registerUser(data.email, data.password);
      
      if (result.success) {
        toast.success('Hesap oluşturuldu! Hoş geldiniz!');
        navigate('/dashboard');
      } else {
        setRegisterError(result.error || 'Kayıt başarısız');
        toast.error(result.error || 'Kayıt başarısız');
      }
    } catch (error) {
      const errorMessage = 'Beklenmeyen bir hata oluştu';
      setRegisterError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        onClick={() => { const base = import.meta.env.VITE_OAUTH_BASE_URL || ''; window.location.href = `${base}/api/auth/google`; }}
        variant="outline"
        className="w-full h-11 border-slate-600 bg-slate-800/30 hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
      >
        <Chrome className="w-5 h-5 mr-2" />
        Sign up with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-slate-950 px-3 text-slate-400">Email ile kayıt olun</span>
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
        <div>
          <Input
            {...register('confirmPassword')}
            type="password"
            placeholder="Confirm password"
            className="h-11 bg-slate-900/60 border-slate-700 focus:border-emerald-400 text-white placeholder:text-slate-400"
          />
          {errors.confirmPassword && (
            <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        {registerError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-red-800 text-sm">{registerError}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
        >
          {isSubmitting ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
        </Button>
      </form>

      
      <p className="text-center text-slate-400 text-base">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default RegisterForm;
