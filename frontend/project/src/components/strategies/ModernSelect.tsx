import React, { useState } from 'react';
import { ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
}

export interface ModernSelectProps {
  label?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  success?: string;
  helperText?: string;
  className?: string;
  id?: string;
  name?: string;
  options: SelectOption[];
  loading?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
}

const ModernSelect = React.forwardRef<HTMLDivElement, ModernSelectProps>((props, ref) => {
  const {
    label,
    placeholder = 'Select an option',
    value,
    onChange,
    onBlur,
    onFocus,
    disabled = false,
    required = false,
    error,
    success,
    helperText,
    className,
    id,
    name,
    options,
    loading = false,
    searchable = false,
    clearable = false,
    variant = 'default',
    size = 'md',
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const selectedOption = options.find(option => option.value === value);
  const hasError = !!error;
  const hasSuccess = !!success;

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleSelectOption = (option: SelectOption) => {
    if (!option.disabled) {
      onChange?.(option.value);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <div ref={ref} className="space-y-2">
      {label && (
        <label 
          htmlFor={selectId}
          className={cn(
            'block text-sm font-medium transition-colors',
            {
              'text-emerald-400': isFocused,
              'text-red-400': hasError,
              'text-green-400': hasSuccess,
              'text-slate-400': !isFocused && !hasError && !hasSuccess,
              'text-slate-400/50': disabled,
            }
          )}
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Select Trigger */}
        <div
          id={selectId}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-disabled={disabled}
          onClick={handleToggle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'modern-select',
            sizeClasses[size],
            variantClasses[variant],
            'relative w-full border rounded-lg transition-all duration-200 outline-none cursor-pointer flex items-center justify-between',
            {
              'error': hasError,
              'success': hasSuccess,
              'opacity-60 cursor-not-allowed': disabled,
            },
            className
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedOption?.icon && (
              <div className="flex-shrink-0">
                {selectedOption.icon}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              {selectedOption ? (
                <span className="text-primary truncate">
                  {selectedOption.label}
                </span>
              ) : (
                <span className="text-tertiary truncate">
                  {placeholder}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {loading && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}

            {hasError && !loading && (
              <AlertCircle className="w-4 h-4 text-error" />
            )}

            {hasSuccess && !loading && (
              <CheckCircle className="w-4 h-4 text-success" />
            )}

            {clearable && value && !loading && !hasError && !hasSuccess && (
              <button
                type="button"
                onClick={handleClear}
                className="text-tertiary hover:text-primary transition-colors p-1"
                disabled={disabled}
              >
                ×
              </button>
            )}

            <ChevronDown 
              className={cn(
                'w-4 h-4 text-tertiary transition-transform duration-200',
                {
                  'rotate-180': isOpen,
                }
              )} 
            />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl z-50 max-h-60 overflow-hidden">
            {/* Search Input */}
            {searchable && (
              <div className="p-3 border-b border-border">
                <input
                  type="text"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-light border border-border rounded-md text-primary placeholder-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>
            )}

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-tertiary text-sm">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={option.value === value}
                    className={cn(
                      'px-3 py-2 cursor-pointer transition-colors flex items-center gap-2 hover:bg-surface-light',
                      {
                        'bg-surface-light': option.value === value,
                        'opacity-50 cursor-not-allowed': option.disabled,
                      }
                    )}
                    onClick={() => handleSelectOption(option)}
                  >
                    {option.icon && (
                      <div className="flex-shrink-0">
                        {option.icon}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-primary truncate">
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="text-xs text-tertiary truncate">
                          {option.description}
                        </div>
                      )}
                    </div>

                    {option.value === value && (
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
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
});

ModernSelect.displayName = 'ModernSelect';

export default ModernSelect;