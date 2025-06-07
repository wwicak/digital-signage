# Display State Management Analysis & Proposed Solution

## Executive Summary

The digital signage system currently uses a hybrid approach combining React Context ([`DisplayContext.tsx`](contexts/DisplayContext.tsx:1)) with TanStack Query for display state management. While functional for single display editing, the current architecture lacks a robust global state for managing the display list across all UI components, leading to inconsistent updates when displays are added, modified, or deleted.

## Current State Management Architecture

### 1. Data Fetching & API Layer

**Current Implementation:**

- **SSE Manager:** [`api/sse_manager.ts`](api/sse_manager.ts:1) manages Server-Sent Events for real-time communication

### 2. State Management Layers

**DisplayContext (Single Display Management):**

- **Location:** [`contexts/DisplayContext.tsx`](contexts/DisplayContext.tsx:1)
- **Purpose:** Manages state for a single display's editing session
- **Technology:** React Context + useReducer + TanStack Query
- **Scope:** Single display operations (widgets, layout, status bar)
- **Strengths:** Well-architected for single display editing with optimistic updates and debounced persistence

**Component-Level State (Display List Management):**

- **Location:** [`components/Admin/ScreenList.tsx`](components/Admin/ScreenList.tsx:1)
- **Implementation:** Class component with local state
- **Data Fetching:** Direct API calls in `componentDidMount` and manual refresh
- **Scope:** Display list rendering and basic CRUD operations

**Sidebar Display List:**

- **Location:** [`components/Admin/Sidebar.tsx`](components/Admin/Sidebar.tsx:1)
- **Implementation:** Functional component with `useState`
- **Data Fetching:** `useEffect` with `getDisplays()` call
- **Scope:** Navigation dropdown display list

### 3. Current Data Flow Issues

1. **Fragmented State:** Display list data is duplicated across multiple components
2. **Manual Refresh Required:** After display creation/deletion, components require manual refresh calls
3. **No Global Reactivity:** Changes in one component don't automatically update others
4. **Inconsistent Patterns:** Mix of class components, functional components, and different state management approaches

## Proposed Global State Solution

### Recommended Architecture: Enhanced TanStack Query + Custom Hooks

**Justification:**

- **Leverage Existing Infrastructure:** TanStack Query is already integrated and well-configured
- **Server State Specialization:** TanStack Query excels at server state management with caching, synchronization, and background updates
- **Minimal Migration Impact:** Can be implemented incrementally without breaking existing functionality
- **SSE Integration:** Can be enhanced to work seamlessly with existing SSE infrastructure

### Implementation Plan

#### Phase 1: Global Display List Store

```typescript
// hooks/useDisplays.ts - New global displays hook
export const useDisplays = () => {
  return useQuery({
    queryKey: ["displays"],
    queryFn: () => getDisplays(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

// hooks/useDisplayMutations.ts - Centralized mutations
export const useCreateDisplay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addDisplay,
    onSuccess: (newDisplay) => {
      // Update displays list cache
      queryClient.setQueryData(["displays"], (old: IDisplayData[]) =>
        old ? [...old, newDisplay] : [newDisplay]
      );
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["displays"] });
    },
  });
};

export const useDeleteDisplay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDisplay,
    onSuccess: (_, deletedId) => {
      // Optimistically update displays list
      queryClient.setQueryData(
        ["displays"],
        (old: IDisplayData[]) =>
          old?.filter((display) => display._id !== deletedId) || []
      );
      // Remove individual display cache
      queryClient.removeQueries({ queryKey: ["display", deletedId] });
    },
  });
};
```

#### Phase 2: Enhanced DisplayContext Integration

```typescript
// contexts/DisplayContext.tsx - Enhanced integration
export const DisplayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(displayReducer, initialState);
  const queryClient = useQueryClient();

  // Enhanced mutation with global list updates
  const updateDisplayMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IDisplayData> }) =>
      updateDisplay(id, data),
    onSuccess: (updatedDisplay, variables) => {
      // Update individual display cache
      queryClient.setQueryData(["display", variables.id], updatedDisplay);

      // Update displays list cache
      queryClient.setQueryData(
        ["displays"],
        (old: IDisplayData[]) =>
          old?.map((display) =>
            display._id === variables.id ? updatedDisplay : display
          ) || []
      );
    },
  });

  // ... rest of implementation
};
```

#### Phase 3: SSE Integration for Real-time Updates

```typescript
// hooks/useDisplaySSE.ts - Real-time updates hook
export const useDisplaySSE = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource("/api/v1/display/events");

    eventSource.addEventListener("display_updated", (event) => {
      const { displayId, action } = JSON.parse(event.data);

      switch (action) {
        case "create":
        case "update":
          // Invalidate displays list to fetch fresh data
          queryClient.invalidateQueries({ queryKey: ["displays"] });
          queryClient.invalidateQueries({ queryKey: ["display", displayId] });
          break;
        case "delete":
          // Remove from cache
          queryClient.setQueryData(
            ["displays"],
            (old: IDisplayData[]) =>
              old?.filter((display) => display._id !== displayId) || []
          );
          queryClient.removeQueries({ queryKey: ["display", displayId] });
          break;
      }
    });

    return () => eventSource.close();
  }, [queryClient]);
};
```

#### Phase 4: Component Migration

**ScreenList Component Migration:**

```typescript
// components/Admin/ScreenList.tsx - Converted to functional component
const ScreenList: React.FC<IScreenListProps> = () => {
  const { data: displays, isLoading, error } = useDisplays();
  const deleteDisplayMutation = useDeleteDisplay();

  // Remove manual refresh logic - handled by global state

  return (
    <div className="list">
      {displays?.map((display, index) => (
        <ScreenCard
          key={display._id}
          value={display}
          onDelete={() => deleteDisplayMutation.mutate(display._id)}
        />
      ))}
      {/* Loading and error states */}
    </div>
  );
};
```

**Sidebar Component Enhancement:**

```typescript
// components/Admin/Sidebar.tsx - Use global displays
const Sidebar: React.FC<ISidebarProps> = ({ router, loggedIn, displayId }) => {
  const { data: displays = [] } = useDisplays();
  const context = useDisplayContext();

  // Remove local state and useEffect - use global state
  const dropdownChoices: IDropdownChoice[] = displays.map((d) => ({
    key: d._id,
    name: d.name,
  }));

  // ... rest of component
};
```

### Benefits of This Approach

1. **Unified State Management:** Single source of truth for display list data
2. **Automatic Synchronization:** All components automatically reflect changes
3. **Optimistic Updates:** Immediate UI feedback with server reconciliation
4. **Real-time Capabilities:** SSE integration for multi-user scenarios
5. **Performance Optimization:** Intelligent caching and background updates
6. **Type Safety:** Full TypeScript support with existing interfaces
7. **Incremental Migration:** Can be implemented component by component

### Implementation Timeline

**Week 1-2: Foundation**

- Create global display hooks (`useDisplays`, `useDisplayMutations`)
- Enhance existing DisplayContext for better integration
- Set up SSE integration hook

**Week 3-4: Component Migration**

- Migrate ScreenList to use global state
- Update Sidebar to use global displays
- Update any other components consuming display lists

**Week 5: Integration & Testing**

- Comprehensive testing of state synchronization
- Performance optimization
- SSE event handling validation

### Risk Assessment & Mitigation

**Potential Risks:**

1. **Breaking Changes:** Existing components might break during migration
2. **Performance Impact:** Increased re-renders if not properly optimized
3. **SSE Reliability:** Network issues could affect real-time updates

**Mitigation Strategies:**

1. **Incremental Migration:** Implement feature flags for gradual rollout
2. **Comprehensive Testing:** Unit and integration tests for all state transitions
3. **Fallback Mechanisms:** Graceful degradation when SSE fails
4. **Performance Monitoring:** React DevTools profiling during development

## Conclusion

The proposed solution leverages the existing TanStack Query infrastructure while providing a robust, scalable foundation for global display state management. This approach ensures consistent UI updates across all components while maintaining the performance benefits of intelligent caching and real-time synchronization capabilities.

The implementation can be done incrementally with minimal disruption to existing functionality, making it a low-risk, high-reward enhancement to the current architecture.
