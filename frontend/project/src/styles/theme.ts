// Zenith Trader Theme Configuration
export const theme = {
  colors: {
    // Primary colors - Emerald/Teal gradient
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6', // Main primary
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      950: '#042f2e'
    },
    
    // Secondary colors - Blue
    secondary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main secondary
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    
    // Accent colors - Purple
    accent: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7', // Main accent
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764'
    },
    
    // Success - Green
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Main success
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16'
    },
    
    // Warning - Orange
    warning: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316', // Main warning
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407'
    },
    
    // Error - Red
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main error
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a'
    },
    
    // Neutral - Slate
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    },
    
    // Dark mode backgrounds
    dark: {
      bg: {
        primary: '#0f172a',
        secondary: '#1e293b',
        tertiary: '#334155',
        card: 'rgba(30, 41, 59, 0.5)',
        hover: 'rgba(51, 65, 85, 0.5)',
        modal: 'rgba(15, 23, 42, 0.95)'
      }
    }
  },
  
  // Gradient presets
  gradients: {
    primary: 'linear-gradient(135deg, #14b8a6 0%, #3b82f6 100%)',
    secondary: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
    success: 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)',
    warning: 'linear-gradient(135deg, #f97316 0%, #f43f5e 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
    dark: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glow: {
      primary: '0 0 20px rgba(20, 184, 166, 0.3)',
      secondary: '0 0 20px rgba(59, 130, 246, 0.3)',
      success: '0 0 20px rgba(34, 197, 94, 0.3)',
      warning: '0 0 20px rgba(249, 115, 22, 0.3)',
      error: '0 0 20px rgba(239, 68, 68, 0.3)'
    }
  },
  
  // Border radius
  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px'
  },
  
  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    base: '250ms ease-in-out',
    slow: '350ms ease-in-out',
    slower: '500ms ease-in-out'
  },
  
  // Animations
  animations: {
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    bounce: 'bounce 1s infinite',
    spin: 'spin 1s linear infinite',
    ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
    slideIn: 'slideIn 0.3s ease-out',
    fadeIn: 'fadeIn 0.3s ease-in',
    scaleIn: 'scaleIn 0.2s ease-out'
  }
};

export type Theme = typeof theme;
