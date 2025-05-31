import React, { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalDisplayListProvider, useGlobalDisplayList } from '../../contexts/GlobalDisplayListContext';
import { getDisplays, IDisplayData } from '../../actions/display';

// Mock the actions/display module
jest.mock('../../actions/display', () => ({
  getDisplays: jest.fn(),
}));

const mockGetDisplays = getDisplays as jest.MockedFunction<typeof getDisplays>;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for testing
    },
  },
});

interface TestComponentProps {
  onRender?: (data: ReturnType<typeof useGlobalDisplayList>) => void;
}

const TestComponent: React.FC<TestComponentProps> = ({ onRender }) => {
  const contextState = useGlobalDisplayList();
  if (onRender) {
    onRender(contextState);
  }
  return (
    <div>
      <div data-testid="loading">{contextState.isLoading ? 'Loading...' : 'Loaded'}</div>
      <div data-testid="error">{contextState.error?.message || 'NoError'}</div>
      <div data-testid="displays-count">{contextState.displays?.length || 0}</div>
      <button onClick={contextState.refetchDisplays}>Refetch</button>
    </div>
  );
};

const renderWithProviders = (ui: ReactNode, client?: QueryClient) => {
  const queryClient = client || createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <GlobalDisplayListProvider>
        {ui}
      </GlobalDisplayListProvider>
    </QueryClientProvider>
  );
};

describe('GlobalDisplayListContext', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockGetDisplays.mockClear();
  });

  test('should fetch displays successfully and update context', async () => {
    const mockData: IDisplayData[] = [
      { _id: '1', name: 'Display 1', description: 'Desc 1' },
      { _id: '2', name: 'Display 2', description: 'Desc 2' },
    ];
    mockGetDisplays.mockResolvedValue(mockData);

    let contextStateDuringRender: ReturnType<typeof useGlobalDisplayList> | undefined;

    renderWithProviders(
      <TestComponent onRender={(state) => { contextStateDuringRender = state; }} />,
      queryClient
    );

    // Initial state (isLoading true)
    expect(contextStateDuringRender?.isLoading).toBe(true);
    expect(screen.getByTestId('loading').textContent).toBe('Loading...');

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('Loaded');
    });

    // Final state
    const finalContextState = (contextStateDuringRender as unknown) as ReturnType<typeof useGlobalDisplayList>; // Re-assert type after await
    expect(finalContextState.isLoading).toBe(false);
    expect(finalContextState.displays).toEqual(mockData);
    expect(finalContextState.error).toBeNull();
    expect(screen.getByTestId('displays-count').textContent).toBe(String(mockData.length));
    expect(mockGetDisplays).toHaveBeenCalledTimes(1);
  });

  test('should handle error state when fetching displays fails', async () => {
    const errorMessage = 'Failed to fetch displays';
    mockGetDisplays.mockRejectedValue(new Error(errorMessage));

    let contextStateDuringRender: ReturnType<typeof useGlobalDisplayList> | undefined;

    renderWithProviders(
      <TestComponent onRender={(state) => { contextStateDuringRender = state; }} />,
      queryClient
    );

    // Initial state (isLoading true)
    expect(contextStateDuringRender?.isLoading).toBe(true);
    expect(screen.getByTestId('loading').textContent).toBe('Loading...');

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('Loaded'); // isLoading becomes false even on error
    });

    const finalContextState = (contextStateDuringRender as unknown) as ReturnType<typeof useGlobalDisplayList>; // Re-assert type
    expect(finalContextState.isLoading).toBe(false);
    expect(finalContextState.displays).toBeUndefined(); // Or [] depending on useQuery behavior with error
    expect(finalContextState.error).toBeInstanceOf(Error);
    expect(finalContextState.error?.message).toBe(errorMessage);
    expect(screen.getByTestId('error').textContent).toBe(errorMessage);
    expect(screen.getByTestId('displays-count').textContent).toBe('0');
    expect(mockGetDisplays).toHaveBeenCalledTimes(1);
  });

  test('should refetch displays when refetchDisplays is called', async () => {
    const mockData1: IDisplayData[] = [{ _id: '1', name: 'Display 1' }];
    const mockData2: IDisplayData[] = [{ _id: '2', name: 'Display 2 Updated' }];

    mockGetDisplays.mockResolvedValueOnce(mockData1); // First call

    renderWithProviders(<TestComponent />, queryClient);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('Loaded');
    });
    expect(screen.getByTestId('displays-count').textContent).toBe('1');
    expect(mockGetDisplays).toHaveBeenCalledTimes(1);

    // Setup mock for second call before triggering refetch
    mockGetDisplays.mockResolvedValueOnce(mockData2);

    const refetchButton = screen.getByText('Refetch');
    refetchButton.click();

    await waitFor(() => {
      // We need to check for a change that indicates data from the second call
      // For example, if TestComponent displayed display names, we'd check for "Display 2 Updated"
      // Here, we primarily check if getDisplays was called again.
      // React Query might update isLoading states during refetch, handle if necessary for assertions.
      expect(mockGetDisplays).toHaveBeenCalledTimes(2);
    });

    // Optionally, verify the data has been updated if TestComponent reflected it
    // This part depends on how TestComponent uses the data.
    // For now, the main check is that getDisplays was called again.
  });

  test('useGlobalDisplayList should throw error if not used within a provider', () => {
    // Suppress console.error output from React for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => render(<TestComponent />)).toThrow('useGlobalDisplayList must be used within a GlobalDisplayListProvider');

    // Restore console.error
    console.error = originalError;
  });
});
