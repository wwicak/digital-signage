import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddDisplay, useDeleteDisplay, useUpdateDisplay } from '../../hooks/useDisplay';
import { addDisplay, deleteDisplay, updateDisplay, IDisplayData } from '../../actions/display';
import React, { ReactNode } from 'react';

// Mock the actions/display module
jest.mock('../../actions/display', () => ({
  addDisplay: jest.fn(),
  deleteDisplay: jest.fn(),
  updateDisplay: jest.fn(),
  getDisplay: jest.fn(), // Also mock getDisplay if useDisplay hook is in the same file and tested elsewhere
  getDisplays: jest.fn(), // Mock other functions if needed for a complete module mock
}));

// Type casting for mocked functions
const mockAddDisplay = addDisplay as jest.MockedFunction<typeof addDisplay>;
const mockDeleteDisplay = deleteDisplay as jest.MockedFunction<typeof deleteDisplay>;
const mockUpdateDisplay = updateDisplay as jest.MockedFunction<typeof updateDisplay>;

// Wrapper component to provide QueryClient
const createWrapper = (client: QueryClient) => ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

describe('Display Mutation Hooks', () => {
  let queryClient: QueryClient;
  let invalidateQueriesSpy: jest.SpyInstance;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
  });

  afterEach(() => {
    jest.clearAllMocks();
    invalidateQueriesSpy.mockRestore();
  });

  describe('useAddDisplay', () => {
    const newDisplayData: IDisplayData = { _id: 'newId', name: 'New Display' };

    test('should successfully add a display and invalidate queries', async () => {
      mockAddDisplay.mockResolvedValue(newDisplayData);
      const { result } = renderHook(() => useAddDisplay(), { wrapper: createWrapper(queryClient) });

      await act(async () => {
        await result.current.mutateAsync({ host: 'test-host' });
      });

      expect(mockAddDisplay).toHaveBeenCalledWith('test-host');
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(newDisplayData);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['displays'] });
    });

    test('should handle error when adding a display', async () => {
      const error = new Error('Failed to add display');
      mockAddDisplay.mockRejectedValue(error);
      const { result } = renderHook(() => useAddDisplay(), { wrapper: createWrapper(queryClient) });

      try {
        await act(async () => {
          await result.current.mutateAsync({ host: 'test-host' });
        });
      } catch (e) {
        // Expected error
      }

      expect(mockAddDisplay).toHaveBeenCalledWith('test-host');
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toEqual(error);
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });
  });

  describe('useDeleteDisplay', () => {
    const displayIdToDelete = 'id-to-delete';
    const deleteResponse = { message: 'Display deleted' };

    test('should successfully delete a display and invalidate queries', async () => {
      mockDeleteDisplay.mockResolvedValue(deleteResponse);
      const { result } = renderHook(() => useDeleteDisplay(), { wrapper: createWrapper(queryClient) });

      await act(async () => {
        await result.current.mutateAsync({ id: displayIdToDelete, host: 'test-host' });
      });

      expect(mockDeleteDisplay).toHaveBeenCalledWith(displayIdToDelete, 'test-host');
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(deleteResponse);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['displays'] });
    });

    test('should handle error when deleting a display', async () => {
      const error = new Error('Failed to delete display');
      mockDeleteDisplay.mockRejectedValue(error);
      const { result } = renderHook(() => useDeleteDisplay(), { wrapper: createWrapper(queryClient) });

      try {
        await act(async () => {
          await result.current.mutateAsync({ id: displayIdToDelete, host: 'test-host' });
        });
      } catch (e) {
        // Expected error
      }

      expect(mockDeleteDisplay).toHaveBeenCalledWith(displayIdToDelete, 'test-host');
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toEqual(error);
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateDisplay', () => {
    const displayIdToUpdate = 'id-to-update';
    const updatePayload: Partial<IDisplayData> = { name: 'Updated Name' };
    const updatedDisplayData: IDisplayData = { _id: displayIdToUpdate, name: 'Updated Name', description: 'Test' };

    test('should successfully update a display and invalidate relevant queries', async () => {
      mockUpdateDisplay.mockResolvedValue(updatedDisplayData);
      const { result } = renderHook(() => useUpdateDisplay(), { wrapper: createWrapper(queryClient) });

      await act(async () => {
        await result.current.mutateAsync({ id: displayIdToUpdate, data: updatePayload, host: 'test-host' });
      });

      expect(mockUpdateDisplay).toHaveBeenCalledWith(displayIdToUpdate, updatePayload, 'test-host');
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(updatedDisplayData);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['display', displayIdToUpdate] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['displays'] });
    });

    test('should handle error when updating a display', async () => {
      const error = new Error('Failed to update display');
      mockUpdateDisplay.mockRejectedValue(error);
      const { result } = renderHook(() => useUpdateDisplay(), { wrapper: createWrapper(queryClient) });

      try {
        await act(async () => {
          await result.current.mutateAsync({ id: displayIdToUpdate, data: updatePayload, host: 'test-host' });
        });
      } catch (e) {
        // Expected error
      }

      expect(mockUpdateDisplay).toHaveBeenCalledWith(displayIdToUpdate, updatePayload, 'test-host');
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toEqual(error);
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });
  });
});
