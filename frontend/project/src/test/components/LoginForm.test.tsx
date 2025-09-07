import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LoginForm } from '@/components/auth/LoginForm';

// Mock router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>
}));

// Mock auth store
const mockLogin = vi.fn();
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    login: mockLogin
  })
}));

// Mock GoogleLoginButton
vi.mock('@/components/auth/GoogleLoginButton', () => ({
  GoogleLoginButton: () => <div data-testid="google-login-button">Google Login</div>
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form with email and password inputs', () => {
    render(<LoginForm />);
    
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /giriş yap/i })).toBeInTheDocument();
    expect(screen.getByText(/email ile giriş yapın/i)).toBeInTheDocument();
  });

  it('should handle email input changes', () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should handle password input changes', () => {
    render(<LoginForm />);
    
    const passwordInput = screen.getByPlaceholderText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(passwordInput).toHaveValue('password123');
  });

  it('should show validation errors for empty fields on submit', async () => {
    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/geçerli bir e‑posta girin/i)).toBeInTheDocument();
      expect(screen.getByText(/şifre en az 6 karakter olmalı/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email format', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/geçerli bir e‑posta girin/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for short password', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/şifre en az 6 karakter olmalı/i)).toBeInTheDocument();
    });
  });

  it('should call login function with correct credentials on valid submit', async () => {
    const mockLoginResponse = { success: true };
    mockLogin.mockResolvedValue(mockLoginResponse);
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should navigate to dashboard on successful login', async () => {
    const mockLoginResponse = { success: true };
    mockLogin.mockResolvedValue(mockLoginResponse);
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show loading state during login', async () => {
    // Mock login to return a promise that never resolves
    mockLogin.mockImplementation(() => new Promise(() => {}));
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    // Button should be disabled and show loading text
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Giriş yapılıyor...')).toBeInTheDocument();
    });
  });

  it('should show error message when login fails', async () => {
    const errorMessage = 'Giriş başarısız';
    const mockLoginResponse = { success: false, error: errorMessage };
    mockLogin.mockResolvedValue(mockLoginResponse);
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should show error message when login throws exception', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Beklenmeyen bir hata oluştu')).toBeInTheDocument();
    });
  });

  it('should have link to register page', () => {
    render(<LoginForm />);
    
    const registerLink = screen.getByRole('link', { name: /sign up/i });
    expect(registerLink).toHaveAttribute('href', '/register');
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('should show Google login button', () => {
    render(<LoginForm />);
    
    expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
    expect(screen.getByText('Google Login')).toBeInTheDocument();
  });

  it('should call toast.success on successful login', async () => {
    const mockLoginResponse = { success: true };
    mockLogin.mockResolvedValue(mockLoginResponse);
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      const { toast } = require('sonner');
      expect(toast.success).toHaveBeenCalledWith('Giriş başarılı!');
    });
  });

  it('should call toast.error on failed login', async () => {
    const errorMessage = 'Giriş başarısız';
    const mockLoginResponse = { success: false, error: errorMessage };
    mockLogin.mockResolvedValue(mockLoginResponse);
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      const { toast } = require('sonner');
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  it('should have proper form structure', () => {
    render(<LoginForm />);
    
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    
    expect(form).toContainElement(emailInput);
    expect(form).toContainElement(passwordInput);
    expect(form).toContainElement(submitButton);
  });

  it('should display Turkish validation messages', async () => {
    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /giriş yap/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Geçerli bir e‑posta girin')).toBeInTheDocument();
      expect(screen.getByText('Şifre en az 6 karakter olmalı')).toBeInTheDocument();
    });
  });

  it('should handle form submission on Enter key press in password field', async () => {
    const mockLoginResponse = { success: true };
    mockLogin.mockResolvedValue(mockLoginResponse);
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Press Enter in password field
    fireEvent.keyDown(passwordInput, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});