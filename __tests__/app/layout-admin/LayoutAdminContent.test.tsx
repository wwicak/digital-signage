import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import LayoutAdminPage from '../../../app/layout-admin/page'; // Render the page which includes Suspense
import * as DisplayContext from '../../../contexts/DisplayContext';
import * as WidgetActions from '../../../actions/widgets';
import DisplayPlaceholder from '../../../components/Placeholders/DisplayPlaceholder';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

// Mock DisplayPlaceholder
jest.mock('../../../components/Placeholders/DisplayPlaceholder', () => {
  return jest.fn(() => <div data-testid="display-placeholder">Loading Display...</div>);
});

// Mock Frame
jest.mock('../../../components/Admin/Frame', () => {
  return jest.fn(({ children }) => <div data-testid="mock-admin-frame">{children}</div>);
});

// Mock EditableWidget
jest.mock('../../../components/Admin/EditableWidget', () => {
  return jest.fn(() => <div data-testid="mock-editable-widget">Editable Widget</div>);
});

// Mock react-grid-layout and WidthProvider
jest.mock('react-grid-layout', () => {
  const MockGridLayout = jest.fn(({ children }) => <div data-testid="mock-grid-layout">{children}</div>);
  return MockGridLayout;
});
jest.mock('../../../components/Widgets/WidthProvider', () => (GridLayoutComponent: any) => GridLayoutComponent);

// Mock actions/widgets
jest.mock('../../../actions/widgets', () => ({
  getWidgets: jest.fn(),
  addWidget: jest.fn(),
  deleteWidget: jest.fn(),
  updateWidget: jest.fn(),
}));

// Mock FontAwesomeIcon
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <div data-testid="mock-fa-icon" />,
}));

// Mock DropdownButton
jest.mock('../../../components/DropdownButton', () => {
  return jest.fn(({ children }) => <div data-testid="mock-dropdown-button">{children}</div>);
});
// Mock Form components
jest.mock('../../../components/Form', () => ({
  Form: jest.fn(({ children }) => <form data-testid="mock-form">{children}</form>),
  Switch: jest.fn(() => <div data-testid="mock-switch">Switch</div>),
}));


describe('LayoutAdminPage / LayoutAdminContent', () => {
  let mockUseDisplayContext: jest.SpyInstance;
  let mockUseSearchParams: jest.Mock;

  beforeEach(() => {
    mockUseDisplayContext = jest.spyOn(DisplayContext, 'useDisplayContext');
    mockUseSearchParams = useSearchParams as jest.Mock;

    // Reset mocks
    (DisplayPlaceholder as jest.Mock).mockClear();
    (WidgetActions.getWidgets as jest.Mock).mockClear();

    // Default searchParams
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    mockUseDisplayContext.mockRestore();
    jest.clearAllMocks();
  });

  const mockDisplayContextValue = (isLoading = false, stateId = 'display1', error = null) => ({
    state: {
      id: stateId,
      name: 'Test Display',
      layout: 'compact',
      statusBar: { elements: [] },
      widgets: stateId ? [{ _id: 'w1', type: 'type1', x:0, y:0, w:1, h:1, data:{}, name:'w1' }] : [], // from context
    },
    setId: jest.fn(),
    updateName: jest.fn(),
    updateLayout: jest.fn(),
    addStatusBarItem: jest.fn(),
    removeStatusBarItem: jest.fn(),
    reorderStatusBarItems: jest.fn(),
    refreshDisplayData: jest.fn(),
    isLoading: isLoading,
    error: error,
  });

  it('renders DisplayPlaceholder when context.isLoading is true', async () => {
    mockUseDisplayContext.mockReturnValue(mockDisplayContextValue(true)); // context is loading
    (WidgetActions.getWidgets as jest.Mock).mockResolvedValue([]); // widgets fetch is fast for this test

    render(<LayoutAdminPage />);

    await waitFor(() => {
        expect(screen.getByTestId('display-placeholder')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('mock-grid-layout')).not.toBeInTheDocument();
  });

  it('renders DisplayPlaceholder when isRefreshingWidgets is true (getWidgets is pending)', async () => {
    mockUseDisplayContext.mockReturnValue(mockDisplayContextValue(false)); // context not loading
    (WidgetActions.getWidgets as jest.Mock).mockImplementation(() => new Promise(() => {})); // getWidgets is pending

    render(<LayoutAdminPage />);

    await waitFor(() => {
        expect(screen.getByTestId('display-placeholder')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('mock-grid-layout')).not.toBeInTheDocument();
  });

  it('renders widget grid when context is not loading and getWidgets resolves', async () => {
    const mockWidgetsData = [{ _id: 'widget1', type: 'someWidget', x: 0, y: 0, w: 1, h: 1, data: {} }];
    mockUseDisplayContext.mockReturnValue(mockDisplayContextValue(false)); // context not loading
    (WidgetActions.getWidgets as jest.Mock).mockResolvedValue(mockWidgetsData);

    render(<LayoutAdminPage />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-grid-layout')).toBeInTheDocument();
    });
    expect(screen.getByTestId('mock-editable-widget')).toBeInTheDocument(); // Assuming one widget
    expect(screen.queryByTestId('display-placeholder')).not.toBeInTheDocument();
  });

  it('calls context.setId and refreshWidgets on initial load with displayId from URL', async () => {
    const mockSetId = jest.fn();
    mockUseDisplayContext.mockReturnValue({ ...mockDisplayContextValue(true, null), setId: mockSetId });
    mockUseSearchParams.mockReturnValue(new URLSearchParams("display=urlDisplayId"));
    (WidgetActions.getWidgets as jest.Mock).mockResolvedValue([]);

    render(<LayoutAdminPage />);

    await waitFor(() => {
        expect(mockSetId).toHaveBeenCalledWith('urlDisplayId');
    });
    await waitFor(() => {
        expect(WidgetActions.getWidgets).toHaveBeenCalledWith('urlDisplayId');
    });
  });

  it('handles initial load when no displayId in URL and no context.state.id', async () => {
    const mockSetId = jest.fn();
    // Simulate context initially having no ID and not loading
    mockUseDisplayContext.mockReturnValue({
        state: { id: null, name: null, layout: null, statusBar: {}, widgets: [] },
        setId: mockSetId,
        isLoading: false, // Important: context itself is not in a loading state
        refreshDisplayData: jest.fn(),
        updateName: jest.fn(),
        updateLayout: jest.fn(),
        addStatusBarItem: jest.fn(),
        removeStatusBarItem: jest.fn(),
        reorderStatusBarItems: jest.fn(),
        error: null,
    });
    mockUseSearchParams.mockReturnValue(new URLSearchParams()); // No display in URL
    (WidgetActions.getWidgets as jest.Mock).mockResolvedValue([]);


    render(<LayoutAdminPage />);

    // In this setup, `useEffect` in LayoutAdminContent might try to use a 'default-display-id'
    // or simply not call refreshWidgets if it determines the ID is invalid.
    // The important part is that it should show placeholders due to isRefreshingWidgets=true initially
    // or because context.setId might be called which can can trigger context.isLoading

    // Default behavior in LayoutAdminContent useEffect is to use context.state.id if no URL param.
    // If context.state.id is also null, it falls back to 'default-display-id' for setId.
    await waitFor(() => {
        // In the provided code, if id is null and displayIdFromUrl is also null,
        // it will call context.setId(id) which is context.setId(null), then refreshWidgets(null).
        // This was later changed in the actual component to use 'default-display-id'.
        // The test reflects the logic where if context.state.id is null, and no URL param,
        // it effectively tries to load 'null' or 'default-display-id' based on component's version.
        // The component's current useEffect logic:
        // const id = displayIdFromUrl || context.state.id;
        // if (id && id !== 'default-display-id') { context.setId(id); refreshWidgets(id); }
        // else if (!displayIdFromUrl && !context.state.id) { setWidgets([]); setIsRefreshingWidgets(false); /* No context.setId or refreshWidgets here */ }
        // This test case will hit the else if.
        expect(mockSetId).not.toHaveBeenCalled(); // Because id would be null initially
        expect(WidgetActions.getWidgets).not.toHaveBeenCalled(); // Because id is initially null
    });
    // Since setIsRefreshingWidgets(false) is called in this path, placeholder should not be there long.
    // However, the initial state of isRefreshingWidgets is true, so it might appear briefly.
    // Let's check that it doesn't show grid if nothing is loaded.
    await screen.findByTestId('mock-admin-frame'); // Wait for frame to show up (means not stuck on Suspense)
    expect(screen.queryByTestId('mock-grid-layout')).not.toBeInTheDocument();
    // It might show placeholder due to the initial true state of isRefreshingWidgets
    // OR due to context.isLoading if setId(null) makes context load.
    // Given the component's logic, if no id, it sets isRefreshingWidgets to false and doesn't load.
    // So, no placeholder if context itself is not loading.
    if (!mockUseDisplayContext().isLoading) { // if context itself is not loading
        expect(screen.queryByTestId('display-placeholder')).not.toBeInTheDocument();
    }
  });

})
