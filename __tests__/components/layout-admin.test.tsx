import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { DisplayProvider } from '../../contexts/DisplayContext'

// Mock Next.js router
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
  }),
}))

// Mock canvas for lottie animations
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    fillStyle: '',
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Array(4) })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  })),
})

// Mock react-grid-layout
jest.mock('react-grid-layout', () => {
  const MockGridLayout = ({ children, onLayoutChange, layout, ...props }: any) => (
    <div data-testid="grid-layout" {...props}>
      {children}
    </div>
  )
  return {
    __esModule: true,
    default: MockGridLayout,
  }
})

// Mock widgets to avoid canvas issues
jest.mock('../../widgets', () => ({
  __esModule: true,
  default: {
    slideshow: {
      name: 'Slideshow',
      icon: () => null,
      defaultSize: { w: 4, h: 2 },
      defaultData: {}
    },
    image: {
      name: 'Image',
      icon: () => null,
      defaultSize: { w: 4, h: 2 },
      defaultData: {}
    }
  }
}))

// Mock the WidthProvider
jest.mock('../../components/Widgets/WidthProvider', () => {
  return function WidthProvider(Component: any) {
    return function WrappedComponent(props: any) {
      return <Component {...props} width={1200} />
    }
  }
})

// Mock hooks
jest.mock('../../hooks/useLayout', () => ({
  useLayout: jest.fn(() => ({
    data: {
      _id: 'test-layout-id',
      name: 'Test Layout',
      description: 'Test Description',
      orientation: 'landscape',
      layoutType: 'spaced',
      statusBar: { enabled: true, elements: [] },
      isActive: true,
      isTemplate: true,
      gridConfig: { cols: 16, rows: 9, margin: [12, 12], rowHeight: 60 },
      widgets: [
        {
          widget_id: {
            _id: 'widget-1',
            type: 'slideshow',
            name: 'Test Widget'
          },
          x: 0,
          y: 0,
          w: 4,
          h: 2
        }
      ]
    },
    isLoading: false,
    refetch: jest.fn()
  }))
}))

jest.mock('../../hooks/useLayouts', () => ({
  useLayouts: jest.fn(() => ({
    data: { layouts: [] },
    isLoading: false
  }))
}))

jest.mock('../../hooks/useLayoutMutations', () => ({
  useLayoutMutations: jest.fn(() => ({
    createLayout: jest.fn(),
    updateLayout: jest.fn(),
    createLayoutAsync: jest.fn(),
    updateLayoutAsync: jest.fn(),
    isCreating: false,
    isUpdating: false
  }))
}))

jest.mock('../../hooks/useAvailableWidgets', () => ({
  useWidgetChoices: jest.fn(() => ({
    widgetChoices: [
      { key: 'slideshow', name: 'Slideshow' },
      { key: 'image', name: 'Image' }
    ],
    isLoading: false
  }))
}))

// Mock actions
jest.mock('../../actions/layouts', () => ({
  addWidgetToLayout: jest.fn(),
  updateWidgetPositions: jest.fn(),
  removeWidgetFromLayout: jest.fn()
}))

// Mock Frame component
jest.mock('../../components/Admin/Frame', () => {
  return function MockFrame({ children }: { children: React.ReactNode }) {
    return <div data-testid="frame">{children}</div>
  }
})

// Mock EditableWidget component
jest.mock('../../components/Admin/EditableWidget', () => {
  return function MockEditableWidget({ id, type, onDelete }: any) {
    return (
      <div data-testid={`editable-widget-${id}`}>
        <span>Widget: {type}</span>
        <button onClick={() => onDelete(id)}>Delete</button>
      </div>
    )
  }
})

// Import the component after mocks
import LayoutAdminPage from '../../app/layout-admin/page'

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <DisplayProvider>
          {children}
        </DisplayProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

describe('Layout Admin Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the layout editor interface', async () => {
    render(
      <TestWrapper>
        <LayoutAdminPage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Edit Layout')).toBeInTheDocument()
    })

    expect(screen.getByText('Layout Canvas')).toBeInTheDocument()
    expect(screen.getByTestId('grid-layout')).toBeInTheDocument()
  })

  it('displays widgets in the grid layout', async () => {
    render(
      <TestWrapper>
        <LayoutAdminPage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editable-widget-widget-1')).toBeInTheDocument()
    })

    expect(screen.getByText('Widget: slideshow')).toBeInTheDocument()
  })

  it('shows add widget button', async () => {
    render(
      <TestWrapper>
        <LayoutAdminPage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Add Widget')).toBeInTheDocument()
    })
  })

  it('shows auto-arrange button', async () => {
    render(
      <TestWrapper>
        <LayoutAdminPage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Auto-arrange')).toBeInTheDocument()
    })
  })

  it('displays layout settings form', async () => {
    render(
      <TestWrapper>
        <LayoutAdminPage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Layout')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
  })
})
