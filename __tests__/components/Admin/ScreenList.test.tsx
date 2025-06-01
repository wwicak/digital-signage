import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import ScreenList, { IScreenListRef } from '../../../components/Admin/ScreenList'
import { useDisplays } from '../../../hooks/useDisplays'
import { IDisplayData } from '../../../actions/display'

// Mock the hooks
jest.mock('../../../hooks/useDisplays')
const mockedUseDisplays = useDisplays as jest.MockedFunction<typeof useDisplays>

// Mock ScreenCard component
jest.mock('../../../components/Admin/ScreenCard', () => {
  return function MockScreenCard({ value, refresh }: { value: IDisplayData; refresh: () => void }) {
    return (
      <div data-testid={`screen-card-${value._id}`}>
        <span>{value.name}</span>
        <button onClick={refresh} data-testid={`refresh-${value._id}`}>
          Refresh
        </button>
      </div>
    )
  }
})

// Mock ContentLoader
jest.mock('react-content-loader', () => {
  return function MockContentLoader({ ...props }: any) {
    return <div data-testid="content-loader" {...props} />
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
    widgets: [
      {
        _id: 'widget1',
        name: 'Widget 1',
        type: 'announcement',
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        data: {},
      },
    ],
    creator_id: 'user2',
  },
]

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  )
}

describe('ScreenList', () => {
  const mockRefetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render screens when data is available', () => {
    mockedUseDisplays.mockReturnValue({
      data: mockDisplaysData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isError: false,
      isSuccess: true,
    } as any)

    render(React.createElement(ScreenList, {}), { wrapper: createWrapper() })

    expect(screen.getByTestId('screen-card-display1')).toBeInTheDocument()
    expect(screen.getByTestId('screen-card-display2')).toBeInTheDocument()
    expect(screen.getByText('Display 1')).toBeInTheDocument()
    expect(screen.getByText('Display 2')).toBeInTheDocument()
  })

  it('should render loading state when isLoading is true', () => {
    mockedUseDisplays.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
      isError: false,
      isSuccess: false,
    } as any)

    render(React.createElement(ScreenList, {}), { wrapper: createWrapper() })

    // Should render 4 loaders
    const loaders = screen.getAllByTestId('content-loader')
    expect(loaders).toHaveLength(4)
    expect(loaders[0]).toHaveAttribute('height', '120')
    expect(loaders[0]).toHaveAttribute('width', '640')
  })

  it('should render error message when there is an error', () => {
    const mockError = new Error('Failed to load displays')
    mockedUseDisplays.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: mockRefetch,
      isError: true,
      isSuccess: false,
    } as any)

    render(React.createElement(ScreenList, {}), { wrapper: createWrapper() })

    expect(screen.getByText('Failed to load screens. Please try again later.')).toBeInTheDocument()
    expect(screen.queryByTestId('content-loader')).not.toBeInTheDocument()
    expect(screen.queryByTestId('screen-card-display1')).not.toBeInTheDocument()
  })

  it('should render empty list when data is empty array', () => {
    mockedUseDisplays.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isError: false,
      isSuccess: true,
    } as any)

    render(React.createElement(ScreenList, {}), { wrapper: createWrapper() })

    expect(screen.queryByTestId('screen-card-display1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('content-loader')).not.toBeInTheDocument()
    expect(screen.queryByText('Failed to load screens')).not.toBeInTheDocument()
  })

  it('should pass refetch function to ScreenCard components', () => {
    mockedUseDisplays.mockReturnValue({
      data: [mockDisplaysData[0]],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isError: false,
      isSuccess: true,
    } as any)

    render(React.createElement(ScreenList, {}), { wrapper: createWrapper() })

    const refreshButton = screen.getByTestId('refresh-display1')
    refreshButton.click()

    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('should use display._id as key when available', () => {
    mockedUseDisplays.mockReturnValue({
      data: mockDisplaysData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isError: false,
      isSuccess: true,
    } as any)

    const { container } = render(React.createElement(ScreenList, {}), { wrapper: createWrapper() })

    // Check that elements are rendered (key testing is indirect)
    expect(screen.getByTestId('screen-card-display1')).toBeInTheDocument()
    expect(screen.getByTestId('screen-card-display2')).toBeInTheDocument()
  })

  it('should handle displays without _id gracefully', () => {
    const displayWithoutId = { ...mockDisplaysData[0] }
    delete (displayWithoutId as any)._id

    mockedUseDisplays.mockReturnValue({
      data: [displayWithoutId],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isError: false,
      isSuccess: true,
    } as any)

    // Should not crash
    render(React.createElement(ScreenList, {}), { wrapper: createWrapper() })
    expect(screen.getByText('Display 1')).toBeInTheDocument()
  })

  it('should expose refresh method via ref', () => {
    mockedUseDisplays.mockReturnValue({
      data: mockDisplaysData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isError: false,
      isSuccess: true,
    } as any)

    const ref = React.createRef<IScreenListRef>()
    
    render(React.createElement(ScreenList, { ref }), { wrapper: createWrapper() })

    expect(ref.current).toBeDefined()
    expect(ref.current?.refresh).toBeInstanceOf(Function)

    // Test calling refresh via ref
    ref.current?.refresh()
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('should have proper CSS classes and structure', () => {
    mockedUseDisplays.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isError: false,
      isSuccess: true,
    } as any)

    const { container } = render(React.createElement(ScreenList, {}), { wrapper: createWrapper() })

    const listElement = container.querySelector('.list')
    expect(listElement).toBeInTheDocument()
  })

  it('should render correct number of loaders during loading', () => {
    mockedUseDisplays.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
      isError: false,
      isSuccess: false,
    } as any)

    render(React.createElement(ScreenList, {}), { wrapper: createWrapper() })

    const loaders = screen.getAllByTestId('content-loader')
    expect(loaders).toHaveLength(4)
    
    // Check loader properties
    loaders.forEach(loader => {
      expect(loader).toHaveAttribute('speed', '2')
      expect(loader).toHaveAttribute('backgroundColor', '#f3f3f3')
      expect(loader).toHaveAttribute('foregroundColor', '#ecebeb')
    })
  })

  it('should prioritize error state over loading state', () => {
    const mockError = new Error('Network error')
    mockedUseDisplays.mockReturnValue({
      data: undefined,
      isLoading: true, // Still loading but has error
      error: mockError,
      refetch: mockRefetch,
      isError: true,
      isSuccess: false,
    } as any)

