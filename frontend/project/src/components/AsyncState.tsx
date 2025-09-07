import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  variant?: 'spinner' | 'skeleton' | 'pulse';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'md',
  text = 'Loading...',
  className,
  variant = 'spinner'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  if (variant === 'skeleton') {
    return (
      <div data-testid="skeleton-loading" className={cn('animate-pulse space-y-4', className)}>
        <div className="space-y-2">
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
        {text && <span className={cn('text-slate-400', textSizes[size])}>{text}</span>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div data-testid="pulse-loading" className={cn('flex flex-col items-center justify-center space-y-2', className)}>
        <div className={cn('bg-slate-700 rounded-full animate-pulse', sizeClasses[size])}></div>
        {text && <span className={cn('text-slate-400', textSizes[size])}>{text}</span>}
      </div>
    );
  }

  return (
    <div data-testid="loading-container" className={cn('flex flex-col items-center justify-center space-y-2', className)}>
      <Loader2 data-testid="loading-spinner" className={cn('animate-spin text-emerald-400', sizeClasses[size])} />
      {text && <span className={cn('text-slate-400', textSizes[size])}>{text}</span>}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error;
  onRetry?: () => void;
  retryText?: string;
  showDetails?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred',
  error,
  onRetry,
  retryText = 'Try Again',
  showDetails = process.env.NODE_ENV === 'development',
  className
}) => {
  return (
    <div data-testid="error-container" className={cn('flex flex-col items-center justify-center space-y-4 p-6', className)}>
      <AlertCircle data-testid="error-icon" className="w-12 h-12 text-red-400" />
      
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-slate-400">{message}</p>
      </div>

      {showDetails && error && (
        <div className="w-full max-w-md p-3 bg-slate-800 rounded-lg border border-slate-700">
          <details className="text-sm">
            <summary className="cursor-pointer text-red-400 hover:text-red-300 mb-2">
              Error Details
            </summary>
            <div className="space-y-2 text-slate-300">
              <p className="font-mono text-xs break-all">{error.message}</p>
              {error.stack && (
                <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        </div>
      )}

      {onRetry && (
        <Button
          data-testid="retry-button"
          onClick={onRetry}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {retryText}
        </Button>
      )}
    </div>
  );
};

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data found',
  message = 'There is nothing to display here',
  icon,
  action,
  className
}) => {
  return (
    <div data-testid="empty-container" className={cn('flex flex-col items-center justify-center space-y-4 p-8', className)}>
      {icon || (
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
          <AlertCircle data-testid="empty-icon" className="w-8 h-8 text-slate-400" />
        </div>
      )}
      
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-slate-400 max-w-md">{message}</p>
      </div>

      {action && (
        <Button
          data-testid="empty-action-button"
          onClick={action.onClick}
          variant={action.variant || 'default'}
          className={action.variant === 'default' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

// Higher-order component for loading states
export function withLoadingState<P extends object>(
  Component: React.ComponentType<P>,
  loadingCondition: (props: P) => boolean,
  LoadingComponent?: React.ComponentType<LoadingStateProps>
) {
  return function WithLoadingState(props: P) {
    if (loadingCondition(props)) {
      const LoadingComp = LoadingComponent || LoadingState;
      return <LoadingComp />;
    }
    return <Component {...props} />;
  };
}

// Higher-order component for error states
export function withErrorState<P extends object>(
  Component: React.ComponentType<P>,
  errorCondition: (props: P) => Error | null | undefined,
  ErrorComponent?: React.ComponentType<ErrorStateProps>
) {
  return function WithErrorState(props: P) {
    const error = errorCondition(props);
    if (error) {
      const ErrorComp = ErrorComponent || ErrorState;
      return <ErrorComp error={error} />;
    }
    return <Component {...props} />;
  };
}

// Combined loading and error HOC
export function withAsyncState<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    isLoading?: (props: P) => boolean;
    error?: (props: P) => Error | null | undefined;
    isEmpty?: (props: P) => boolean;
    LoadingComponent?: React.ComponentType<LoadingStateProps>;
    ErrorComponent?: React.ComponentType<ErrorStateProps>;
    EmptyComponent?: React.ComponentType<EmptyStateProps>;
  }
) {
  return function WithAsyncState(props: P) {
    // Check error first
    if (options.error) {
      const error = options.error(props);
      if (error) {
        const ErrorComp = options.ErrorComponent || ErrorState;
        return <ErrorComp error={error} />;
      }
    }

    // Then check loading
    if (options.isLoading) {
      const isLoading = options.isLoading(props);
      if (isLoading) {
        const LoadingComp = options.LoadingComponent || LoadingState;
        return <LoadingComp />;
      }
    }

    // Finally check empty
    if (options.isEmpty) {
      const isEmpty = options.isEmpty(props);
      if (isEmpty) {
        const EmptyComp = options.EmptyComponent || EmptyState;
        return <EmptyComp />;
      }
    }

    return <Component {...props} />;
  };
}