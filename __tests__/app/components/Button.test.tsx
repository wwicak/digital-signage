import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button, { IButtonProps } from './Button';

// Mock the ButtonWithLoading component
// The factory function for jest.mock now defines the mock implementation.
jest.mock('../ui/button-with-loading', () => {
  const actualMockFn = jest.fn(
    ({ children, onClick, disabled, isLoading, variant, size, style, className, ...rest }) => {
      // Filter out custom props not meant for DOM button
      const { parentDisabled, parentIsLoading, ...validRest } = rest as any;
      return (
        <button
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          data-variant={variant}
          data-size={size}
          style={style}
          className={className}
          data-testid="mock-button-with-loading"
          {...validRest}
        >
          {isLoading ? 'Loading...' : children}
        </button>
      );
    }
  );
  return { ButtonWithLoading: actualMockFn };
});

describe('Button Component', () => {
  const mockOnClick = jest.fn();
  const mockAsyncOnClick = jest.fn((): Promise<void> => Promise.resolve());

  let MockedButtonWithLoading: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Dynamically require the mock inside beforeEach to get the fresh mock function for each test
    // This ensures MockedButtonWithLoading is the jest.fn instance from the mock factory
    MockedButtonWithLoading = require('../ui/button-with-loading').ButtonWithLoading;
  });

  test('renders with default text', () => {
    render(<Button />);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  test('renders as disabled and does not call onClick when disabled prop is true', async () => {
    render(<Button text="Disabled By Parent" disabled={true} onClick={mockOnClick} />);
    const buttonElement = screen.getByTestId('mock-button-with-loading');

    await waitFor(() => {
      // Check the props passed to the LAST call of the mock
      expect(MockedButtonWithLoading).toHaveBeenCalled();
      const lastCallArgs = MockedButtonWithLoading.mock.calls[MockedButtonWithLoading.mock.calls.length - 1][0];
      expect(lastCallArgs.disabled).toBe(true);
      expect(lastCallArgs.isLoading).toBe(false);
    });

    expect(buttonElement).toBeDisabled();

    fireEvent.click(buttonElement);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  test('renders as loading and disabled when isLoading prop is true', async () => {
    render(<Button text="Parent Is Loading" isLoading={true} onClick={mockOnClick} />);
    const buttonElement = screen.getByTestId('mock-button-with-loading');

    await waitFor(() => {
      expect(MockedButtonWithLoading).toHaveBeenCalled();
      const lastCallArgs = MockedButtonWithLoading.mock.calls[MockedButtonWithLoading.mock.calls.length - 1][0];
      expect(lastCallArgs.isLoading).toBe(true);
      expect(lastCallArgs.disabled).toBe(true);
    });

    await waitFor(() => expect(buttonElement.textContent).toBe('Loading...'));
    expect(buttonElement).toBeDisabled();

    fireEvent.click(buttonElement);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  test('handles async onClick and shows internal loading state, then resets', async () => {
    const delayedAsyncOnClick = jest.fn(() => new Promise(resolve => setTimeout(resolve, 30)));
    render(<Button onClick={delayedAsyncOnClick} text="Internal Loading Test" />);
    const buttonElement = screen.getByTestId('mock-button-with-loading');

    expect(buttonElement.textContent).toBe('Internal Loading Test');
    expect(buttonElement).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(buttonElement);
    });

    await waitFor(() => {
        const lastCallArgs = MockedButtonWithLoading.mock.calls[MockedButtonWithLoading.mock.calls.length - 1][0];
        expect(lastCallArgs.isLoading).toBe(true);
        expect(buttonElement.textContent).toBe('Loading...');
    });
    expect(buttonElement).toBeDisabled();

    await act(async () => {
      await delayedAsyncOnClick.mock.results[0].value;
    });

    await waitFor(() => {
        const lastCallArgsAfterAsync = MockedButtonWithLoading.mock.calls[MockedButtonWithLoading.mock.calls.length - 1][0];
        expect(lastCallArgsAfterAsync.isLoading).toBe(false);
        expect(buttonElement.textContent).toBe('Internal Loading Test');
    });
    expect(buttonElement).not.toBeDisabled();
    expect(delayedAsyncOnClick).toHaveBeenCalledTimes(1);
  });

  test('isLoading prop (false) overrides internal loading state', async () => {
    render(<Button onClick={mockAsyncOnClick} isLoading={false} text="Parent No Load" />);
    const buttonElement = screen.getByTestId('mock-button-with-loading');

    await act(async () => {
      fireEvent.click(buttonElement);
    });

    expect(mockAsyncOnClick).toHaveBeenCalledTimes(1);

    const lastCallArgs = MockedButtonWithLoading.mock.calls[MockedButtonWithLoading.mock.calls.length - 1][0];
    expect(lastCallArgs.isLoading).toBe(false);
    expect(lastCallArgs.disabled).toBe(false);

    expect(buttonElement.textContent).toBe('Parent No Load');
    expect(buttonElement).not.toBeDisabled();
  });

  // Standard tests
  test('renders with provided text', () => {
    render(<Button text="Click Me" />);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  test('renders with children content', () => {
    render(<Button><span>Child Content</span></Button>);
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  test('handles onClick event (sync)', async () => {
    const syncOnClick = jest.fn();
    render(<Button onClick={syncOnClick} text="Clickable Sync" />);
    const buttonElement = screen.getByTestId('mock-button-with-loading');
    await act(async () => {
      fireEvent.click(buttonElement);
    });
    expect(syncOnClick).toHaveBeenCalledTimes(1);
  });

  test('applies legacy color prop as style', () => {
    render(<Button color="rgb(255, 0, 0)" text="Colored" />);
    expect(screen.getByTestId('mock-button-with-loading')).toHaveStyle('background-color: rgb(255, 0, 0)');
  });

  test('applies custom style prop', () => {
    render(<Button style={{ border: '1px solid blue' }} text="Styled" />);
    expect(screen.getByTestId('mock-button-with-loading')).toHaveStyle('border: 1px solid blue');
  });

  test('applies variant and size props', () => {
    render(<Button variant="destructive" size="lg" text="Destructive LG" />);
    expect(screen.getByTestId('mock-button-with-loading')).toHaveAttribute('data-variant', 'destructive');
    expect(screen.getByTestId('mock-button-with-loading')).toHaveAttribute('data-size', 'lg');
  });

  test('applies className prop', () => {
    render(<Button className="custom-class" text="Classy Button" />);
    expect(screen.getByTestId('mock-button-with-loading')).toHaveClass('custom-class');
  });

  test('passes through other standard button attributes', () => {
    render(<Button type="button" aria-label="Custom Label" text="Accessible Button" />);
    expect(screen.getByTestId('mock-button-with-loading')).toHaveAttribute('type', 'button');
    expect(screen.getByTestId('mock-button-with-loading')).toHaveAttribute('aria-label', 'Custom Label');
  });
});
