import React from 'react';
import { Button } from '@/components/ui/button';
import { Chrome, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GoogleLoginButtonProps {
  className?: string;
  disabled?: boolean;
}

export function GoogleLoginButton({ className, disabled = false }: GoogleLoginButtonProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      
      // Redirect to backend Google OAuth endpoint
      const authUrl = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Google login error:', error);
      setIsLoading(false);
      // You could show a toast notification here
      alert('Google login failed. Please try again.');
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={`
        w-full h-11 border-slate-600 bg-slate-800/30 
        hover:bg-slate-700/50 text-slate-300 
        hover:text-white transition-colors
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={handleGoogleLogin}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      ) : (
        <Chrome className="w-5 h-5 mr-2" />
      )}
      {isLoading ? 'Connecting to Google...' : 'Sign in with Google'}
    </Button>
  );
}

export default GoogleLoginButton;
