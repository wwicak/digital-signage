import React from 'react';
import { render, screen } from '@testing-library/react';
import Display from '../../../components/Display/Display';
import * as DisplayContext from '../../../contexts/DisplayContext'; // To mock useDisplayContext
import DisplayPlaceholder from '../../../components/Placeholders/DisplayPlaceholder';

// Mock DisplayPlaceholder to check its presence without rendering its internals
jest.mock('../../../components/Placeholders/DisplayPlaceholder', () => {
  return jest.fn(() => <div data-testid="display-placeholder">Loading Display...</div>);
});

// Mock components/Display/Frame
jest.mock('../../../components/Display/Frame', () => {
  return jest.fn(({ children }) => <div data-testid="mock-frame">{children}</div>);
});

// Mock react-grid-layout and its HOC
jest.mock('react-grid-layout', () => {
  const MockGridLayout = jest.fn(({ children }) => <div data-testid="mock-grid-layout">{children}</div>);
  return MockGridLayout;
});
jest.mock('../../../components/Widgets/HeightProvider', () => (GridLayoutComponent: any) => GridLayoutComponent);


// Mock widgets
jest.mock('../../../widgets', () => ({
  testWidget: {
    Widget: () => <div data-testid="mock-widget">Test Widget Content</div>,
    name: 'Test Widget',
    type: 'testWidget',
    icon: 'fa-question-circle',
    defaultData: {},
  }
}));

describe('Display Component', () => {
  let mockUseDisplayContext: jest.SpyInstance;

  beforeEach(() => {
    mockUseDisplayContext = jest.spyOn(DisplayContext, 'useDisplayContext');
    (DisplayPlaceholder as jest.Mock).mockClear();
  });

  afterEach(() => {
    mockUseDisplayContext.mockRestore();
  });

  it('renders DisplayPlaceholder when context isLoading is true', () => {
    mockUseDisplayContext.mockReturnValue({
      state: { id: 'display1', widgets: [], statusBar: { elements: [] } },
      setId: jest.fn(),
      refreshDisplayData: jest.fn(),
      isLoading: true, // Simulate loading
      error: null,
    });

    render(<Display display="display1" />);
    expect(screen.getByTestId('display-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-frame')).not.toBeInTheDocument();
  });

  it('renders DisplayPlaceholder when state.id is null', () => {
    mockUseDisplayContext.mockReturnValue({
      state: { id: null, widgets: [], statusBar: { elements: [] } }, // state.id is null
      setId: jest.fn(),
      refreshDisplayData: jest.fn(),
      isLoading: false,
      error: null,
    });

    render(<Display display="display1" />);
    expect(screen.getByTestId('display-placeholder')).toBeInTheDocument();
  });

  it('renders DisplayPlaceholder when display prop and state.id mismatch and no widgets yet', () => {
    mockUseDisplayContext.mockReturnValue({
      state: { id: 'someOtherDisplay', widgets: [], statusBar: { elements: [] } }, // state.id does not match prop, no widgets
      setId: jest.fn(),
      refreshDisplayData: jest.fn(),
      isLoading: false,
      error: null,
    });

    render(<Display display="display1" />);
    expect(screen.getByTestId('display-placeholder')).toBeInTheDocument();
  });

  it('renders actual display content (Frame and Grid) when not loading and data is available', () => {
    mockUseDisplayContext.mockReturnValue({
      state: {
        id: 'display1',
        name: 'Test Display',
        layout: 'compact',
        statusBar: { elements: ['clock'] },
        widgets: [{ _id: 'widget1', type: 'testWidget', x: 0, y: 0, w: 1, h: 1, data: {}, name: 'Test' }],
      },
      setId: jest.fn(),
      refreshDisplayData: jest.fn(),
      isLoading: false,
      error: null,
    });

    render(<Display display="display1" />);
    expect(screen.queryByTestId('display-placeholder')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-frame')).toBeInTheDocument();
    expect(screen.getByTestId('mock-grid-layout')).toBeInTheDocument();
    // Check if a widget is rendered (optional, based on mock setup)
    // For this to work, ensure your mocked Widgets and renderWidget logic align
    expect(screen.getByTestId('mock-widget')).toBeInTheDocument();
  });

  it('calls setId and setupSSE on mount with display prop', () => {
    const mockSetId = jest.fn();
    const mockRefreshDisplayData = jest.fn();
    mockUseDisplayContext.mockReturnValue({
      state: { id: null, widgets: [], statusBar: { elements: [] } },
      setId: mockSetId,
      refreshDisplayData: mockRefreshDisplayData,
      isLoading: true,
      error: null,
    });

    // Mock EventSource
    const mockEventSourceInstance = {
        addEventListener: jest.fn(),
        close: jest.fn(),
        onerror: null, // Assignable if needed
    };
    jest.spyOn(global, 'EventSource').mockImplementation(() => mockEventSourceInstance as any);


    render(<Display display="display123" />);
    expect(mockSetId).toHaveBeenCalledWith('display123');
    expect(global.EventSource).toHaveBeenCalledWith('/api/v1/displays/display123/events');
  });

});
