import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useDisplays } from "../../hooks/useDisplays";
import { getDisplays, IDisplayData } from "../../actions/display";

// Mock the actions/display module
jest.mock("../../actions/display", () => ({
  getDisplays: jest.fn(),
}));

const mockedGetDisplays = getDisplays as jest.MockedFunction<
  typeof getDisplays
>;

// Test data
const mockDisplaysData: IDisplayData[] = [
  {
    _id: "display1",
    name: "Display 1",
    layout: "spaced",
    widgets: [],
    creator_id: "user1",
  },
  {
    _id: "display2",
    name: "Display 2",
    layout: "compact",
    widgets: [
      {
        _id: "widget1",
        name: "Widget 1",
        type: "announcement",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        data: {},
      },
    ],
    creator_id: "user2",
  },
];

// Helper function to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retry for tests
        gcTime: 0, // Disable cache for tests
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useDisplays", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return displays data when query is successful", async () => {
    mockedGetDisplays.mockResolvedValueOnce(mockDisplaysData);

    const { result } = renderHook(() => useDisplays(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe(null);

    // Wait for the query to resolve
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockDisplaysData);
    expect(result.current.error).toBe(null);
    expect(result.current.isSuccess).toBe(true);
    expect(mockedGetDisplays).toHaveBeenCalledTimes(1);
    expect(mockedGetDisplays).toHaveBeenCalledWith();
  });

  it("should handle error states properly", async () => {
    const mockError = new Error("Failed to fetch displays");
    mockedGetDisplays.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useDisplays(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the query to fail
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeTruthy();
    expect(result.current.isError).toBe(true);
    expect(mockedGetDisplays).toHaveBeenCalledTimes(3); // Due to retry: 2 in useDisplays
  });

  it("should return empty array when API returns empty data", async () => {
    mockedGetDisplays.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useDisplays(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBe(null);
    expect(result.current.isSuccess).toBe(true);
  });

  it("should use correct query configuration", async () => {
    mockedGetDisplays.mockResolvedValueOnce(mockDisplaysData);

    const { result } = renderHook(() => useDisplays(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Test that the hook exposes the expected TanStack Query properties
    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("isError");
    expect(result.current).toHaveProperty("isSuccess");
    expect(result.current).toHaveProperty("refetch");
  });

  it("should allow manual refetch", async () => {
    mockedGetDisplays.mockResolvedValueOnce(mockDisplaysData);

    const { result } = renderHook(() => useDisplays(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Clear the mock to test refetch
    mockedGetDisplays.mockClear();
    mockedGetDisplays.mockResolvedValueOnce([
      ...mockDisplaysData,
      {
        _id: "display3",
        name: "Display 3",
        layout: "spaced",
        widgets: [],
        creator_id: "user3",
      },
    ]);

    // Trigger refetch
    await result.current.refetch();

    expect(mockedGetDisplays).toHaveBeenCalledTimes(1);
  });

  it("should handle network errors gracefully", async () => {
    const networkError = new Error("Network Error");
    networkError.name = "NetworkError";
    mockedGetDisplays.mockRejectedValueOnce(networkError);

    const { result } = renderHook(() => useDisplays(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("should cache results according to query configuration", async () => {
    mockedGetDisplays.mockResolvedValueOnce(mockDisplaysData);

    const wrapper = createWrapper();

    // First render
    const { result: result1 } = renderHook(() => useDisplays(), { wrapper });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    // Second render should use cache (no additional API call within staleTime)
    const { result: result2 } = renderHook(() => useDisplays(), { wrapper });

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // Should have only called the API once due to caching
    expect(mockedGetDisplays).toHaveBeenCalledTimes(1);
  });
});
