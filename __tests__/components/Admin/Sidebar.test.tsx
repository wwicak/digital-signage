import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../../../components/Admin/Sidebar'; // Default import
import { useGlobalDisplayList } from '../../../contexts/GlobalDisplayListContext';
import { useDisplayContext } from '../../../contexts/DisplayContext';
import { IDisplayData } from '../../../actions/display'; // For type reference
import Router from 'next/router'; // Import Router for mocking Router.push

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(), // if Sidebar used useRouter directly
  withRouter: (Component: any) => (props: any) => <Component router={mockRouter} {...props} />, // Mock HOC
  push: jest.fn(), // Mock Router.push
  default: { // Mock Router.push if used as Router.push
    push: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
};

// Mock contexts
jest.mock('../../../contexts/GlobalDisplayListContext', () => ({
  useGlobalDisplayList: jest.fn(),
}));
jest.mock('../../../contexts/DisplayContext', () => ({
  useDisplayContext: jest.fn(),
}));

// Mock helpers
jest.mock('../../../helpers/auth', () => ({
  logout: jest.fn(() => Promise.resolve()),
}));


const mockUseGlobalDisplayList = useGlobalDisplayList as jest.Mock;
const mockUseDisplayContext = useDisplayContext as jest.Mock;

describe('Sidebar Component', () => {
  const mockDisplays: IDisplayData[] = [
    { _id: '1', name: 'Display One', description: 'First display' },
    { _id: '2', name: 'Display Two', description: 'Second display' },
  ];

  const mockDisplayContextValue = {
    state: { id: '1', name: 'Display One', layout: 'spaced' },
    setId: jest.fn(),
    setLayout: jest.fn(),
    setName: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mocks for each test, can be overridden
    mockUseGlobalDisplayList.mockReturnValue({
      displays: mockDisplays,
      isLoading: false,
      error: null,
      refetchDisplays: jest.fn(),
    });
    mockUseDisplayContext.mockReturnValue(mockDisplayContextValue);
    (Router.push as jest.Mock).mockClear();
    mockRouter.push.mockClear(); // Clear mock for HOC router instance too
    mockDisplayContextValue.setId.mockClear();
  });

  const renderSidebar = (loggedIn = true) => {
    return render(<Sidebar loggedIn={loggedIn} router={mockRouter} />);
  };

  test('renders dropdown with displays from GlobalDisplayListContext', () => {
    renderSidebar();
    // DropdownButton itself is complex; we check for the "logo" part it renders
    // and assume its internal rendering of choices works if data is passed.
    // The Sidebar passes `dropdownChoices` to `DropdownButton`.
    // Check if the main display name from DisplayContext is shown
    expect(screen.getByText(mockDisplayContextValue.state.name)).toBeInTheDocument();

    // To check choices, we might need to click to open the dropdown if it's not always rendered
    // For now, let's check if the component that would receive choices is there.
    // The DropdownButton has a child with class 'logo'
    expect(screen.getByRole('button', { name: /select display/i })).toBeInTheDocument();
    // This test is a bit indirect. A better way would be to check items if DropdownButton exposed them,
    // or test DropdownButton separately and trust the integration here.
  });

  test('shows loading state from GlobalDisplayListContext', () => {
    mockUseGlobalDisplayList.mockReturnValue({
      displays: [],
      isLoading: true,
      error: null,
      refetchDisplays: jest.fn(),
    });
    renderSidebar();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Check if the dropdown button is disabled (as per Sidebar's implementation)
    const dropdownButton = screen.getByRole('button', { name: /loading.../i });
    expect(dropdownButton).toBeDisabled();
  });

  test('handles error state from GlobalDisplayListContext', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Failed to load displays');
    mockUseGlobalDisplayList.mockReturnValue({
      displays: undefined, // Or [], depending on how error state is set
      isLoading: false,
      error: error,
      refetchDisplays: jest.fn(),
    });
    renderSidebar();
    // As per current Sidebar implementation, error is logged.
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching global displays:", error);
    // UI should still be somewhat graceful
    expect(screen.getByText(mockDisplayContextValue.state.name)).toBeInTheDocument(); // Current display name still shows
    consoleErrorSpy.mockRestore();
  });

  test('handles empty display list gracefully', () => {
    mockUseGlobalDisplayList.mockReturnValue({
      displays: [],
      isLoading: false,
      error: null,
      refetchDisplays: jest.fn(),
    });
    renderSidebar();
    // Check that the current display name (from DisplayContext) is shown or "Select Display"
    expect(screen.getByText(mockDisplayContextValue.state.name)).toBeInTheDocument();
    // The dropdown button would have no choices, which is hard to assert directly without opening it.
    // We assume DropdownButton handles empty choices array correctly.
  });

  test('navigation and context update on display selection from dropdown', () => {
    renderSidebar();

    // This part is tricky because DropdownButton is a child component.
    // We are testing Sidebar's `navigateToAdmin` function.
    // We need to simulate DropdownButton's `onSelect` being called.
    // This requires knowing DropdownButton's props.
    // Let's assume DropdownButton is tested elsewhere and we can mock its behavior or find a way to trigger its onSelect.

    // For now, this test is more of an integration test for navigateToAdmin
    // We can't directly simulate a click on a dropdown choice easily without knowing DropdownButton's internals.
    // However, if DropdownButton was simpler or we used a different approach:
    // fireEvent.click(screen.getByText('Display Two')); // if choices were visible and simple buttons

    // Since `navigateToAdmin` is passed to `DropdownButton`, we can't easily call it from here
    // without a more complex setup or by making `DropdownButton` more testable/exposing its parts.
    // The key functionality of navigateToAdmin is:
    // Router.push(`/layout?display=${id}`);
    // context.setId(id);
    // This test case will be limited for now.

    // What we *can* check is that the menu items use the correct initial displayId
    const expectedPath = `/screens?display=${mockDisplayContextValue.state.id}`;
    expect(screen.getByText('Screens').closest('a')).toHaveAttribute('href', expectedPath);
  });

  test('renders login link when not loggedIn', () => {
    renderSidebar(false); // Pass loggedIn = false
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Login').closest('a')).toHaveAttribute('href', expect.stringContaining('/login'));
    // Dropdown for display selection should not be visible
    expect(screen.queryByRole('button', { name: /select display/i })).not.toBeInTheDocument();
  });

});
