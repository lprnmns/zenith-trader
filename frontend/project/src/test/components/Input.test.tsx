import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('should render input with default props', () => {
    render(<Input placeholder="Enter text" />);
    
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('h-9');
    expect(input).toHaveClass('w-full');
    expect(input).toHaveClass('rounded-md');
    expect(input).toHaveClass('border');
    expect(input).toHaveClass('border-input');
    expect(input).toHaveClass('bg-transparent');
    expect(input).toHaveClass('px-3');
    expect(input).toHaveClass('py-1');
    expect(input).toHaveClass('text-sm');
    expect(input).toHaveClass('shadow-sm');
  });

  it('should render input with custom type', () => {
    render(<Input type="email" placeholder="Email" />);
    
    const input = screen.getByPlaceholderText('Email');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should render password input', () => {
    render(<Input type="password" placeholder="Password" />);
    
    const input = screen.getByPlaceholderText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should render number input', () => {
    render(<Input type="number" placeholder="Number" />);
    
    const input = screen.getByPlaceholderText('Number');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('should handle input value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed');
    expect(input).toHaveClass('disabled:opacity-50');
  });

  it('should apply custom className', () => {
    render(<Input className="custom-class" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
    expect(input).toHaveClass('h-9'); // should still have default classes
  });

  it('should handle focus events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('should have proper focus-visible styles', () => {
    render(<Input />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('focus-visible:outline-none');
    expect(input).toHaveClass('focus-visible:ring-1');
    expect(input).toHaveClass('focus-visible:ring-ring');
  });

  it('should handle keyboard events', () => {
    const handleKeyDown = vi.fn();
    const handleKeyUp = vi.fn();
    render(<Input onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleKeyDown).toHaveBeenCalledTimes(1);
    
    fireEvent.keyUp(input, { key: 'Enter' });
    expect(handleKeyUp).toHaveBeenCalledTimes(1);
  });

  it('should render with value prop', () => {
    render(<Input value="test value" readOnly />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('test value');
  });

  it('should render with placeholder text', () => {
    render(<Input placeholder="Enter your name" />);
    
    const input = screen.getByPlaceholderText('Enter your name');
    expect(input).toBeInTheDocument();
  });

  it('should have proper placeholder styling', () => {
    render(<Input placeholder="Placeholder text" />);
    
    const input = screen.getByPlaceholderText('Placeholder text');
    expect(input).toHaveClass('placeholder:text-muted-foreground');
  });

  it('should handle required attribute', () => {
    render(<Input required />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
  });

  it('should handle readonly attribute', () => {
    render(<Input readOnly />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
  });

  it('should support ref forwarding', () => {
    const ref = vi.fn();
    const { container } = render(<Input ref={ref} />);
    
    expect(ref).toHaveBeenCalledWith(container.firstChild);
  });

  it('should render file input with proper styling', () => {
    render(<Input type="file" />);
    
    const input = screen.getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveClass('file:border-0');
    expect(input).toHaveClass('file:bg-transparent');
    expect(input).toHaveClass('file:text-sm');
    expect(input).toHaveClass('file:font-medium');
    expect(input).toHaveClass('file:text-foreground');
  });

  it('should handle maxLength and minLength attributes', () => {
    render(<Input maxLength={100} minLength={5} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxlength', '100');
    expect(input).toHaveAttribute('minlength', '5');
  });

  it('should handle pattern attribute', () => {
    render(<Input pattern="[A-Za-z]{3}" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('pattern', '[A-Za-z]{3}');
  });

  it('should handle inputMode attribute', () => {
    render(<Input inputMode="numeric" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });

  it('should handle autoComplete attribute', () => {
    render(<Input autoComplete="email" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  it('should handle name attribute', () => {
    render(<Input name="username" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('name', 'username');
  });

  it('should handle id attribute', () => {
    render(<Input id="test-input" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('should handle aria attributes', () => {
    render(<Input aria-label="Test input" aria-describedby="test-description" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', 'Test input');
    expect(input).toHaveAttribute('aria-describedby', 'test-description');
  });

  it('should have proper transition styles', () => {
    render(<Input />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('transition-colors');
  });
});