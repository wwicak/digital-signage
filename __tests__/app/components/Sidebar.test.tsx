import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'; // Import within
import '@testing-library/jest-dom';
import { NextRouter } from 'next/router';
import SidebarComponentWithRouter, { ISidebarProps } from '../../../components/Admin/Sidebar';
import { IDisplayData } from '../../../actions/display';

// --- Mocks ---

const mockRouterPush = jest.fn();
const mockRouterReload = jest.fn();
const mockRouterReplace = jest.fn();

let currentMockRouterState: NextRouter = {
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  basePath: '',
  isFallback: false,
  isReady: true,
  isPreview: false,
  isLocaleDomain: false,
  push: mockRouterPush,
  replace: mockRouterReplace,
  reload: mockRouterReload,
  back: jest.fn(),
  forward: jest.fn(),
  beforePopState: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  prefetch: jest.fn(() => Promise.resolve()),
};

jest.mock('next/router', () => ({
  __esModule: true,
  useRouter: () => currentMockRouterState,
  withRouter: (Component: any) => {
    const WrappedComponent = (props: any) => {
      return <Component {...props} router={props.router || currentMockRouterState} />;
    };
    WrappedComponent.displayName = `withRouter(${Component.displayName || Component.name || 'Component'})`;
    return WrappedComponent;
  },
  default: {
    get push() { return currentMockRouterState.push; },
    get replace() { return currentMockRouterState.replace; },
    get reload() { return currentMockRouterState.reload; },
    get route() { return currentMockRouterState.route; },
    get pathname() { return currentMockRouterState.pathname; },
    get query() { return currentMockRouterState.query; },
    get asPath() { return currentMockRouterState.asPath; },
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  },
}));

jest.mock('next/link', () => {
  const MockLink = ({ children, href, legacyBehavior, ...rest }: { children: React.ReactNode, href: string, legacyBehavior?: boolean }) => {
    // This simplified mock causes the <a> in <a> warning with legacyBehavior if children also contain <a>.
    // However, it allows testing the href prop correctly on the Link itself.
    return <a href={href} {...rest}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('../../helpers/auth', () => ({
  logout: jest.fn(() => Promise.resolve()),
}));

const mockSetIdGlobal = jest.fn();
jest.mock('../../contexts/DisplayContext', () => ({
  useDisplayContext: jest.fn(() => ({
    state: { id: 'defaultDisplayId', name: 'Default Display Name' },
    setId: mockSetIdGlobal,
  })),
}));

jest.mock('../../actions/display', () => ({
  getDisplays: jest.fn(),
}));

jest.mock('../DropdownButton', () => {
  const InnerMockDropdownButton = jest.fn(({ children, onSelect, choices, style, menuStyle, ...rest }) => (
    <div data-testid="mock-dropdown-button" style={style} {...rest}>
      <div data-testid="dropdown-button-children-container">{children}</div>
      <select data-testid="mock-dropdown-select" onChange={(e) => onSelect(e.target.value)} style={menuStyle}>
        {choices.map((choice: any) => (
          <option key={choice.key} value={choice.key}>{choice.name}</option>
        ))}
      </select>
    </div>
  ));
  (InnerMockDropdownButton as any).displayName = 'MockDropdownButton';
  return {
    __esModule: true,
    default: InnerMockDropdownButton,
  };
});

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: jest.fn((props) => <i data-testid="mock-fa-icon" className={`fa-${props.icon.iconName}`} />),
}));

const initialMockRouterState: NextRouter = {
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    basePath: '',
    isFallback: false,
    isReady: true,
    isPreview: false,
    isLocaleDomain: false,
    push: mockRouterPush,
    replace: mockRouterReplace,
    reload: mockRouterReload,
    back: jest.fn(),
    forward: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    prefetch: jest.fn(() => Promise.resolve()),
};

const renderSidebar = (props: Partial<ISidebarProps> = {}, routerOverrides: Partial<NextRouter> = {}) => {
  currentMockRouterState = { ...initialMockRouterState, ...routerOverrides, push:mockRouterPush, replace:mockRouterReplace, reload:mockRouterReload, events: {...initialMockRouterState.events}, back: jest.fn(), beforePopState: jest.fn(), prefetch: jest.fn(() => Promise.resolve()) };
  return render(<SidebarComponentWithRouter router={currentMockRouterState} {...props} />);
};

describe('Sidebar Component', () => {
  let MockedDropdownButton: jest.Mock;
  let logoutMock: jest.Mock;
  let useDisplayContextMock: jest.Mock;
  let getDisplaysMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    MockedDropdownButton = require('../DropdownButton').default;
    logoutMock = require('../../helpers/auth').logout;
    useDisplayContextMock = require('../../contexts/DisplayContext').useDisplayContext;
    getDisplaysMock = require('../../actions/display').getDisplays;

    currentMockRouterState = {
        ...initialMockRouterState,
        push: mockRouterPush,
        replace: mockRouterReplace,
        reload: mockRouterReload,
        events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
        back: jest.fn(),
        beforePopState: jest.fn(),
        prefetch: jest.fn(() => Promise.resolve())
    };

    useDisplayContextMock.mockReturnValue({
      state: { id: 'display1', name: 'Display One' },
      setId: mockSetIdGlobal,
    });

    getDisplaysMock.mockResolvedValue([
      { _id: 'display1', name: 'Display One', creator_id: 'user1', widgets: [] },
      { _id: 'display2', name: 'Display Two', creator_id: 'user1', slideshow_id: 's2', widgets: [] },
    ] as IDisplayData[]);
  });

  describe('Logged Out State', () => {
    test('renders Login menu item and no admin links', async () => {
      useDisplayContextMock.mockReturnValue({
        state: { id: 'defaultDisplayId', name: 'Default Display Name' },
        setId: mockSetIdGlobal,
      });
      renderSidebar({ loggedIn: false });
      await waitFor(() => {
        expect(screen.getByText('Login').closest('a')).toBeInTheDocument();
      });
      expect(screen.queryByText('Screens')).not.toBeInTheDocument();
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-dropdown-button')).not.toBeInTheDocument();
    });
  });

  describe('Logged In State', () => {
    const loggedInProps: Partial<ISidebarProps> = { loggedIn: true };
    const initialDisplays: IDisplayData[] = [
      { _id: 'display1', name: 'Display One', creator_id: 'user1', widgets: [] },
      { _id: 'display2', name: 'Display Two', creator_id: 'user1', widgets: [] },
    ];

    test('renders admin menu items with correct paths using context displayId', async () => {
      renderSidebar(loggedInProps);
      await waitFor(() => expect(getDisplaysMock).toHaveBeenCalled());

      expect(screen.getByText('Screens').closest('li')?.parentElement).toHaveAttribute('href', '/screens?display=display1');
      expect(screen.getByText('Layout').closest('li')?.parentElement).toHaveAttribute('href', '/layout?display=display1');
      expect(screen.getByText('Preview').closest('li')?.parentElement).toHaveAttribute('href', '/preview?display=display1');
      expect(screen.getByText('Slideshows').closest('li')?.parentElement).toHaveAttribute('href', '/slideshows?display=display1');
    });

    test('renders admin menu items with correct paths using displayId prop if provided', async () => {
        renderSidebar({ ...loggedInProps, displayId: 'display2' });
        await waitFor(() => expect(getDisplaysMock).toHaveBeenCalled());

        expect(screen.getByText('Screens').closest('li')?.parentElement).toHaveAttribute('href', '/screens?display=display2');
        expect(screen.getByText('Layout').closest('li')?.parentElement).toHaveAttribute('href', '/layout?display=display2');
    });

    test('renders DropdownButton with displays and current display name from context', async () => {
      renderSidebar(loggedInProps);
      await waitFor(() => expect(screen.getByTestId('mock-dropdown-button')).toBeInTheDocument());

      expect(MockedDropdownButton).toHaveBeenCalled();
      // Use `within` from RTL to scope the search for "Display One"
      const dropdownChildrenContainer = screen.getByTestId('dropdown-button-children-container');
      expect(within(dropdownChildrenContainer).getByText('Display One')).toBeInTheDocument();

      expect(screen.getByTestId('mock-dropdown-select').children).toHaveLength(initialDisplays.length);
      const selectElement = screen.getByTestId('mock-dropdown-select');
      expect(selectElement.querySelector('option[value="display1"]')).toHaveTextContent('Display One');
      expect(selectElement.querySelector('option[value="display2"]')).toHaveTextContent('Display Two');
    });

    test('selecting a display from DropdownButton calls Router.push and context.setId', async () => {
      renderSidebar(loggedInProps);
      await waitFor(() => expect(screen.getByTestId('mock-dropdown-select')).toBeInTheDocument());

      const selectElement = screen.getByTestId('mock-dropdown-select');
      fireEvent.change(selectElement, { target: { value: 'display2' } });

      expect(mockRouterPush).toHaveBeenCalledWith('/layout?display=display2');
      expect(mockSetIdGlobal).toHaveBeenCalledWith('display2');
    });

    test('renders Logout button and calls logout helper on click', async () => {
      renderSidebar(loggedInProps);
      const logoutDiv = await screen.findByText('Logout');
      expect(logoutDiv).toBeInTheDocument();

      const logoutClickableParent = logoutDiv.closest('.logout');
      expect(logoutClickableParent).toBeInTheDocument();

      if (logoutClickableParent) {
        fireEvent.click(logoutClickableParent);
      }
      expect(logoutMock).toHaveBeenCalledTimes(1);
    });

    test('highlights active link based on router.pathname', async () => {
      const activePath = `/layout?display=display1`;
      useDisplayContextMock.mockReturnValue({
          state: { id: 'display1', name: 'Display One' },
          setId: mockSetIdGlobal,
      });
      renderSidebar(loggedInProps, { pathname: activePath });

      await waitFor(() => expect(screen.getByText('Layout').closest('li')).toHaveClass('active'));
      expect(screen.getByText('Screens').closest('li')).not.toHaveClass('active');
    });
  });
});
