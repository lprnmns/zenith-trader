import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

export function OAuthSuccessPage() {
  const navigate = useNavigate();
  const { googleLogin } = useAuthStore();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processOAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      const userParam = urlParams.get('user');

      if (tokenParam) {
        setToken(tokenParam);
        
        try {
          if (userParam) {
            const userData = JSON.parse(decodeURIComponent(userParam));
            setUser(userData);
            
            // Use auth store to handle Google login
            const result = await googleLogin(tokenParam, userData);
            
            if (result.success) {
              // Store in localStorage as backup
              localStorage.setItem('zenith_auth_token', tokenParam);
              localStorage.setItem('zenith_user_data', JSON.stringify(userData));
              
              // Redirect after a short delay
              setTimeout(() => {
                handleContinue();
              }, 2000);
            } else {
              setError(result.error || 'Failed to authenticate');
            }
          }
        } catch (err) {
          console.error('Error parsing user data:', err);
          setError('Failed to parse user data');
        }
      } else {
        setError('No authentication token found');
      }
      
      setIsProcessing(false);
    };

    processOAuth();
  }, [googleLogin]);

  const handleContinue = () => {
    if (user?.role === 'ADMIN') {
      navigate('/dashboard');
    } else {
      navigate('/explorer');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <CheckCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-white">Authentication Error</h2>
            <p className="mt-2 text-slate-400">{error}</p>
            <div className="mt-6">
              <Button onClick={() => navigate('/login')} className="w-full">
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isProcessing || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Processing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          
          <h2 className="mt-4 text-2xl font-bold text-white">
            Welcome, {user.name || user.email}!
          </h2>
          
          <p className="mt-2 text-slate-400">
            You have successfully signed in with Google
          </p>

          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
            <div className="text-sm text-slate-300">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
              {user.picture && (
                <div className="mt-2">
                  <img 
                    src={user.picture} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full mx-auto"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={handleContinue} className="w-full">
              Continue to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 text-sm text-slate-500">
            You will be redirected automatically in a few seconds...
          </div>
        </div>
      </div>
    </div>
  );
}

export default OAuthSuccessPage;
