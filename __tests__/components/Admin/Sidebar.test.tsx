import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import Sidebar from '../../../components/Admin/Sidebar';
import * as DisplayActions from '../../../actions/display'; // To mock getDisplays
import { DisplayProvider } from '../../../contexts/DisplayContext'; // To wrap Sidebar

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
  withRouter: (component: any) => { // Simplified withRouter HOC mock
    component.defaultProps = {
      ...component.defaultProps,
      router: { pathname: '/', push: jest.fn(), query: {} }, // Mock router object
    };
    return component;
  },
}));

// Mock actions/display
jest.mock('../../../actions/display', () => ({
  getDisplays: jest.fn(),
}));

// Mock helpers/auth
jest.mock('../../../helpers/auth', () => ({
  logout: jest.fn().mockResolvedValue({}),
}));

// Mock FontAwesomeIcon to prevent issues with rendering icons in tests
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <div data-testid="mock-fa-icon" />,
}));


describe('Sidebar', () => {
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = {
      pathname: '/layout',
      push: jest.fn(),
      query: { display: 'display1' },
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (DisplayActions.getDisplays as jest.Mock).mockClear();
  });

  const renderSidebar = (props = {}) => {
    return render(
      <DisplayProvider>
        <Sidebar loggedIn={true} {...props} />
      </DisplayProvider>
    );
  };

  it('renders SidebarDisplayItemPlaceholders when loading displays', async () => {
    (DisplayActions.getDisplays as jest.Mock).mockImplementation(() => {
      return new Promise(() => {}); // Simulate a pending promise (loading state)
    });

    renderSidebar();

    // Expect 3 placeholders as implemented
    const placeholders = await screen.findAllByRole('generic', { name: /sidebar display item placeholder/i });
    expect(placeholders).toHaveLength(3);
    expect(screen.queryByText('Select Display')).not.toBeInTheDocument(); // Dropdown not visible
  });

  it('renders display dropdown when displays are loaded', async () => {
    const mockDisplays = [
      { _id: 'display1', name: 'Test Display 1' },
      { _id: 'display2', name: 'Test Display 2' },
    ];
    (DisplayActions.getDisplays as jest.Mock).mockResolvedValue(mockDisplays);

    renderSidebar();

    await waitFor(() => {
      // The DropdownButton renders a div with class 'logo' as its child
      // and the display name is inside a span with class 'name'
      expect(screen.getByText('Test Display 1')).toBeInTheDocument();
    });
    expect(screen.queryAllByRole('generic', { name: /sidebar display item placeholder/i })).toHaveLength(0);
  });

  it('renders "No displays found" when no displays are loaded and not loading', async () => {
    (DisplayActions.getDisplays as jest.Mock).mockResolvedValue([]);

    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText('No displays found.')).toBeInTheDocument();
    });
    expect(screen.queryAllByRole('generic', { name: /sidebar display item placeholder/i })).toHaveLength(0);
  });

  it('renders menu items correctly', async () => {
    (DisplayActions.getDisplays as jest.Mock).mockResolvedValue([{ _id: 'display1', name: 'Test Display 1' }]);
    renderSidebar();

    await waitFor(() => {
        expect(screen.getByText('Test Display 1')).toBeInTheDocument();
    });

    expect(screen.getByText('Screens')).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Slideshows')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
});

// Add an aria-label or a specific test-id to SidebarDisplayItemPlaceholder for easier querying
// For now, using a generic role and a descriptive name in the placeholder itself if possible,
// or relying on its structure for tests.
// For the test:
// In SidebarDisplayItemPlaceholder.tsx, modify the main div:
// <div style={{...}} aria-label="sidebar display item placeholder">
// This will make `findAllByRole('generic', { name: /sidebar display item placeholder/i })` work.
// If not, we would need to query by testId or structure.
// The subtask will assume this aria-label is added to SidebarDisplayItemPlaceholder.
