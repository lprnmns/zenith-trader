import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should render button with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('text-primary-foreground');
    expect(button).toHaveClass('shadow');
    expect(button).toHaveClass('h-9');
    expect(button).toHaveClass('px-4');
    expect(button).toHaveClass('py-2');
  });

  it('should render button with variant', () => {
    render(<Button variant="outline">Outline Button</Button>);
    
    const button = screen.getByRole('button', { name: /outline button/i });
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('border-input');
    expect(button).toHaveClass('bg-background');
    expect(button).toHaveClass('shadow-sm');
    expect(button).toHaveClass('hover:bg-accent');
    expect(button).toHaveClass('hover:text-accent-foreground');
  });

  it('should render button with size', () => {
    render(<Button size="lg">Large Button</Button>);
    
    const button = screen.getByRole('button', { name: /large button/i });
    expect(button).toHaveClass('h-10');
    expect(button).toHaveClass('rounded-md');
    expect(button).toHaveClass('px-8');
  });

  it('should render small sized button', () => {
    render(<Button size="sm">Small Button</Button>);
    
    const button = screen.getByRole('button', { name: /small button/i });
    expect(button).toHaveClass('h-8');
    expect(button).toHaveClass('rounded-md');
    expect(button).toHaveClass('px-3');
    expect(button).toHaveClass('text-xs');
  });

  it('should render icon sized button', () => {
    render(<Button size="icon">Icon Button</Button>);
    
    const button = screen.getByRole('button', { name: /icon button/i });
    expect(button).toHaveClass('h-9');
    expect(button).toHaveClass('w-9');
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
    
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:pointer-events-none');
    expect(button).toHaveClass('disabled:opacity-50');
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render as child component when asChild prop is true', () => {
    render(
      <Button asChild>
        <a href="https://example.com">Link Button</a>
      </Button>
    );
    
    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass('bg-primary');
    expect(link).toHaveClass('text-primary-foreground');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    
    const button = screen.getByRole('button', { name: /custom button/i });
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('bg-primary'); // should still have default classes
  });

  it('should render with destructive variant', () => {
    render(<Button variant="destructive">Destructive Button</Button>);
    
    const button = screen.getByRole('button', { name: /destructive button/i });
    expect(button).toHaveClass('bg-destructive');
    expect(button).toHaveClass('text-destructive-foreground');
    expect(button).toHaveClass('shadow-sm');
    expect(button).toHaveClass('hover:bg-destructive/90');
  });

  it('should render with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    
    const button = screen.getByRole('button', { name: /secondary button/i });
    expect(button).toHaveClass('bg-secondary');
    expect(button).toHaveClass('text-secondary-foreground');
    expect(button).toHaveClass('shadow-sm');
    expect(button).toHaveClass('hover:bg-secondary/80');
  });

  it('should render with ghost variant', () => {
    render(<Button variant="ghost">Ghost Button</Button>);
    
    const button = screen.getByRole('button', { name: /ghost button/i });
    expect(button).toHaveClass('hover:bg-accent');
    expect(button).toHaveClass('hover:text-accent-foreground');
  });

  it('should render with link variant', () => {
    render(<Button variant="link">Link Button</Button>);
    
    const button = screen.getByRole('button', { name: /link button/i });
    expect(button).toHaveClass('text-primary');
    expect(button).toHaveClass('underline-offset-4');
    expect(button).toHaveClass('hover:underline');
  });

  it('should support ref forwarding', () => {
    const ref = vi.fn();
    const { container } = render(<Button ref={ref}>Ref Button</Button>);
    
    expect(ref).toHaveBeenCalledWith(container.firstChild);
  });

  it('should render different button types', () => {
    const { rerender } = render(<Button type="submit">Submit</Button>);
    
    let button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveAttribute('type', 'submit');
    
    rerender(<Button type="reset">Reset</Button>);
    button = screen.getByRole('button', { name: /reset/i });
    expect(button).toHaveAttribute('type', 'reset');
    
    rerender(<Button type="button">Button</Button>);
    button = screen.getByRole('button', { name: /button/i });
    expect(button).toHaveAttribute('type', 'button');
  });
});