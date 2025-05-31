import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DisplayPage from './page'; // Component to test

// Mock the DisplayComponent
jest.mock('../../../components/Display/Display', () => {
  // Using jest.fn() for the component mock allows us to inspect props
  const MockDisplayComponent = jest.fn((props: { display: string }) => (
    <div data-testid="mock-display-component" data-displayid={props.display}>
      Mock Display for ID: {props.display}
    </div>
  ));
  // If the original component has a displayName or other static properties,
  // you might want to replicate them here if your tests depend on them.
  // MockDisplayComponent.displayName = 'DisplayComponent';
  return {
    __esModule: true, // If DisplayComponent is an ES module
    default: MockDisplayComponent,
  };
});

describe('DisplayPage - app/display/[id]/page.tsx', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    (jest.requireMock('../../../components/Display/Display').default as jest.Mock).mockClear();
  });

  test('renders DisplayComponent and passes the displayId from params', () => {
    const testDisplayId = 'test-display-123';
    render(<DisplayPage params={{ id: testDisplayId }} />);

    // Check if the mock DisplayComponent was rendered
    const mockDisplayElement = screen.getByTestId('mock-display-component');
    expect(mockDisplayElement).toBeInTheDocument();

    // Check if the mock DisplayComponent received the correct displayId prop
    expect(mockDisplayElement).toHaveAttribute('data-displayid', testDisplayId);
    expect(screen.getByText(`Mock Display for ID: ${testDisplayId}`)).toBeInTheDocument();

    // Also, explicitly check the props of the last call to the mock
    const MockDisplayComponent = jest.requireMock('../../../components/Display/Display').default;
    expect(MockDisplayComponent).toHaveBeenCalledTimes(1);
    expect(MockDisplayComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        display: testDisplayId,
      }),
      {} // Second argument to function components is ref, usually empty object for mock checks
    );
  });

  test('renders fallback message if displayId is an empty string (edge case)', () => {
    // This tests the explicit check `displayId ? ... : ...` in the component.
    // In a real Next.js scenario, an empty string might still be routed if the folder structure allows it,
    // but the component has a fallback.
    render(<DisplayPage params={{ id: '' }} />);

    expect(screen.getByText('Loading display information or Display ID not provided...')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-display-component')).not.toBeInTheDocument();
  });

  // Note: Next.js App Router typically handles missing 'id' by not matching the route,
  // leading to a 404 page from Next.js itself, rather than this component rendering with undefined id.
  // So, testing params={{ id: undefined }} might not reflect a real-world scenario for this page component,
  // as TypeScript also expects `id: string`. The empty string test above covers the component's explicit fallback.
});
