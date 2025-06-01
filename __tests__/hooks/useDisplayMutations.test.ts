import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useDisplayMutations,
  useCreateDisplay,
  useUpdateDisplay,
  useDeleteDisplay,
} from '../../hooks/useDisplayMutations'
import {
  addDisplay,
  updateDisplay,
  deleteDisplay,
  getDisplay,
  IDisplayData,
  IDeleteResponse,
} from '../../actions/display'

// Mock the actions/display module
jest.mock('../../actions/display', () => ({
  addDisplay: jest.fn(),
  updateDisplay: jest.fn(),
  deleteDisplay: jest.fn(),
  getDisplay: jest.fn(),
}))

const mockedAddDisplay = addDisplay as jest.MockedFunction<typeof addDisplay>
const mockedUpdateDisplay = updateDisplay as jest.MockedFunction<
  typeof updateDisplay
>
const mockedDeleteDisplay = deleteDisplay as jest.MockedFunction<
  typeof deleteDisplay
>
const mockedGetDisplay = getDisplay as jest.MockedFunction<typeof getDisplay>

// Test data
const mockDisplayData: IDisplayData = {
  _id: 'display1',
  name: 'Test Display',
  layout: 'spaced',
  widgets: [],
  creator_id: 'user1',
}

const updatedDisplayData: IDisplayData = {
  ...mockDisplayData,
  name: 'Updated Display',
}

// Helper function to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useDisplayMutations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createDisplay', () => {
    it('should create a display successfully', async () => {
      // Create a promise that resolves after a delay to capture loading state
      let resolvePromise: (value: IDisplayData) => void
      const delayedPromise = new Promise<IDisplayData>((resolve) => {
        resolvePromise = resolve
      })

      mockedAddDisplay.mockReturnValueOnce(delayedPromise)

      const { result } = renderHook(() => useDisplayMutations(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isCreating).toBe(false)

      act(() => {
        result.current.createDisplay.mutate('localhost')
      })

      // Should be loading now
      await waitFor(() => {
        expect(result.current.isCreating).toBe(true)
      })

      // Resolve the promise
      act(() => {
        resolvePromise!(mockDisplayData)
      })

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false)
      })

      expect(mockedAddDisplay).toHaveBeenCalledWith('localhost')
      expect(result.current.createError).toBe(null)
    })

    it('should handle create display error', async () => {
      const mockError = new Error('Failed to create display')
      mockedAddDisplay.mockRejectedValueOnce(mockError)

      const { result } = renderHook(() => useDisplayMutations(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.createDisplay.mutate(undefined)
      })

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false)
      })

      expect(result.current.createError).toBeTruthy()
      expect(mockedAddDisplay).toHaveBeenCalledWith(undefined)
    })

    it('should update cache optimistically on successful create', async () => {
      mockedAddDisplay.mockResolvedValueOnce(mockDisplayData)

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })

      // Pre-populate cache with existing displays
      queryClient.setQueryData(['displays'], [])

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          children
        )

      const { result } = renderHook(() => useDisplayMutations(), { wrapper })

      act(() => {
        result.current.createDisplay.mutate(undefined)
      })

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false)
      })

      // Check that cache was updated
      const cachedDisplays = queryClient.getQueryData(['displays'])
      expect(cachedDisplays).toEqual([mockDisplayData])
    })
  })

  describe('updateDisplay', () => {
    it('should update a display successfully', async () => {
      // Create a promise that resolves after a delay to capture loading state
      let resolvePromise: (value: IDisplayData) => void
      const delayedPromise = new Promise<IDisplayData>((resolve) => {
        resolvePromise = resolve
      })

      mockedUpdateDisplay.mockReturnValueOnce(delayedPromise)

      const { result } = renderHook(() => useDisplayMutations(), {
        wrapper: createWrapper(),
      })

      const updateData = { name: 'Updated Display' }

      act(() => {
        result.current.updateDisplay.mutate({
          id: 'display1',
          data: updateData,
          host: 'localhost',
        })
      })

      // Should be loading now
      await waitFor(() => {
        expect(result.current.isUpdating).toBe(true)
      })

      // Resolve the promise
      act(() => {
        resolvePromise!(updatedDisplayData)
      })

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false)
      })

      expect(mockedUpdateDisplay).toHaveBeenCalledWith(
        'display1',
        updateData,
        'localhost'
      )
      expect(result.current.updateError).toBe(null)
    })

    it('should handle update display error', async () => {
      const mockError = new Error('Failed to update display')
      mockedUpdateDisplay.mockRejectedValueOnce(mockError)

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const { result } = renderHook(() => useDisplayMutations(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.updateDisplay.mutate({
          id: 'display1',
          data: { name: 'Updated' },
        })
      })

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false)
      })

      expect(result.current.updateError).toBeTruthy()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to update display display1:',
        mockError
      )

      consoleErrorSpy.mockRestore()
    })

    it('should update both individual and list cache on successful update', async () => {
      mockedUpdateDisplay.mockResolvedValueOnce(updatedDisplayData)

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })

      // Pre-populate cache
      queryClient.setQueryData(['display', 'display1'], mockDisplayData)
      queryClient.setQueryData(['displays'], [mockDisplayData])

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          children
        )

      const { result } = renderHook(() => useDisplayMutations(), { wrapper })

      act(() => {
        result.current.updateDisplay.mutate({
          id: 'display1',
          data: { name: 'Updated Display' },
        })
      })

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false)
      })

      // Check individual display cache
      const cachedDisplay = queryClient.getQueryData(['display', 'display1'])
      expect(cachedDisplay).toEqual(updatedDisplayData)

      // Check displays list cache
      const cachedDisplays = queryClient.getQueryData(['displays'])
      expect(cachedDisplays).toEqual([updatedDisplayData])
    })
  })

  describe('deleteDisplay', () => {
    it('should delete a display successfully', async () => {
      // Create a promise that resolves after a delay to capture loading state
      let resolvePromise: (value: IDeleteResponse) => void
      const delayedPromise = new Promise<IDeleteResponse>((resolve) => {
        resolvePromise = resolve
      })

      mockedDeleteDisplay.mockReturnValueOnce(delayedPromise)

      const { result } = renderHook(() => useDisplayMutations(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.deleteDisplay.mutate({
          id: 'display1',
          host: 'localhost',
        })
      })

      // Should be loading now
      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true)
      })

      // Resolve the promise
      act(() => {
        resolvePromise!({ message: 'Display deleted' })
      })

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false)
      })

      expect(mockedDeleteDisplay).toHaveBeenCalledWith('display1', 'localhost')
      expect(result.current.deleteError).toBe(null)
    })

    it('should handle delete display error', async () => {
      const mockError = new Error('Failed to delete display')
      mockedDeleteDisplay.mockRejectedValueOnce(mockError)

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const { result } = renderHook(() => useDisplayMutations(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.deleteDisplay.mutate({ id: 'display1' })
      })

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false)
      })

      expect(result.current.deleteError).toBeTruthy()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to delete display display1:',
        mockError
      )

      consoleErrorSpy.mockRestore()
    })

    it('should remove display from cache on successful delete', async () => {
      mockedDeleteDisplay.mockResolvedValueOnce({ message: 'Deleted' })

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })

      // Pre-populate cache
      queryClient.setQueryData(['display', 'display1'], mockDisplayData)
      queryClient.setQueryData(['displays'], [mockDisplayData])

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          children
        )

      const { result } = renderHook(() => useDisplayMutations(), { wrapper })

      act(() => {
        result.current.deleteDisplay.mutate({ id: 'display1' })
      })

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false)
      })

      // Check that display was removed from list cache
      const cachedDisplays = queryClient.getQueryData(['displays'])
      expect(cachedDisplays).toEqual([])

      // Check that individual display cache was removed
      const cachedDisplay = queryClient.getQueryData(['display', 'display1'])
      expect(cachedDisplay).toBeUndefined()
    })
  })

  describe('getDisplay', () => {
    it('should get a display successfully', async () => {
      mockedGetDisplay.mockResolvedValueOnce(mockDisplayData)

      const { result } = renderHook(() => useDisplayMutations(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.getDisplay.mutate({
          id: 'display1',
          host: 'localhost',
        })
      })

      await waitFor(() => {
        expect(result.current.getDisplay.isSuccess).toBe(true)
      })

      expect(mockedGetDisplay).toHaveBeenCalledWith('display1', 'localhost')
    })

    it('should handle get display error', async () => {
      const mockError = new Error('Failed to get display')
      mockedGetDisplay.mockRejectedValueOnce(mockError)

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const { result } = renderHook(() => useDisplayMutations(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.getDisplay.mutate({ id: 'display1' })
      })

      await waitFor(() => {
        expect(result.current.getDisplay.isError).toBe(true)
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to fetch display display1:',
        mockError
      )

      consoleErrorSpy.mockRestore()
    })
  })
})

describe('Individual hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useCreateDisplay', () => {
    it('should work independently', async () => {
      mockedAddDisplay.mockResolvedValueOnce(mockDisplayData)

      const { result } = renderHook(() => useCreateDisplay(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.mutate('localhost')
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedAddDisplay).toHaveBeenCalledWith('localhost')
    })
  })

  describe('useUpdateDisplay', () => {
    it('should work independently', async () => {
      mockedUpdateDisplay.mockResolvedValueOnce(updatedDisplayData)

      const { result } = renderHook(() => useUpdateDisplay(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.mutate({
          id: 'display1',
          data: { name: 'Updated' },
          host: 'localhost',
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedUpdateDisplay).toHaveBeenCalledWith(
        'display1',
        { name: 'Updated' },
        'localhost'
      )
    })
  })

  describe('useDeleteDisplay', () => {
    it('should work independently', async () => {
      mockedDeleteDisplay.mockResolvedValueOnce({ message: 'Deleted' })

      const { result } = renderHook(() => useDeleteDisplay(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.mutate({ id: 'display1', host: 'localhost' })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockedDeleteDisplay).toHaveBeenCalledWith('display1', 'localhost')
    })
  })
})
