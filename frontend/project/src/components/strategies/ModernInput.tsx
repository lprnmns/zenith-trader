import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModernInputProps {
  label?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  success?: string;
  helperText?: string;
  className?: string;
  id?: string;
  name?: string;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  autoComplete?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
}

const ModernInput: React.FC<ModernInputProps> = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  readOnly = false,
  required = false,
  error,
  success,
  helperText,
  className,
  id,
  name,
  min,
  max,
  step,
  pattern,
  autoComplete,
  leftIcon,
  rightIcon,
  loading = false,
  variant = 'default',
  size = 'md',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const hasError = !!error;
  const hasSuccess = !!success;

  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-5 py-4 text-lg',
  };

  const variantClasses = {
    default: 'bg-surface-light border-border focus:bg-surface',
    filled: 'bg-surface border-transparent focus:bg-surface-light',
    outlined: 'bg-transparent border-border focus:bg-surface-light',
  };

  const stateClasses = cn(
    'modern-input',
    sizeClasses[size],
    variantClasses[variant],
    {
      'error': hasError,
      'success': hasSuccess,
      'opacity-60 cursor-not-allowed': disabled,
      'cursor-not-allowed': readOnly,
    }
  );

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={inputId}
          className={cn(
            'block text-sm font-medium transition-colors',
            {
              'text-primary': isFocused,
              'text-error': hasError,
              'text-success': hasSuccess,
              'text-tertiary': !isFocused && !hasError && !hasSuccess,
              'text-primary': disabled,
            }
          )}
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary z-10">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          autoComplete={autoComplete}
          name={name}
          placeholder={placeholder}
          className={cn(
            stateClasses,
            'w-full border rounded-lg transition-all duration-200 outline-none',
            {
              'pl-10': leftIcon,
              'pr-10': rightIcon || type === 'password' || loading || hasError || hasSuccess,
              'pr-12': (rightIcon || type === 'password') && (loading || hasError || hasSuccess),
            },
            className
          )}
        />

        {/* Right side elements */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2 z-10">
          {loading && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}

          {hasError && !loading && (
            <AlertCircle className="w-4 h-4 text-error" />
          )}

          {hasSuccess && !loading && (
            <CheckCircle className="w-4 h-4 text-success" />
          )}

          {type === 'password' && !loading && !hasError && !hasSuccess && (
            <button
              type="button"
              onClick={handleTogglePassword}
              className="text-tertiary hover:text-primary transition-colors p-1"
              disabled={disabled}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}

          {rightIcon && !loading && !hasError && !hasSuccess && type !== 'password' && (
            <div className="text-tertiary">
              {rightIcon}
            </div>
          )}
        </div>
      </div>

      {/* Helper text and error messages */}
      {(helperText || error || success) && (
        <div className="text-xs space-y-1">
          {error && (
            <p className="text-error flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
          
          {success && (
            <p className="text-success flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {success}
            </p>
          )}
          
          {helperText && !error && !success && (
            <p className="text-tertiary">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ModernInput;