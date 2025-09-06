import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OAuthErrorPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam) {
      setError(errorParam);
    } else {
      setError('Unknown authentication error');
    }
  }, []);

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'access_denied':
        return 'You denied access to your Google account';
      case 'invalid_request':
        return 'Invalid authentication request';
      case 'unauthorized_client':
        return 'Unauthorized client application';
      case 'unsupported_response_type':
        return 'Unsupported response type';
      case 'invalid_scope':
        return 'Invalid scope requested';
      case 'server_error':
        return 'Server error occurred';
      case 'temporarily_unavailable':
        return 'Service temporarily unavailable';
      case 'oauth_failed':
        return 'OAuth authentication failed';
      default:
        return 'Authentication failed. Please try again.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          
          <h2 className="mt-4 text-2xl font-bold text-white">
            Authentication Failed
          </h2>
          
          <p className="mt-2 text-slate-400">
            {getErrorMessage(error)}
          </p>

          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
            <div className="text-sm text-slate-300">
              <p><strong>Error Code:</strong> {error}</p>
              <p className="mt-2">
                This could be due to:
              </p>
              <ul className="list-disc list-inside mt-2 text-left text-slate-400">
                <li>Network connectivity issues</li>
                <li>Google OAuth service outage</li>
                <li>Invalid client configuration</li>
                <li>Expired or invalid credentials</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Button onClick={handleBackToLogin} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'} 
              className="w-full"
            >
              Go to Homepage
            </Button>
          </div>

          <div className="mt-4 text-sm text-slate-500">
            If the problem persists, please contact support.
          </div>
        </div>
      </div>
    </div>
  );
}

export default OAuthErrorPage;