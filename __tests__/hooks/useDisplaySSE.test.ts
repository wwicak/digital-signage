import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useDisplaySSE, refreshDisplayData } from "../../hooks/useDisplaySSE";

// Mock EventSource
class MockEventSource {
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = 0;
  CONNECTING = 0;
  OPEN = 1;
  CLOSED = 2;

  private eventListeners: { [key: string]: ((event: any) => void)[] } = {};

  constructor(url: string) {
    this.url = url;
    // Simulate connection delay
    setTimeout(() => {
      this.readyState = this.OPEN;
      this.triggerEvent("connected", { message: "SSE connection established" });
    }, 10);
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type].filter(
        (l) => l !== listener
      );
    }
  }

  close() {
    this.readyState = this.CLOSED;
  }

  // Test helper to trigger events
  triggerEvent(type: string, data: any) {
    if (this.eventListeners[type]) {
      const event = {
        type,
        data: JSON.stringify(data),
        target: this,
      };
      this.eventListeners[type].forEach((listener) => listener(event));
    }
  }

  // Test helper to trigger error
  triggerError() {
    if (this.eventListeners["error"]) {
      const event = { type: "error", target: this };
      this.eventListeners["error"].forEach((listener) => listener(event));
    }
  }
}

// Replace global EventSource with mock
(global as any).EventSource = MockEventSource;

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
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("should not connect when no displayId is provided", () => {
    const { result } = renderHook(() => useDisplaySSE(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isConnected).toBe(false);
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("SSE connected to display")
    );
  });

  it("should not connect when enabled is false", () => {
    const { result } = renderHook(() => useDisplaySSE("display1", false), {
      wrapper: createWrapper(),
    });

    expect(result.current.isConnected).toBe(false);
  });

  it("should establish SSE connection for specific displayId", async () => {
    const displayId = "display1";
    const { result } = renderHook(() => useDisplaySSE(displayId, true), {
      wrapper: createWrapper(),
    });

    expect(result.current.isConnected).toBe(false);

    // Fast-forward timers to allow connection
    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      `SSE connected to display ${displayId}`
    );
  });

  it("should create EventSource with correct URL", () => {
    const displayId = "display1";
    const OriginalEventSource = (global as any).EventSource;
    const mockEventSource = jest
      .fn()
      .mockImplementation((url) => new OriginalEventSource(url));
    (global as any).EventSource = mockEventSource;

    renderHook(() => useDisplaySSE(displayId, true), {
      wrapper: createWrapper(),
    });

    expect(mockEventSource).toHaveBeenCalledWith(
      `/api/v1/displays/${displayId}/events`
    );

    // Restore
    (global as any).EventSource = OriginalEventSource;
  });

  it("should process display_updated events only for matching displayId", async () => {
    const displayId = "display1";
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const invalidateQueriesSpy = jest.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      );

    const { result } = renderHook(() => useDisplaySSE(displayId, true), {
      wrapper,
    });

    // Wait for connection
    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Get the EventSource instance to trigger events
    const eventSource =
      (global as any).EventSource.mock?.results?.[0]?.value ||
      new MockEventSource(`/api/v1/displays/${displayId}/events`);

    // Trigger event for correct displayId
    act(() => {
      eventSource.triggerEvent("display_updated", {
        displayId: displayId,
        action: "update",
      });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["display", displayId],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["displays"],
    });

    invalidateQueriesSpy.mockClear();

    // Trigger event for wrong displayId
    act(() => {
      eventSource.triggerEvent("display_updated", {
        displayId: "wrong-display",
        action: "update",
      });
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      `Received event for wrong display: expected ${displayId}, got wrong-display`
    );
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it("should handle different display actions correctly", async () => {
    const displayId = "display1";
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const invalidateQueriesSpy = jest.spyOn(queryClient, "invalidateQueries");
    const removeQueriesSpy = jest.spyOn(queryClient, "removeQueries");

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      );

    const { result } = renderHook(() => useDisplaySSE(displayId, true), {
      wrapper,
    });

    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const eventSource = new MockEventSource(
      `/api/v1/displays/${displayId}/events`
    );

    // Test create action
    act(() => {
      eventSource.triggerEvent("display_updated", {
        displayId: displayId,
        action: "create",
      });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["displays"],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["display", displayId],
    });

    invalidateQueriesSpy.mockClear();

    // Test update action
    act(() => {
      eventSource.triggerEvent("display_updated", {
        displayId: displayId,
        action: "update",
      });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["display", displayId],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["displays"],
    });

    invalidateQueriesSpy.mockClear();

    // Test delete action
    act(() => {
      eventSource.triggerEvent("display_updated", {
        displayId: displayId,
        action: "delete",
      });
    });

    expect(removeQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["display", displayId],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["displays"],
    });
  });

  it("should handle unknown action gracefully", async () => {
    const displayId = "display1";
    const { result } = renderHook(() => useDisplaySSE(displayId, true), {
      wrapper: createWrapper(),
    });

    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const eventSource = new MockEventSource(
      `/api/v1/displays/${displayId}/events`
    );

    act(() => {
      eventSource.triggerEvent("display_updated", {
        displayId: displayId,
        action: "unknown_action",
      });
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Unknown display action: unknown_action"
    );
  });

  it("should handle connection errors and attempt reconnection", async () => {
    const displayId = "display1";
    const { result } = renderHook(() => useDisplaySSE(displayId, true), {
      wrapper: createWrapper(),
    });

    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const eventSource = new MockEventSource(
      `/api/v1/displays/${displayId}/events`
    );

    // Trigger error
    act(() => {
      eventSource.triggerError();
    });

    expect(result.current.isConnected).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `SSE connection error for display ${displayId}:`,
      expect.any(Object)
    );

    // Should attempt reconnection
    expect(consoleLogSpy).toHaveBeenCalledWith(
      `Attempting to reconnect SSE for display ${displayId} (attempt 1)`
    );
  });

  it("should provide reconnect function", async () => {
    const displayId = "display1";
    const { result } = renderHook(() => useDisplaySSE(displayId, true), {
      wrapper: createWrapper(),
    });

    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.reconnect();
    });

    expect(result.current.isConnected).toBe(false);

    // Should reconnect
    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("should provide disconnect function", async () => {
    const displayId = "display1";
    const { result } = renderHook(() => useDisplaySSE(displayId, true), {
      wrapper: createWrapper(),
    });

    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
  });

  it("should cleanup connection on unmount", async () => {
    const displayId = "display1";
    const { result, unmount } = renderHook(
      () => useDisplaySSE(displayId, true),
      {
        wrapper: createWrapper(),
      }
    );

    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    unmount();

    expect(result.current.isConnected).toBe(false);
  });

  it("should handle displayId changes", async () => {
    const { result, rerender } = renderHook(
      ({ displayId }) => useDisplaySSE(displayId, true),
      {
        wrapper: createWrapper(),
        initialProps: { displayId: "display1" },
      }
    );

    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Change displayId
    rerender({ displayId: "display2" });

    // Should disconnect old and connect to new
    expect(result.current.isConnected).toBe(false);

    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "SSE connected to display display2"
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
