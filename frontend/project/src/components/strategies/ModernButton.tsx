import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModernButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLButtonElement>) => void;
  className?: string;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  tabIndex?: number;
  ariaLabel?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
  ripple?: boolean;
}

const ModernButton: React.FC<ModernButtonProps> = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  onFocus,
  onBlur,
  className,
  id,
  name,
  autoFocus = false,
  tabIndex = 0,
  ariaLabel,
  leftIcon,
  rightIcon,
  fullWidth = false,
  rounded = false,
  ripple = true,
}) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple && !disabled && !loading) {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newRipple = {
        x,
        y,
        id: Date.now(),
      };
      
      setRipples(prev => [...prev, newRipple]);
      
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }
    
    onClick?.(e);
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
    xl: 'px-8 py-6 text-xl',
  };

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
    secondary: 'bg-secondary text-white hover:bg-secondary-dark focus:ring-secondary',
    outline: 'bg-transparent text-primary border border-border hover:bg-surface-light focus:ring-primary',
    ghost: 'bg-transparent text-secondary hover:bg-surface-light focus:ring-primary',
    success: 'bg-success text-white hover:bg-success-light focus:ring-success',
    warning: 'bg-warning text-white hover:bg-warning-light focus:ring-warning',
    error: 'bg-error text-white hover:bg-error-light focus:ring-error',
  };

  const disabledClasses = 'opacity-60 cursor-not-allowed pointer-events-none';

  const baseClasses = cn(
    'modern-button',
    'relative',
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'transition-all',
    'duration-200',
    'transform',
    'hover:scale-105',
    'active:scale-100',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-offset-background',
    'disabled:transform-none',
    'disabled:hover:scale-100',
    {
      'w-full': fullWidth,
      'rounded-full': rounded,
      'rounded-lg': !rounded,
      'overflow-hidden': ripple,
    },
    sizeClasses[size],
    variantClasses[variant],
    {
      [disabledClasses]: disabled || loading,
    },
    className
  );

  return (
    <button
      id={id}
      name={name}
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      onFocus={onFocus}
      onBlur={onBlur}
      autoFocus={autoFocus}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      className={baseClasses}
    >
      {/* Ripple effects */}
      {ripple && ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-white opacity-30 rounded-full animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '0',
            height: '0',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Loading spinner */}
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      )}

      {/* Left icon */}
      {leftIcon && !loading && (
        <span className="mr-2">{leftIcon}</span>
      )}

      {/* Button content */}
      <span className="relative z-10">{children}</span>

      {/* Right icon */}
      {rightIcon && !loading && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  );
};

export default ModernButton;