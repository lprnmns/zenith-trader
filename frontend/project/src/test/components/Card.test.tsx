import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card with default props', () => {
      render(<Card>Card Content</Card>);
      
      const card = screen.getByText('Card Content');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('text-card-foreground');
      expect(card).toHaveClass('shadow');
    });

    it('should apply custom className', () => {
      render(<Card className="custom-class">Card Content</Card>);
      
      const card = screen.getByText('Card Content');
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('rounded-xl'); // should still have default classes
    });

    it('should support ref forwarding', () => {
      const ref = vi.fn();
      const { container } = render(<Card ref={ref}>Card Content</Card>);
      
      expect(ref).toHaveBeenCalledWith(container.firstChild);
    });

    it('should render with additional props', () => {
      render(<Card data-testid="test-card" aria-label="Test Card">Card Content</Card>);
      
      const card = screen.getByTestId('test-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-label', 'Test Card');
    });
  });

  describe('CardHeader', () => {
    it('should render card header with default props', () => {
      render(<CardHeader>Header Content</CardHeader>);
      
      const header = screen.getByText('Header Content');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('flex-col');
      expect(header).toHaveClass('space-y-1.5');
      expect(header).toHaveClass('p-6');
    });

    it('should apply custom className', () => {
      render(<CardHeader className="custom-class">Header Content</CardHeader>);
      
      const header = screen.getByText('Header Content');
      expect(header).toHaveClass('custom-class');
      expect(header).toHaveClass('p-6'); // should still have default classes
    });

    it('should support ref forwarding', () => {
      const ref = vi.fn();
      const { container } = render(<CardHeader ref={ref}>Header Content</CardHeader>);
      
      expect(ref).toHaveBeenCalledWith(container.firstChild);
    });
  });

  describe('CardTitle', () => {
    it('should render card title with default props', () => {
      render(<CardTitle>Card Title</CardTitle>);
      
      const title = screen.getByText('Card Title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('leading-none');
      expect(title).toHaveClass('tracking-tight');
      expect(title.tagName).toBe('H3');
    });

    it('should apply custom className', () => {
      render(<CardTitle className="custom-class">Card Title</CardTitle>);
      
      const title = screen.getByText('Card Title');
      expect(title).toHaveClass('custom-class');
      expect(title).toHaveClass('font-semibold'); // should still have default classes
    });

    it('should support ref forwarding', () => {
      const ref = vi.fn();
      const { container } = render(<CardTitle ref={ref}>Card Title</CardTitle>);
      
      expect(ref).toHaveBeenCalledWith(container.firstChild);
    });

    it('should render as h3 by default', () => {
      render(<CardTitle>Card Title</CardTitle>);
      
      const title = screen.getByText('Card Title');
      expect(title.tagName).toBe('H3');
    });
  });

  describe('CardDescription', () => {
    it('should render card description with default props', () => {
      render(<CardDescription>Card Description</CardDescription>);
      
      const description = screen.getByText('Card Description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-sm');
      expect(description).toHaveClass('text-muted-foreground');
      expect(description.tagName).toBe('P');
    });

    it('should apply custom className', () => {
      render(<CardDescription className="custom-class">Card Description</CardDescription>);
      
      const description = screen.getByText('Card Description');
      expect(description).toHaveClass('custom-class');
      expect(description).toHaveClass('text-sm'); // should still have default classes
    });

    it('should support ref forwarding', () => {
      const ref = vi.fn();
      const { container } = render(<CardDescription ref={ref}>Card Description</CardDescription>);
      
      expect(ref).toHaveBeenCalledWith(container.firstChild);
    });
  });

  describe('CardContent', () => {
    it('should render card content with default props', () => {
      render(<CardContent>Card Content</CardContent>);
      
      const content = screen.getByText('Card Content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('p-6');
      expect(content).toHaveClass('pt-0');
    });

    it('should apply custom className', () => {
      render(<CardContent className="custom-class">Card Content</CardContent>);
      
      const content = screen.getByText('Card Content');
      expect(content).toHaveClass('custom-class');
      expect(content).toHaveClass('p-6'); // should still have default classes
    });

    it('should support ref forwarding', () => {
      const ref = vi.fn();
      const { container } = render(<CardContent ref={ref}>Card Content</CardContent>);
      
      expect(ref).toHaveBeenCalledWith(container.firstChild);
    });
  });

  describe('CardFooter', () => {
    it('should render card footer with default props', () => {
      render(<CardFooter>Footer Content</CardFooter>);
      
      const footer = screen.getByText('Footer Content');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('items-center');
      expect(footer).toHaveClass('p-6');
      expect(footer).toHaveClass('pt-0');
    });

    it('should apply custom className', () => {
      render(<CardFooter className="custom-class">Footer Content</CardFooter>);
      
      const footer = screen.getByText('Footer Content');
      expect(footer).toHaveClass('custom-class');
      expect(footer).toHaveClass('p-6'); // should still have default classes
    });

    it('should support ref forwarding', () => {
      const ref = vi.fn();
      const { container } = render(<CardFooter ref={ref}>Footer Content</CardFooter>);
      
      expect(ref).toHaveBeenCalledWith(container.firstChild);
    });
  });

  describe('Complete Card Structure', () => {
    it('should render complete card with all components', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      const card = screen.getByTestId('complete-card');
      const title = screen.getByText('Card Title');
      const description = screen.getByText('Card Description');
      const content = screen.getByText('Main content goes here');
      const footer = screen.getByText('Action');

      expect(card).toBeInTheDocument();
      expect(title).toBeInTheDocument();
      expect(description).toBeInTheDocument();
      expect(content).toBeInTheDocument();
      expect(footer).toBeInTheDocument();

      // Check structure
      expect(card).toContainElement(title);
      expect(card).toContainElement(description);
      expect(card).toContainElement(content);
      expect(card).toContainElement(footer);
    });

    it('should handle nested content properly', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Nested Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <span>Nested span</span>
              <p>Nested paragraph</p>
            </div>
          </CardContent>
        </Card>
      );

      const title = screen.getByText('Nested Content');
      const span = screen.getByText('Nested span');
      const paragraph = screen.getByText('Nested paragraph');

      expect(title).toBeInTheDocument();
      expect(span).toBeInTheDocument();
      expect(paragraph).toBeInTheDocument();
    });

    it('should handle multiple cards', () => {
      render(
        <div>
          <Card data-testid="card-1">
            <CardContent>Card 1 Content</CardContent>
          </Card>
          <Card data-testid="card-2">
            <CardContent>Card 2 Content</CardContent>
          </Card>
        </div>
      );

      const card1 = screen.getByTestId('card-1');
      const card2 = screen.getByTestId('card-2');
      const content1 = screen.getByText('Card 1 Content');
      const content2 = screen.getByText('Card 2 Content');

      expect(card1).toBeInTheDocument();
      expect(card2).toBeInTheDocument();
      expect(content1).toBeInTheDocument();
      expect(content2).toBeInTheDocument();
      expect(card1).toContainElement(content1);
      expect(card2).toContainElement(content2);
    });
  });

  describe('Accessibility', () => {
    it('should handle accessibility attributes', () => {
      render(
        <Card role="article" aria-labelledby="card-title" aria-describedby="card-description">
          <CardHeader>
            <CardTitle id="card-title">Accessible Card</CardTitle>
            <CardDescription id="card-description">Card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content</p>
          </CardContent>
        </Card>
      );

      const card = screen.getByRole('article');
      const title = screen.getByText('Accessible Card');
      const description = screen.getByText('Card description');

      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
      expect(card).toHaveAttribute('aria-describedby', 'card-description');
      expect(title).toHaveAttribute('id', 'card-title');
      expect(description).toHaveAttribute('id', 'card-description');
    });
  });
});
