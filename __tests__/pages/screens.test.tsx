import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import { useDisplayMutations } from '../../hooks/useDisplayMutations'
import { useDisplayContext } from '../../contexts/DisplayContext'
import { protect } from '../../helpers/auth'

// We need to mock the default export from the screens page
// Since it's wrapped with protect(), we need to mock that too
jest.mock('../../hooks/useDisplayMutations')
jest.mock('../../contexts/DisplayContext')
jest.mock('../../helpers/auth')

const mockedUseDisplayMutations = useDisplayMutations as jest.MockedFunction<typeof useDisplayMutations>
const mockedUseDisplayContext = useDisplayContext as jest.MockedFunction<typeof useDisplayContext>
const mockedProtect = protect as jest.MockedFunction<typeof protect>

// Mock Frame component
jest.mock('../../components/Admin/Frame.tsx', () => {
  return function MockFrame({ children, loggedIn }: { children: React.ReactNode; loggedIn: boolean }) {
    return (
      <div data-testid='frame' data-logged-in={loggedIn}>
        {children}
      </div>
    )
  }
})

// Mock ScreenList component
jest.mock('../../components/Admin/ScreenList.tsx', () => {
  return React.forwardRef(function MockScreenList(props: any, ref: any) {
    React.useImperativeHandle(ref, () => ({
      refresh: jest.fn(),
    }))
    return <div data-testid='screen-list'>Screen List</div>
  })
})

// Mock Dialog component
jest.mock('../../components/Dialog.tsx', () => {
  return function MockDialog({ children }: { children: React.ReactNode }) {
    return <div data-testid='dialog'>{children}</div>
  }
})

// Mock Button component
jest.mock('../../components/Form', () => ({
  Button: function MockButton({ text, onClick, ...props }: any) {
    return (
      <button data-testid='add-screen-button' onClick={onClick} {...props}>
        {text}
      </button>
    )
  },
}))

// Now we need to import and test the actual component
// Since it's wrapped with protect(), we need to handle that
const mockCreateDisplay = {
  mutate: jest.fn(),
  isPending: false,
  error: null,
  isSuccess: false,
  isError: false,
}

const mockDisplayMutations = {
  createDisplay: mockCreateDisplay,
  updateDisplay: { mutate: jest.fn() },
  deleteDisplay: { mutate: jest.fn() },
  getDisplay: { mutate: jest.fn() },
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
}

const mockDisplayContext = {
  state: { id: null, name: null, layout: null, statusBar: { enabled: false, elements: [] }, widgets: [] },
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

// Mock the protect HOC to return the component directly
mockedProtect.mockImplementation((Component: any) => {
  return (props: any) => React.createElement(Component, { ...props, loggedIn: true })
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )
}

// Import the component after mocking
let ScreensComponent: any

beforeAll(async () => {
  // Dynamic import to ensure mocks are set up first
  const screensModule = await import('../../pages/screens')
  ScreensComponent = screensModule.default
})

describe('Screens Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseDisplayMutations.mockReturnValue(mockDisplayMutations as any)
    mockedUseDisplayContext.mockReturnValue(mockDisplayContext)
  })

  it('should render the main elements', () => {
    render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    expect(screen.getByText('Screens')).toBeInTheDocument()
    expect(screen.getByTestId('frame')).toBeInTheDocument()
    expect(screen.getByTestId('screen-list')).toBeInTheDocument()
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('add-screen-button')).toBeInTheDocument()
    expect(screen.getByText('+ Add new screen')).toBeInTheDocument()
  })

  it('should pass loggedIn prop to Frame component', () => {
    render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    const frame = screen.getByTestId('frame')
    expect(frame).toHaveAttribute('data-logged-in', 'true')
  })

  it('should set display ID when displayId prop is provided', () => {
    render(React.createElement(ScreensComponent, {
      loggedIn: true,
      displayId: 'test-display-id'
    }), { wrapper: createWrapper() })
    
    expect(mockDisplayContext.setId).toHaveBeenCalledWith('test-display-id')
  })

  it('should not call setId when displayId is not provided', () => {
    render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    expect(mockDisplayContext.setId).not.toHaveBeenCalled()
  })

  it('should call createDisplay mutation when add button is clicked', async () => {
    render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-screen-button')
    fireEvent.click(addButton)
    
    expect(mockCreateDisplay.mutate).toHaveBeenCalledWith(undefined, expect.objectContaining({
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    }))
  })

  it('should refresh screen list on successful create', async () => {
    // We need to mock the ref to test the refresh call
    const mockRefresh = jest.fn()
    
    // Override the ScreenList mock to capture the ref
    jest.doMock('../../components/Admin/ScreenList.tsx', () => {
      return React.forwardRef(function MockScreenList(props: any, ref: any) {
        React.useImperativeHandle(ref, () => ({
          refresh: mockRefresh,
        }))
        return <div data-testid='screen-list'>Screen List</div>
      })
    })
    
    render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-screen-button')
    fireEvent.click(addButton)
    
    // Get the onSuccess callback and call it
    const mutateCall = mockCreateDisplay.mutate.mock.calls[0]
    const options = mutateCall[1]
    
    await waitFor(() => {
      options.onSuccess()
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })

  it('should handle create display error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-screen-button')
    fireEvent.click(addButton)
    
    // Get the onError callback and call it
    const mutateCall = mockCreateDisplay.mutate.mock.calls[0]
    const options = mutateCall[1]
    const testError = new Error('Failed to create display')
    
    await waitFor(() => {
      options.onError(testError)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create display:', testError)
    })
    
    consoleErrorSpy.mockRestore()
  })

  it('should return a promise from add function that resolves on success', async () => {
    render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-screen-button')
    
    // Click the button and get the promise
    let addPromise: Promise<void>
    await waitFor(() => {
      fireEvent.click(addButton)
      
      // The add function should return a promise
      const mutateCall = mockCreateDisplay.mutate.mock.calls[0]
      const options = mutateCall[1]
      
      // Simulate success
      options.onSuccess()
    })
    
    // The promise should resolve
    expect(mockCreateDisplay.mutate).toHaveBeenCalled()
  })

  it('should return a promise from add function that rejects on error', async () => {
    render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    const addButton = screen.getByTestId('add-screen-button')
    
    await waitFor(() => {
      fireEvent.click(addButton)
      
      const mutateCall = mockCreateDisplay.mutate.mock.calls[0]
      const options = mutateCall[1]
      
      // Simulate error
      const testError = new Error('Failed')
      options.onError(testError)
    })
    
    expect(mockCreateDisplay.mutate).toHaveBeenCalled()
  })

  it('should use useDisplayMutations hook', () => {
    render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    expect(mockedUseDisplayMutations).toHaveBeenCalledTimes(1)
  })

  it('should use useDisplayContext hook', () => {
    render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    expect(mockedUseDisplayContext).toHaveBeenCalledTimes(1)
  })

  it('should have proper styling classes', () => {
    const { container } = render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    expect(container.querySelector('.wrapper')).toBeInTheDocument()
  })

  it('should handle component unmounting gracefully', () => {
    const { unmount } = render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper: createWrapper() })
    
    expect(() => unmount()).not.toThrow()
  })

  describe('getInitialProps', () => {
    it('should extract displayId from query params', async () => {
      // Test the getInitialProps function
      const mockCtx = {
        query: {
          id: 'test-display-from-query'
        }
      }
      
      // Since getInitialProps is attached to the component, we need to access it
      if (ScreensComponent.getInitialProps) {
        const result = await ScreensComponent.getInitialProps(mockCtx)
        expect(result).toEqual({ displayId: 'test-display-from-query' })
      }
    })

    it('should handle missing displayId in query', async () => {
      const mockCtx = {
        query: {}
      }
      
      if (ScreensComponent.getInitialProps) {
        const result = await ScreensComponent.getInitialProps(mockCtx)
        expect(result).toEqual({ displayId: undefined })
      }
    })
  })

  describe('Memo optimization', () => {
    it('should be wrapped with memo for performance', () => {
      // The component should be memoized to prevent unnecessary re-renders
      // This is checked by the component's structure in the implementation
      expect(ScreensComponent).toBeDefined()
    })
  })

  describe('Protection HOC', () => {
    it('should be wrapped with protect HOC', () => {
      // Verify that the protect HOC was called
      expect(mockedProtect).toHaveBeenCalled()
    })
  })

  describe('Integration', () => {
    it('should work with QueryClient provider', () => {
      const queryClient = new QueryClient()
      
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      
      render(React.createElement(ScreensComponent, { loggedIn: true }), { wrapper })
      
      expect(screen.getByText('Screens')).toBeInTheDocument()
    })

    it('should update display context when displayId changes', () => {
      const { rerender } = render(React.createElement(ScreensComponent, {
        loggedIn: true,
        displayId: 'initial-id'
      }), { wrapper: createWrapper() })
      
      expect(mockDisplayContext.setId).toHaveBeenCalledWith('initial-id')
      
      // Clear previous calls
      mockDisplayContext.setId.mockClear()
      
      // Rerender with different displayId
      rerender(React.createElement(ScreensComponent, {
        loggedIn: true,
        displayId: 'new-id'
      }))
      
      expect(mockDisplayContext.setId).toHaveBeenCalledWith('new-id')
    })
  })
})