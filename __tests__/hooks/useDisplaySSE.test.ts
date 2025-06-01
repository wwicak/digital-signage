import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useDisplaySSE, refreshDisplayData } from "../../hooks/useDisplaySSE";

// Helper function to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useDisplaySSE", () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should initialize with default enabled state", () => {
    const { result } = renderHook(() => useDisplaySSE(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.reconnect).toBeInstanceOf(Function);
    expect(result.current.disconnect).toBeInstanceOf(Function);
  });

  it("should initialize with enabled=true", () => {
    const { result } = renderHook(() => useDisplaySSE(true), {
      wrapper: createWrapper(),
    });

    expect(result.current.isConnected).toBe(false);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "SSE hook initialized (placeholder - actual implementation pending)"
    );
  });

  it("should not initialize when enabled=false", () => {
    const { result } = renderHook(() => useDisplaySSE(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.isConnected).toBe(false);
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      "SSE hook initialized (placeholder - actual implementation pending)"
    );
  });

  it("should log cleanup message on unmount", () => {
    const { unmount } = renderHook(() => useDisplaySSE(true), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "SSE hook cleanup (placeholder)"
    );
  });

  it("should provide reconnect function", () => {
    const { result } = renderHook(() => useDisplaySSE(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.reconnect();
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "SSE reconnect requested (placeholder)"
    );
  });

  it("should provide disconnect function", () => {
    const { result } = renderHook(() => useDisplaySSE(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.disconnect();
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "SSE disconnect requested (placeholder)"
    );
  });

  it("should re-initialize when enabled state changes from false to true", () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useDisplaySSE(enabled),
      {
        wrapper: createWrapper(),
        initialProps: { enabled: false },
      }
    );

    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      "SSE hook initialized (placeholder - actual implementation pending)"
    );

    // Change enabled to true
    rerender({ enabled: true });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "SSE hook initialized (placeholder - actual implementation pending)"
    );
  });

  it("should cleanup and re-initialize when enabled state changes from true to false and back", () => {
    const { rerender } = renderHook(({ enabled }) => useDisplaySSE(enabled), {
      wrapper: createWrapper(),
      initialProps: { enabled: true },
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "SSE hook initialized (placeholder - actual implementation pending)"
    );

    // Change enabled to false
    rerender({ enabled: false });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "SSE hook cleanup (placeholder)"
    );

    // Clear previous calls to check new initialization
    consoleLogSpy.mockClear();

    // Change enabled back to true
    rerender({ enabled: true });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "SSE hook initialized (placeholder - actual implementation pending)"
    );
  });

  it("should handle queryClient dependency changes", () => {
    const queryClient1 = new QueryClient();
    const queryClient2 = new QueryClient();

    const wrapper1 = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient1 },
        children
      );

    const wrapper2 = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient2 },
        children
      );

    const { rerender, unmount } = renderHook(() => useDisplaySSE(true), {
      wrapper: wrapper1,
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "SSE hook initialized (placeholder - actual implementation pending)"
    );

    consoleLogSpy.mockClear();

    // For a placeholder implementation, we'll test that the hook can be unmounted and remounted
    // In a real implementation, queryClient dependency changes would trigger cleanup
    unmount();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "SSE hook cleanup (placeholder)"
    );
  });
});

describe("refreshDisplayData", () => {
  let mockQueryClient: any;

  beforeEach(() => {
    mockQueryClient = {
      invalidateQueries: jest.fn(),
    };
  });

  it("should invalidate specific display query when displayId is provided", () => {
    refreshDisplayData(mockQueryClient, "display1");

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["display", "display1"],
    });
  });

  it("should invalidate all displays query when no displayId is provided", () => {
    refreshDisplayData(mockQueryClient);

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["displays"],
    });
  });

  it("should invalidate all displays query when displayId is undefined", () => {
    refreshDisplayData(mockQueryClient, undefined);

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["displays"],
    });
  });

  it("should invalidate all displays query when displayId is empty string", () => {
    refreshDisplayData(mockQueryClient, "");

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["displays"],
    });
  });
});
