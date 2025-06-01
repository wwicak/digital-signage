import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import Sidebar, { ISidebarProps } from '../../../components/Admin/Sidebar'
import { useDisplays } from '../../../hooks/useDisplays'
import { useDisplayContext } from '../../../contexts/DisplayContext'
import { logout } from '../../../helpers/auth'
import { IDisplayData } from '../../../actions/display'

// Mock the hooks and dependencies
jest.mock('../../../hooks/useDisplays')
jest.mock('../../../contexts/DisplayContext')
jest.mock('../../../helpers/auth')

const mockedUseDisplays = useDisplays as jest.MockedFunction<typeof useDisplays>
const mockedUseDisplayContext = useDisplayContext as jest.MockedFunction<typeof useDisplayContext>
const mockedLogout = logout as jest.MockedFunction<typeof logout>

// Mock Next.js router - create mock function separately to avoid hoisting issues
const mockRouterPush = jest.fn()
const mockDefaultRouterPush = jest.fn()
const mockRouter = {
  push: mockRouterPush,
  pathname: '/screens',
  query: {},
  asPath: '/screens',
  route: '/screens',
  basePath: '',
  isLocaleDomain: false,
  // Add other required NextRouter properties as needed
} as any

jest.mock('next/router', () => ({
  __esModule: true,
  useRouter: () => mockRouter,
  default: {
    push: jest.fn(), // Use anonymous function to avoid hoisting issues
  },
  withRouter: (Component: any) => {
    return (props: any) => React.createElement(Component, { ...props, router: mockRouter })
  },
}))

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...rest }: { children: React.ReactNode, href: string, [key: string]: any }) => {
    if (React.isValidElement(children) && children.type === 'li') {
      return React.cloneElement(children as React.ReactElement<any>, {
        'data-href': href,
        ...rest,
        ...(children.props || {})
      })
    }
    return React.createElement('a', { href, ...rest }, children)
  }
})

// Mock FontAwesome
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: jest.fn((props) => React.createElement('i', {
    'data-testid': `icon-${props.icon.iconName}`,
    'data-color': props.color
  })),
}))

// Mock DropdownButton
jest.mock('../../../components/DropdownButton', () => {
  return function MockDropdownButton({ children, onSelect, choices }: any) {
    return (
      <div data-testid='dropdown-button'>
        {children}
        <div data-testid='dropdown-choices'>
          {choices && choices.map((choice: any) => (
            <button
              key={choice.key}
              data-testid={`choice-${choice.key}`}
              onClick={() => onSelect && onSelect(choice.key)}
            >
              {choice.name}
            </button>
          ))}
        </div>
      </div>
    )
  }
})

const mockDisplaysData: IDisplayData[] = [
  {
    _id: 'display1',
    name: 'Display 1',
    layout: 'spaced',
    widgets: [],
    creator_id: 'user1',
  },
  {
    _id: 'display2',
    name: 'Display 2',
    layout: 'compact',
    widgets: [],
    creator_id: 'user2',
  },
]

const mockDisplayContext = {
  state: {
    id: 'display1',
    name: 'Display 1',
    layout: 'spaced' as const,
    statusBar: { enabled: false, elements: [] },
    widgets: [],
  },
  setId: jest.fn(),
  setName: jest.fn(),
  updateName: jest.fn(),
  updateLayout: jest.fn(),
  updateWidgets: jest.fn(),
  addStatusBarItem: jest.fn(),
  removeStatusBarItem: jest.fn(),
  reorderStatusBarItems: jest.fn(),
  refreshDisplayData: jest.fn(),
  isLoading: false,
  error: null,
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )
}

const renderSidebar = (props?: Partial<ISidebarProps>) => {
  const defaultProps: ISidebarProps = {
    router: mockRouter,
    loggedIn: true,
    displayId: null,
    ...props,
  }
  
  return render(React.createElement(Sidebar, defaultProps), { wrapper: createWrapper() })
}

describe('Sidebar (Refactored with global hooks)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseDisplays.mockReturnValue({
      data: mockDisplaysData,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)
    mockedUseDisplayContext.mockReturnValue(mockDisplayContext)
    mockedLogout.mockResolvedValue({} as any)
  })

  describe('When logged in', () => {
    it('should render display dropdown when logged in', () => {
      renderSidebar({ loggedIn: true })
      
      expect(screen.getByTestId('dropdown-button')).toBeInTheDocument()
      // Check current display name in the dropdown header
      const dropdown = screen.getByTestId('dropdown-button')
      expect(dropdown).toHaveTextContent('Display 1')
      expect(screen.getByText('online')).toBeInTheDocument() // Status
    })

    it('should render all menu items when logged in', () => {
      renderSidebar({ loggedIn: true })
      
      expect(screen.getByText('Screens')).toBeInTheDocument()
      expect(screen.getByText('Layout')).toBeInTheDocument()
      expect(screen.getByText('Preview')).toBeInTheDocument()
      expect(screen.getByText('Slideshows')).toBeInTheDocument()
    })

    it('should render logout button when logged in', () => {
      renderSidebar({ loggedIn: true })
      
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('should use displays data from useDisplays hook', () => {
      renderSidebar({ loggedIn: true })
      
      expect(mockedUseDisplays).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('choice-display1')).toBeInTheDocument()
      expect(screen.getByTestId('choice-display2')).toBeInTheDocument()
    })

    it('should use display context for current display info', () => {
      renderSidebar({ loggedIn: true })
      
      expect(mockedUseDisplayContext).toHaveBeenCalledTimes(1)
      // Check current display name in the dropdown header
      const dropdown = screen.getByTestId('dropdown-button')
      expect(dropdown).toHaveTextContent('Display 1')
    })

    it('should navigate to admin page when display is selected from dropdown', () => {
      // Access the mocked Router.push function
      const Router = require('next/router').default
      const mockRouterDefaultPush = Router.push
      
      renderSidebar({ loggedIn: true })
      
      const displayChoice = screen.getByTestId('choice-display2')
      fireEvent.click(displayChoice)
      
      expect(mockRouterDefaultPush).toHaveBeenCalledWith('/layout?display=display2')
      expect(mockDisplayContext.setId).toHaveBeenCalledWith('display2')
    })

    it('should handle logout correctly', async () => {
      renderSidebar({ loggedIn: true })
      
      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)
      
      expect(mockedLogout).toHaveBeenCalledTimes(1)
    })

    it('should handle logout error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const logoutError = new Error('Logout failed')
      mockedLogout.mockRejectedValueOnce(logoutError)
      
      renderSidebar({ loggedIn: true })
      
      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)
      
      await new Promise(resolve => setTimeout(resolve, 0)) // Wait for promise
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Logout failed:', logoutError)
      consoleErrorSpy.mockRestore()
    })

    it('should support keyboard interaction for logout', () => {
      renderSidebar({ loggedIn: true })
      
      const logoutElement = screen.getByText('Logout').closest('[role="button"]')
      expect(logoutElement).toHaveAttribute('tabIndex', '0')
      
      // Test Enter key
      fireEvent.keyPress(logoutElement!, { key: 'Enter', code: 'Enter', charCode: 13 })
      expect(mockedLogout).toHaveBeenCalledTimes(1)
      
      mockedLogout.mockClear()
      
      // Test space key
      fireEvent.keyPress(logoutElement!, { key: ' ', code: 'Space', charCode: 32 })
      expect(mockedLogout).toHaveBeenCalledTimes(1)
    })
  })

  describe('When not logged in', () => {
    it('should not render display dropdown when not logged in', () => {
      renderSidebar({ loggedIn: false })
      
      expect(screen.queryByTestId('dropdown-button')).not.toBeInTheDocument()
    })

    it('should render only login menu item when not logged in', () => {
      renderSidebar({ loggedIn: false })
      
      expect(screen.getByText('Login')).toBeInTheDocument()
      expect(screen.queryByText('Screens')).not.toBeInTheDocument()
      expect(screen.queryByText('Layout')).not.toBeInTheDocument()
      expect(screen.queryByText('Preview')).not.toBeInTheDocument()
      expect(screen.queryByText('Slideshows')).not.toBeInTheDocument()
    })

    it('should not render logout button when not logged in', () => {
      renderSidebar({ loggedIn: false })
      
      expect(screen.queryByText('Logout')).not.toBeInTheDocument()
    })
  })

  describe('Display ID handling', () => {
    it('should use displayId prop when provided', () => {
      renderSidebar({ loggedIn: true, displayId: 'display2' })
      
      // Menu items should use the provided displayId
      const screensLink = screen.getByText('Screens').closest('[data-href]')
      expect(screensLink).toHaveAttribute('data-href', '/screens?display=display2')
    })

    it('should fallback to context ID when displayId prop is not provided', () => {
      renderSidebar({ loggedIn: true, displayId: null })
      
      const screensLink = screen.getByText('Screens').closest('[data-href]')
      expect(screensLink).toHaveAttribute('data-href', '/screens?display=display1')
    })

    it('should fallback to first display when no displayId prop and no context ID', () => {
      mockedUseDisplayContext.mockReturnValue({
        ...mockDisplayContext,
        state: { ...mockDisplayContext.state, id: null }
      })
      
      renderSidebar({ loggedIn: true, displayId: null })
      
      const screensLink = screen.getByText('Screens').closest('[data-href]')
      expect(screensLink).toHaveAttribute('data-href', '/screens?display=display1')
    })

    it('should handle empty displays array gracefully', () => {
      mockedUseDisplays.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any)
      
      mockedUseDisplayContext.mockReturnValue({
        ...mockDisplayContext,
        state: { ...mockDisplayContext.state, id: null }
      })
      
      renderSidebar({ loggedIn: true })
      
      const screensLink = screen.getByText('Screens').closest('[data-href]')
      expect(screensLink).toHaveAttribute('data-href', '/screens?display=')
    })
  })

  describe('Menu item paths', () => {
    it('should generate correct paths for all menu items', () => {
      renderSidebar({ loggedIn: true, displayId: 'test-display' })
      
      const screensLink = screen.getByText('Screens').closest('[data-href]')
      const layoutLink = screen.getByText('Layout').closest('[data-href]')
      const previewLink = screen.getByText('Preview').closest('[data-href]')
      const slideshowsLink = screen.getByText('Slideshows').closest('[data-href]')
      
      expect(screensLink).toHaveAttribute('data-href', '/screens?display=test-display')
      expect(layoutLink).toHaveAttribute('data-href', '/layout?display=test-display')
      expect(previewLink).toHaveAttribute('data-href', '/preview?display=test-display')
      expect(slideshowsLink).toHaveAttribute('data-href', '/slideshows?display=test-display')
    })

    it('should generate correct login path when not logged in', () => {
      renderSidebar({ loggedIn: false, displayId: 'test-display' })
      
      const loginLink = screen.getByText('Login').closest('[data-href]')
      expect(loginLink).toHaveAttribute('data-href', '/login?display=test-display')
    })
  })

  describe('Loading and error states', () => {
    it('should handle loading state from useDisplays', () => {
      mockedUseDisplays.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any)
      
      renderSidebar({ loggedIn: true })
      
      // Should render with empty displays data gracefully
      expect(screen.getByTestId('dropdown-button')).toBeInTheDocument()
    })

    it('should handle error state from useDisplays', () => {
      mockedUseDisplays.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load displays'),
        refetch: jest.fn(),
      } as any)
      
      renderSidebar({ loggedIn: true })
      
      // Should render with empty displays data gracefully
      expect(screen.getByTestId('dropdown-button')).toBeInTheDocument()
    })

    it('should show "Select Display" when no current display name', () => {
      mockedUseDisplayContext.mockReturnValue({
        ...mockDisplayContext,
        state: { ...mockDisplayContext.state, name: null }
      })
      
      renderSidebar({ loggedIn: true })
      
      expect(screen.getByText('Select Display')).toBeInTheDocument()
    })
  })

  describe('Icons and styling', () => {
    it('should render all expected icons', () => {
      renderSidebar({ loggedIn: true })
      
      // Use getAllByTestId for icons that appear multiple times
      const tvIcons = screen.getAllByTestId('icon-tv')
      expect(tvIcons).toHaveLength(2) // Main display icon and Screens menu icon
      expect(screen.getByTestId('icon-th-large')).toBeInTheDocument() // Layout icon
      expect(screen.getByTestId('icon-eye')).toBeInTheDocument() // Preview icon
      expect(screen.getByTestId('icon-images')).toBeInTheDocument() // Slideshows icon
      expect(screen.getByTestId('icon-caret-down')).toBeInTheDocument() // Dropdown caret
      expect(screen.getByTestId('icon-sign-out-alt')).toBeInTheDocument() // Logout icon
    })

    it('should have proper CSS structure', () => {
      const { container } = renderSidebar({ loggedIn: true })
      
      expect(container.querySelector('.sidebar')).toBeInTheDocument()
      expect(container.querySelector('.menu-list')).toBeInTheDocument()
      expect(container.querySelector('.logo')).toBeInTheDocument()
    })
  })

  describe('Integration with global state', () => {
    it('should integrate properly with useDisplays hook', () => {
      renderSidebar({ loggedIn: true })
      
      expect(mockedUseDisplays).toHaveBeenCalledTimes(1)
    })

    it('should integrate properly with useDisplayContext hook', () => {
      renderSidebar({ loggedIn: true })
      
      expect(mockedUseDisplayContext).toHaveBeenCalledTimes(1)
    })

    it('should transform displays data correctly for dropdown', () => {
      renderSidebar({ loggedIn: true })
      
      // Should have both displays in dropdown choices
      expect(screen.getByTestId('choice-display1')).toBeInTheDocument()
      expect(screen.getByTestId('choice-display2')).toBeInTheDocument()
      
      // Check dropdown choice buttons contain the expected text
      const choice1 = screen.getByTestId('choice-display1')
      const choice2 = screen.getByTestId('choice-display2')
      expect(choice1).toHaveTextContent('Display 1')
      expect(choice2).toHaveTextContent('Display 2')
    })
  })
})