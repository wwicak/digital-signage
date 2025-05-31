import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import ScreenCard, { IScreenCardProps } from '../../../components/Admin/ScreenCard'; // Adjust path as necessary
import { IDisplayData } from '../../../actions/display'; // For mock data structure

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

// Mock FontAwesomeIcon
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: (props: any) => <i data-testid="mock-icon" className={`fa ${props.icon && props.icon.iconName ? props.icon.iconName : 'default-icon'}`}></i>,
}));

// Mock actions/display
jest.mock('../../../actions/display', () => {
  const originalModule = jest.requireActual('../../../actions/display');
  const mockedModule: { [key: string]: any } = { __esModule: true };

  // Manually copy properties from the original module
  for (const key in originalModule) {
    if (Object.prototype.hasOwnProperty.call(originalModule, key)) {
      mockedModule[key] = originalModule[key];
    }
  }

  // Override the specific function we want to mock
  mockedModule.deleteDisplay = jest.fn().mockResolvedValue({});

  return mockedModule;
});

const baseMockDisplay: IDisplayData = {
  _id: 'test-display-id-123',
  name: 'Test Display Name',
  description: 'A test display description',
  widgets: [
    { _id: 'widget1', name: 'Widget 1', type: 'text', x: 0, y: 0, w: 1, h: 1, data: {} },
    { _id: 'widget2', name: 'Widget 2', type: 'image', x: 1, y: 0, w: 1, h: 1, data: {} },
  ],
  creator_id: 'user-id-123',
  creation_date: new Date().toISOString(),
  last_update: new Date().toISOString(),
  layout: 'spaced',
};

describe('ScreenCard Component', () => {
  const renderScreenCard = (props: Partial<IScreenCardProps['value']>) => {
    const fullProps: IScreenCardProps = {
      value: { ...baseMockDisplay, ...props } as any, // Type assertion as base might not fully match schema always
      refresh: jest.fn(),
    };
    // Validate props with Zod schema before rendering if desired (optional, good practice)
    // ScreenCardPropsSchema.parse(fullProps);
    return render(<ScreenCard {...fullProps} />);
  };

  test('Scenario 1: Online status and multiple clients', () => {
    renderScreenCard({ onlineStatus: true, clientCount: 3 });
    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByText('3 clients paired')).toBeInTheDocument();
    // Find the status div, its class could be 'online' or 'offline'
    // The text 'online' or 'offline' is inside a span, which is inside the status div
    const statusDiv = screen.getByText('online').parentElement;
    expect(statusDiv).toHaveClass('online');
    expect(statusDiv).not.toHaveClass('offline');
  });

  test('Scenario 2: Offline status and single client', () => {
    renderScreenCard({ onlineStatus: false, clientCount: 1 });
    expect(screen.getByText('offline')).toBeInTheDocument();
    expect(screen.getByText('1 client paired')).toBeInTheDocument();
    const statusDiv = screen.getByText('offline').parentElement;
    expect(statusDiv).toHaveClass('offline');
    expect(statusDiv).not.toHaveClass('online');
  });

  test('Scenario 3: Offline status and zero clients', () => {
    renderScreenCard({ onlineStatus: false, clientCount: 0 });
    expect(screen.getByText('offline')).toBeInTheDocument();
    expect(screen.getByText('0 clients paired')).toBeInTheDocument();
    const statusDiv = screen.getByText('offline').parentElement;
    expect(statusDiv).toHaveClass('offline');
  });

  test('Scenario 4: Undefined clientCount (should default to 0)', () => {
    renderScreenCard({ onlineStatus: false, clientCount: undefined });
    // The component uses `{value.clientCount || 0} clients paired`
    // So, `undefined || 0` results in `0`.
    expect(screen.getByText('0 clients paired')).toBeInTheDocument();
    expect(screen.getByText('offline')).toBeInTheDocument(); // Assuming onlineStatus is false
  });

  test('Scenario 5: Undefined onlineStatus (should default to offline)', () => {
    renderScreenCard({ onlineStatus: undefined, clientCount: 2 });
    // The component uses `value.onlineStatus ? 'online' : 'offline'` for text and class
    // So, `undefined ? 'online' : 'offline'` results in 'offline'.
    expect(screen.getByText('offline')).toBeInTheDocument();
    expect(screen.getByText('2 clients paired')).toBeInTheDocument();
    const statusDiv = screen.getByText('offline').parentElement;
    expect(statusDiv).toHaveClass('offline');
  });

  test('Scenario 6: Ensure other information (name, widget count) still renders', () => {
    const props = {
      ...baseMockDisplay,
      name: 'Specific Test Display',
      widgets: [{}, {}, {}, {}], // 4 widgets
      onlineStatus: true,
      clientCount: 2,
    };
    renderScreenCard(props);

    expect(screen.getByText('Specific Test Display')).toBeInTheDocument();
    // The component calculates widgetCount as `Array.isArray(value.widgets) ? value.widgets.length : 0;`
    // And displays it as `{widgetCount} widgets`
    expect(screen.getByText('4 widgets')).toBeInTheDocument();
    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByText('2 clients paired')).toBeInTheDocument();
  });

  test('Fallback for value.name: Untitled Display', () => {
    renderScreenCard({ name: undefined });
    expect(screen.getByText('Untitled Display')).toBeInTheDocument();
  });

  test('Fallback for value.widgets: 0 widgets', () => {
    renderScreenCard({ widgets: undefined });
    expect(screen.getByText('0 widgets')).toBeInTheDocument();
  });

  // Test delete functionality (basic mock check)
  test('Delete button calls deleteDisplay and refresh', async () => {
    const mockRefresh = jest.fn();
    const deleteDisplayMock = require('../../../actions/display').deleteDisplay;
    const displayId = 'display-to-delete';

    render(<ScreenCard value={{ ...baseMockDisplay, _id: displayId } as any} refresh={mockRefresh} />);

    // Find the delete icon/button. The icon is inside a div with class 'actionIcon'
    // We need a more specific way to target it, e.g., aria-label
    const deleteButton = screen.getByLabelText('Delete Display');

    // Simulate user click
    fireEvent.click(deleteButton);

    // Check if deleteDisplay was called
    expect(deleteDisplayMock).toHaveBeenCalledWith(displayId);

    // Check if refresh was called (deleteDisplay is async)
    // We need to wait for the promise to resolve
    await screen.findByText('Test Display Name'); // ensure component is still there or use waitFor
    expect(mockRefresh).toHaveBeenCalled();
  });
});

// Minimal setup for Jest and @testing-library/react to work
// Ensure you have jest.config.js and potentially a setupTests.ts file
// For example, a setupTests.ts might include:
// import '@testing-library/jest-dom';
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// You can use it to write tests like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
// For this environment, we assume @testing-library/jest-dom is available.
// If not, some assertions like .toBeInTheDocument() might need adjustment or setup.
// For the purpose of this task, we'll write it as if it's set up.
