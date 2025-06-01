import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

/**
 * Creates a QueryClient for testing with disabled retries and cache
 */
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * Creates a wrapper component with QueryClientProvider for testing
 */
export const createQueryWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient()
  
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

/**
 * Custom render function that includes QueryClientProvider
 */
export const renderWithQuery = (
  ui: React.ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = {}
) => {
  const Wrapper = createQueryWrapper(queryClient)
  
  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  }
}

/**
 * Mock display data for testing
 */
export const createMockDisplay = (overrides: Partial<any> = {}) => ({
  _id: 'mock-display-id',
  name: 'Mock Display',
  layout: 'spaced' as const,
  statusBar: {
    enabled: false,
    color: '#000000',
    elements: [],
  },
  widgets: [],
  creator_id: 'mock-user-id',
  ...overrides,
})

/**
 * Mock widget data for testing
 */
export const createMockWidget = (overrides: Partial<any> = {}) => ({
  _id: 'mock-widget-id',
  name: 'Mock Widget',
  type: 'announcement',
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  data: {},
  ...overrides,
})

/**
 * Creates mock return value for useDisplays hook
 */
export const createMockUseDisplaysReturn = (overrides: Partial<any> = {}) => ({
  data: [],
  isLoading: false,
  error: null,
  isError: false,
  isSuccess: true,
  refetch: jest.fn(),
  ...overrides,
})

/**
 * Creates mock return value for useDisplayMutations hook
 */
export const createMockUseDisplayMutationsReturn = (overrides: Partial<any> = {}) => ({
  createDisplay: {
    mutate: jest.fn(),
    isPending: false,
    error: null,
    isSuccess: false,
    isError: false,
  },
  updateDisplay: {
    mutate: jest.fn(),
    isPending: false,
    error: null,
    isSuccess: false,
    isError: false,
  },
  deleteDisplay: {
    mutate: jest.fn(),
    isPending: false,
    error: null,
    isSuccess: false,
    isError: false,
  },
  getDisplay: {
    mutate: jest.fn(),
    isPending: false,
    error: null,
    isSuccess: false,
    isError: false,
  },
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  createError: null,
  updateError: null,
  deleteError: null,
  ...overrides,
})

/**
 * Creates mock return value for useDisplayContext hook
 */
export const createMockUseDisplayContextReturn = (overrides: Partial<any> = {}) => ({
  state: {
    id: null,
    name: null,
    layout: null,
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
  ...overrides,
})

/**
 * Creates mock Next.js router for testing
 */
export const createMockRouter = (overrides: Partial<any> = {}) => ({
  push: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
  basePath: '',
  isLocaleDomain: false,
  back: jest.fn(),
  beforePopState: jest.fn(),
  prefetch: jest.fn(),
  reload: jest.fn(),
  replace: jest.fn(),
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  isFallback: false,
  isReady: true,
  isPreview: false,
  ...overrides,
})

/**
 * Waits for all pending promises to resolve
 */
export const waitForPromises = () => new Promise(resolve => setTimeout(resolve, 0))

/**
 * Mock console methods and return restore functions
 */
export const mockConsole = () => {
  const originalError = console.error
  const originalLog = console.log
  const originalWarn = console.warn
  
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  
  return {
    errorSpy,
    logSpy,
    warnSpy,
    restore: () => {
      errorSpy.mockRestore()
      logSpy.mockRestore()
      warnSpy.mockRestore()
    },
  }
}

/**
 * Assert that a function is called with specific arguments
 */
export const expectToHaveBeenCalledWithObject = (
  mockFn: jest.MockedFunction<any>,
  expectedObject: any
) => {
  expect(mockFn).toHaveBeenCalledWith(
    expect.objectContaining(expectedObject)
  )
}

/**
 * Create a promise that can be resolved/rejected manually
 */
export const createManualPromise = <T = any>() => {
  let resolve: (value: T) => void
  let reject: (reason?: any) => void
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  
  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  }
}

/**
 * Helper to test async operations with loading states
 */
export const testAsyncOperation = async (
  operation: () => Promise<any>,
  expectations: {
    beforeOperation?: () => void
    duringOperation?: () => void
    afterSuccess?: () => void
    afterError?: (error: Error) => void
  }
) => {
  expectations.beforeOperation?.()
  
  try {
    const promise = operation()
    expectations.duringOperation?.()
    
    const result = await promise
    expectations.afterSuccess?.()
    return result
  } catch (error) {
    expectations.afterError?.(error as Error)
    throw error
  }
}