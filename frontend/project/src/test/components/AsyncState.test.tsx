import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import { LoadingState, ErrorState, EmptyState, withAsyncState } from '@/components/AsyncState';

// Mock component for testing
const TestComponent = () => <div data-testid="test-content">Test Content</div>;

describe('AsyncState Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LoadingState', () => {
    it('should render default loading state', () => {
      render(<LoadingState />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render with custom text', () => {
      render(<LoadingState text="Custom loading text" />);
      
      expect(screen.getByText('Custom loading text')).toBeInTheDocument();
    });

    it('should render with custom size', () => {
      render(<LoadingState size="lg" />);
      
      const loader = screen.getByTestId('loading-spinner');
      expect(loader).toHaveClass('w-8 h-8');
    });

    it('should render skeleton variant', () => {
      render(<LoadingState variant="skeleton" />);
      
      expect(screen.getByTestId('skeleton-loading')).toBeInTheDocument();
    });

    it('should render pulse variant', () => {
      render(<LoadingState variant="pulse" />);
      
      expect(screen.getByTestId('pulse-loading')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<LoadingState className="custom-class" />);
      
      const container = screen.getByTestId('loading-container');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('ErrorState', () => {
    it('should render default error state', () => {
      render(<ErrorState />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });

    it('should render with custom title and message', () => {
      render(
        <ErrorState 
          title="Custom Error" 
          message="Custom error message" 
        />
      );
      
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should render with error object', () => {
      const error = new Error('Test error message');
      render(<ErrorState error={error} />);
      
      // ErrorState shows default message when error object is provided
      // Error details are only shown in development mode with showDetails=true
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });

    it('should show retry button when onRetry is provided', () => {
      const onRetry = vi.fn();
      render(<ErrorState onRetry={onRetry} />);
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
      
      retryButton.click();
      expect(onRetry).toHaveBeenCalled();
    });

    it('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      render(<ErrorState error={error} showDetails={true} />);
      
      expect(screen.getByText(/error details/i)).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should apply custom className', () => {
      render(<ErrorState className="custom-class" />);
      
      const container = screen.getByTestId('error-container');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('EmptyState', () => {
    it('should render default empty state', () => {
      render(<EmptyState />);
      
      expect(screen.getByText('No data found')).toBeInTheDocument();
      expect(screen.getByText('There is nothing to display here')).toBeInTheDocument();
    });

    it('should render with custom title and message', () => {
      render(
        <EmptyState 
          title="Custom Empty" 
          message="Custom empty message" 
        />
      );
      
      expect(screen.getByText('Custom Empty')).toBeInTheDocument();
      expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    });

    it('should render with custom icon', () => {
      const customIcon = <div data-testid="custom-icon">Icon</div>;
      render(<EmptyState icon={customIcon} />);
      
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should render action button when provided', () => {
      const onAction = vi.fn();
      render(
        <EmptyState 
          action={{
            label: 'Custom Action',
            onClick: onAction
          }}
        />
      );
      
      const actionButton = screen.getByRole('button', { name: /custom action/i });
      expect(actionButton).toBeInTheDocument();
      
      actionButton.click();
      expect(onAction).toHaveBeenCalled();
    });

    it('should apply custom className', () => {
      render(<EmptyState className="custom-class" />);
      
      const container = screen.getByTestId('empty-container');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('withAsyncState HOC', () => {
    it('should show loading state when isLoading is true', () => {
      const TestComponentWithState = withAsyncState(TestComponent, {
        isLoading: () => true,
        LoadingComponent: () => <div data-testid="loading">Loading</div>
      });
      
      render(<TestComponentWithState />);
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });

    it('should show error state when error is present', () => {
      const TestComponentWithState = withAsyncState(TestComponent, {
        error: () => new Error('Test error'),
        ErrorComponent: () => <div data-testid="error">Error</div>
      });
      
      render(<TestComponentWithState />);
      
      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });

    it('should show empty state when isEmpty is true', () => {
      const TestComponentWithState = withAsyncState(TestComponent, {
        isEmpty: () => true,
        EmptyComponent: () => <div data-testid="empty">Empty</div>
      });
      
      render(<TestComponentWithState />);
      
      expect(screen.getByTestId('empty')).toBeInTheDocument();
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });

    it('should render component when no special states', () => {
      const TestComponentWithState = withAsyncState(TestComponent, {
        isLoading: () => false,
        error: () => null,
        isEmpty: () => false
      });
      
      render(<TestComponentWithState />);
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should prioritize error over loading and empty', () => {
      const TestComponentWithState = withAsyncState(TestComponent, {
        isLoading: () => true,
        error: () => new Error('Test error'),
        isEmpty: () => true,
        ErrorComponent: () => <div data-testid="error">Error</div>
      });
      
      render(<TestComponentWithState />);
      
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });

    it('should prioritize loading over empty', () => {
      const TestComponentWithState = withAsyncState(TestComponent, {
        isLoading: () => true,
        error: () => null,
        isEmpty: () => true,
        LoadingComponent: () => <div data-testid="loading">Loading</div>
      });
      
      render(<TestComponentWithState />);
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });
  });
});
