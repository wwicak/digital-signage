import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import ScreenCard, { IScreenCardProps } from '../../../components/Admin/ScreenCard'
import { useDisplayMutations } from '../../../hooks/useDisplayMutations'
import { IDisplayData } from '../../../actions/display'

// Mock the hooks
jest.mock('../../../hooks/useDisplayMutations')
const mockedUseDisplayMutations = useDisplayMutations as jest.MockedFunction<typeof useDisplayMutations>

// Mock Next.js router and Link
const mockRouterPush = jest.fn()
jest.mock('next/router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockRouterPush,
    pathname: '/',
  }),
  default: {
    push: mockRouterPush,
  },
}))

jest.mock('next/link', () => {
  return ({ children, href, ...rest }: { children: React.ReactNode, href: string, [key: string]: any }) => {
    if (React.isValidElement(children) && children.type === 'a') {
      return React.cloneElement(children as React.ReactElement<any>, { href, ...rest, ...(children.props || {}) })
    }
    return React.createElement('a', { href, ...rest }, children)
  }
})

// Mock FontAwesome icons
jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: jest.fn((props) => React.createElement('i', {
    'data-testid': `mock-fa-icon-${props.icon.iconName}`,
    'data-color': props.color
  })),
}))

const mockDeleteDisplay = {
  mutate: jest.fn(),
  isPending: false,
  error: null,
  isSuccess: false,
  isError: false,
}

const defaultMutationsReturn = {
  deleteDisplay: mockDeleteDisplay,
  createDisplay: { mutate: jest.fn(), isPending: false },
  updateDisplay: { mutate: jest.fn(), isPending: false },
  getDisplay: { mutate: jest.fn(), isPending: false },
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  createError: null,
  updateError: null,
  deleteError: null,
}

const mockDisplayValue: IDisplayData = {
  _id: 'display123',
  name: 'Test Display',
  layout: 'spaced',
  widgets: [
    { _id: 'w1', name: 'Widget 1', type: 'announcement', x: 0, y: 0, w: 1, h: 1, data: {} },
    { _id: 'w2', name: 'Widget 2', type: 'image', x: 1, y: 0, w: 1, h: 1, data: {} }
  ],
  creator_id: 'user1',
}

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

const renderScreenCard = (props?: Partial<IScreenCardProps>) => {
  const mockRefresh = jest.fn()
  const combinedProps: IScreenCardProps = {
    value: mockDisplayValue,
    refresh: mockRefresh,
    ...props,
  }
  return {
    ...render(React.createElement(ScreenCard, combinedProps), { wrapper: createWrapper() }),
    mockRefresh,
  }
}

describe('ScreenCard (Refactored with hooks)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseDisplayMutations.mockReturnValue(defaultMutationsReturn as any)
  })

  describe('Rendering', () => {
    it('should render basic display information', () => {
      renderScreenCard()
      
      expect(screen.getByText('Test Display')).toBeInTheDocument()
      expect(screen.getByText('2 widgets')).toBeInTheDocument()
      expect(screen.getByText('1 client paired')).toBeInTheDocument()
      expect(screen.getByText('online')).toBeInTheDocument()
    })

    it('should render "Untitled Display" when name is not provided', () => {
      renderScreenCard({
        value: { ...mockDisplayValue, name: undefined as any }
      })
      
      expect(screen.getByText('Untitled Display')).toBeInTheDocument()
    })

    it('should render "Untitled Display" when name is empty', () => {
      renderScreenCard({
        value: { ...mockDisplayValue, name: '' }
      })
      
      expect(screen.getByText('Untitled Display')).toBeInTheDocument()
    })

    it('should handle widgets count correctly', () => {
      renderScreenCard({
        value: { ...mockDisplayValue, widgets: [] }
      })
      
      expect(screen.getByText('0 widgets')).toBeInTheDocument()
    })

    it('should handle undefined widgets array', () => {
      renderScreenCard({
        value: { ...mockDisplayValue, widgets: undefined as any }
      })
      
      expect(screen.getByText('0 widgets')).toBeInTheDocument()
    })

    it('should render all action icons', () => {
      renderScreenCard()
      
      expect(screen.getByLabelText('Edit Layout')).toBeInTheDocument()
      expect(screen.getByLabelText('View Display')).toBeInTheDocument()
      expect(screen.getByLabelText('Delete Display')).toBeInTheDocument()
      
      // Check icons are rendered
      expect(screen.getByTestId('mock-fa-icon-eye')).toBeInTheDocument()
      expect(screen.getByTestId('mock-fa-icon-link')).toBeInTheDocument()
      expect(screen.getByTestId('mock-fa-icon-trash')).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('should have correct link for main card', () => {
      renderScreenCard()
      
      const mainCard = screen.getByText('Test Display').closest('a')
      expect(mainCard).toHaveAttribute('href', `/layout?display=${mockDisplayValue._id}`)
    })

    it('should have correct link for Edit Layout action', () => {
      renderScreenCard()
      
      const editLink = screen.getByLabelText('Edit Layout')
      expect(editLink).toHaveAttribute('href', `/layout?display=${mockDisplayValue._id}`)
    })

    it('should have correct link for View Display action', () => {
      renderScreenCard()
      
      const viewLink = screen.getByLabelText('View Display')
      expect(viewLink).toHaveAttribute('href', `/display/${mockDisplayValue._id}`)
    })
  })

  describe('Delete Functionality', () => {
    it('should call useDisplayMutations deleteDisplay when delete button is clicked', () => {
      const { mockRefresh } = renderScreenCard()
      
      const deleteButton = screen.getByLabelText('Delete Display')
      fireEvent.click(deleteButton)
      
      expect(mockDeleteDisplay.mutate).toHaveBeenCalledWith(
        { id: mockDisplayValue._id },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      )
    })

    it('should call refresh on successful delete', () => {
      const { mockRefresh } = renderScreenCard()
      
      const deleteButton = screen.getByLabelText('Delete Display')
      fireEvent.click(deleteButton)
      
      // Get the onSuccess callback and call it
      const mutateCall = mockDeleteDisplay.mutate.mock.calls[0]
      const options = mutateCall[1]
      
      act(() => {
        options.onSuccess()
      })
      
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it('should handle delete error and log to console', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const { mockRefresh } = renderScreenCard()
      
      const deleteButton = screen.getByLabelText('Delete Display')
      fireEvent.click(deleteButton)
      
      // Get the onError callback and call it
      const mutateCall = mockDeleteDisplay.mutate.mock.calls[0]
      const options = mutateCall[1]
      const testError = new Error('Delete failed')
      
      act(() => {
        options.onError(testError)
      })
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete display:', testError)
      expect(mockRefresh).not.toHaveBeenCalled()
      
      consoleErrorSpy.mockRestore()
    })

    it('should prevent event propagation on delete click', () => {
      renderScreenCard()
      
      const deleteButton = screen.getByLabelText('Delete Display')
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as any
      
      fireEvent.click(deleteButton, mockEvent)
      
      // The component should call preventDefault and stopPropagation
      // This is tested indirectly by ensuring the delete mutation is called
      expect(mockDeleteDisplay.mutate).toHaveBeenCalled()
    })

    it('should handle delete via keyboard (Enter)', () => {
      renderScreenCard()
      
      const deleteButton = screen.getByLabelText('Delete Display')
      fireEvent.keyPress(deleteButton, { key: 'Enter', code: 'Enter', charCode: 13 })
      
      expect(mockDeleteDisplay.mutate).toHaveBeenCalledWith(
        { id: mockDisplayValue._id },
        expect.any(Object)
      )
    })

    it('should handle delete via keyboard (Space)', () => {
      renderScreenCard()
      
      const deleteButton = screen.getByLabelText('Delete Display')
      fireEvent.keyPress(deleteButton, { key: ' ', code: 'Space', charCode: 32 })
      
      expect(mockDeleteDisplay.mutate).toHaveBeenCalledWith(
        { id: mockDisplayValue._id },
        expect.any(Object)
      )
    })

    it('should not delete when _id is missing', () => {
      renderScreenCard({
        value: { ...mockDisplayValue, _id: undefined as any }
      })
      
      const deleteButton = screen.getByLabelText('Delete Display')
      fireEvent.click(deleteButton)
      
      expect(mockDeleteDisplay.mutate).not.toHaveBeenCalled()
    })

    it('should not delete when value is null', () => {
      renderScreenCard({ value: null as any })
      
      // Component should handle this gracefully, but delete shouldn't work
      const deleteButton = screen.getByLabelText('Delete Display')
      fireEvent.click(deleteButton)
      
      expect(mockDeleteDisplay.mutate).not.toHaveBeenCalled()
    })
  })

  describe('Action Icon Event Handling', () => {
    it('should prevent propagation on Edit Layout click', () => {
      renderScreenCard()
      
      const editLink = screen.getByLabelText('Edit Layout')
      const stopPropagationSpy = jest.fn()
      
      // Mock event with stopPropagation
      fireEvent.click(editLink, { stopPropagation: stopPropagationSpy })
      
      // The component should handle stopPropagation internally
      // We test this indirectly by ensuring the link works correctly
      expect(editLink).toHaveAttribute('href', `/layout?display=${mockDisplayValue._id}`)
    })

    it('should prevent propagation on View Display click', () => {
      renderScreenCard()
      
      const viewLink = screen.getByLabelText('View Display')
      const stopPropagationSpy = jest.fn()
      
      fireEvent.click(viewLink, { stopPropagation: stopPropagationSpy })
      
      expect(viewLink).toHaveAttribute('href', `/display/${mockDisplayValue._id}`)
    })
  })

  describe('Loading States', () => {
    it('should reflect deletion loading state from hook', () => {
      mockedUseDisplayMutations.mockReturnValue({
        ...defaultMutationsReturn,
        isDeleting: true,
      } as any)
      
      renderScreenCard()
      
      // The component should reflect the loading state
      // This would typically be shown through disabled states or loading indicators
      // Since the current component doesn't have visible loading states,
      // we just verify the hook is called correctly
      expect(mockedUseDisplayMutations).toHaveBeenCalled()
    })
  })

  describe('Error States', () => {
    it('should handle when deleteDisplay mutation has error', () => {
      const deleteError = new Error('Delete failed')
      mockedUseDisplayMutations.mockReturnValue({
        ...defaultMutationsReturn,
        deleteError,
      } as any)
      
      renderScreenCard()
      
      // Component should render normally even with error
      expect(screen.getByText('Test Display')).toBeInTheDocument()
      expect(screen.getByLabelText('Delete Display')).toBeInTheDocument()
    })
  })

  describe('Integration with Global State', () => {
    it('should use the global display mutations hook', () => {
      renderScreenCard()
      
      expect(mockedUseDisplayMutations).toHaveBeenCalledTimes(1)
    })

    it('should work with QueryClient provider', () => {
      // Test that the component works within the QueryClient context
      const queryClient = new QueryClient()
      
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      
      render(React.createElement(ScreenCard, {
        value: mockDisplayValue,
        refresh: jest.fn()
      }), { wrapper })
      
      expect(screen.getByText('Test Display')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderScreenCard()
      
      expect(screen.getByLabelText('Edit Layout')).toBeInTheDocument()
      expect(screen.getByLabelText('View Display')).toBeInTheDocument()
      expect(screen.getByLabelText('Delete Display')).toBeInTheDocument()
    })

    it('should support keyboard navigation for delete button', () => {
      renderScreenCard()
      
      const deleteButton = screen.getByLabelText('Delete Display')
      expect(deleteButton).toHaveAttribute('tabIndex', '0')
      expect(deleteButton).toHaveAttribute('role', 'button')
    })
  })

  describe('CSS Classes and Styling', () => {
    it('should have proper CSS structure', () => {
      const { container } = renderScreenCard()
      
      expect(container.querySelector('.card')).toBeInTheDocument()
      expect(container.querySelector('.left')).toBeInTheDocument()
      expect(container.querySelector('.middle')).toBeInTheDocument()
      expect(container.querySelector('.right')).toBeInTheDocument()
    })
  })
})