# Memory Leak Fixes and Prevention

## Issues Identified and Fixed

### 1. **React Query DevTools Chunk Loading Error** ✅ FIXED

**Problem:** ReactQueryDevtools was causing chunk loading errors and memory leaks
**Root Cause:** Multiple imports and lazy loading conflicts
**Solution:**

- Completely removed `@tanstack/react-query-devtools` package
- Removed all imports from `pages/_app.tsx` and `app/providers.tsx`
- Eliminated lazy loading that was causing chunk errors

**Files Modified:**

- `pages/_app.tsx` - Removed ReactQueryDevtools import and usage
- `app/providers.tsx` - Removed ReactQueryDevtools import and usage
- `package.json` - Uninstalled @tanstack/react-query-devtools

### 2. **Duplicate EventSource Connections** ✅ FIXED

**Problem:** Multiple SSE connections to the same endpoint causing memory leaks
**Root Cause:** Both `useDisplayStatus` and `useGlobalDisplaySSE` were creating connections to `/api/v1/displays/events`
**Solution:**

- Removed duplicate EventSource creation in `useDisplayStatus`
- Centralized SSE management through `useGlobalDisplaySSE`
- Prevented connection conflicts and resource waste

**Files Modified:**

- `hooks/useDisplayStatus.ts` - Removed duplicate EventSource connection

### 3. **useEffect Dependency Issues** ✅ FIXED

**Problem:** Infinite re-renders due to unstable dependencies in useEffect hooks
**Root Cause:** Functions in dependency arrays were being recreated on every render
**Solution:**

- Removed `fetchDisplayHeartbeats` from useEffect dependencies in `useLayoutDisplayStatus`
- Removed `fetchDisplayStatuses` from useEffect dependencies in `useDisplayStatus`
- Added proper dependency management for stable callbacks

**Files Modified:**

- `hooks/useLayoutDisplayStatus.ts` - Fixed useEffect dependencies
- `hooks/useDisplayStatus.ts` - Fixed useEffect dependencies

### 4. **React Query Retry Loops** ✅ FIXED

**Problem:** Infinite retry loops on network errors causing memory buildup
**Root Cause:** Default retry behavior was retrying network errors indefinitely
**Solution:**

- Added custom retry logic to detect network errors (`ERR_NETWORK`, `Failed to fetch`)
- Implemented exponential backoff with maximum retry limits
- Prevented retries on 4xx client errors

**Files Modified:**

- `app/providers.tsx` - Enhanced QueryClient with better retry logic
- `pages/_app.tsx` - Enhanced QueryClient with better retry logic
- `hooks/useDisplayStatus.ts` - Added network error detection
- `hooks/useLayoutDisplayStatus.ts` - Added network error detection

### 5. **Interval and Timeout Cleanup** ✅ VERIFIED

**Problem:** Potential memory leaks from uncleaned intervals and timeouts
**Solution:** Verified all intervals and timeouts have proper cleanup

- All `setInterval` calls have corresponding `clearInterval` in cleanup functions
- All `setTimeout` calls have proper cleanup in SSE hooks
- EventSource connections are properly closed in cleanup functions

## Memory Leak Prevention Best Practices Implemented

### 1. **EventSource Management**

```typescript
// ✅ Good: Proper cleanup
useEffect(() => {
  const eventSource = new EventSource(url);

  return () => {
    eventSource.close(); // Always cleanup
  };
}, []);

// ❌ Bad: No cleanup
useEffect(() => {
  const eventSource = new EventSource(url);
  // Missing cleanup - memory leak!
}, []);
```

### 2. **Interval Management**

```typescript
// ✅ Good: Proper cleanup
useEffect(() => {
  const interval = setInterval(callback, delay);

  return () => {
    clearInterval(interval); // Always cleanup
  };
}, []);
```

### 3. **React Query Configuration**

```typescript
// ✅ Good: Network error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry network errors
        if (error.message.includes("ERR_NETWORK")) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
```

### 4. **useEffect Dependencies**

```typescript
// ✅ Good: Stable dependencies
const stableCallback = useCallback(() => {
  // logic
}, []); // Empty deps = stable

useEffect(() => {
  stableCallback();
}, [stableCallback]); // Won't cause infinite loops

// ❌ Bad: Unstable dependencies
const unstableCallback = () => {
  // logic - recreated every render
};

useEffect(() => {
  unstableCallback();
}, [unstableCallback]); // Infinite loop!
```

## Monitoring and Detection

### 1. **Browser DevTools Monitoring**

- **Memory Tab**: Monitor heap size growth over time
- **Network Tab**: Check for excessive API calls or failed requests
- **Console**: Watch for error patterns and retry loops

### 2. **React DevTools Profiler**

- Monitor component re-render frequency
- Identify components with excessive updates
- Check for unnecessary effect executions

### 3. **Application Metrics**

- Monitor EventSource connection count
- Track API request frequency
- Watch for memory usage patterns

## Testing Memory Leaks

### 1. **Manual Testing Steps**

1. Open browser DevTools → Memory tab
2. Take initial heap snapshot
3. Navigate through the application
4. Perform actions (create displays, refresh status, etc.)
5. Take another heap snapshot
6. Compare memory usage - should not grow indefinitely

### 2. **Automated Testing**

```typescript
// Example test for proper cleanup
test("should cleanup EventSource on unmount", () => {
  const { unmount } = render(<ComponentWithSSE />);

  // Verify EventSource is created
  expect(EventSource).toHaveBeenCalled();

  // Unmount component
  unmount();

  // Verify EventSource.close() was called
  expect(mockEventSource.close).toHaveBeenCalled();
});
```

## Current Status

### ✅ Fixed Issues

- React Query DevTools chunk loading errors
- Duplicate EventSource connections
- Infinite useEffect loops
- Retry loop memory leaks
- Missing cleanup functions

### ✅ Verified Clean

- All SSE connections have proper cleanup
- All intervals have proper cleanup
- All timeouts have proper cleanup
- React Query has proper error handling
- No more duplicate API calls

### 🔍 Monitoring Points

- Watch for new EventSource connections
- Monitor React Query cache size
- Check for new useEffect dependency issues
- Verify proper cleanup in new components

## Performance Improvements

### Before Fixes

- Multiple EventSource connections to same endpoint
- Infinite retry loops on network errors
- React Query DevTools causing chunk errors
- useEffect dependency loops causing excessive re-renders

### After Fixes

- Single EventSource connection per endpoint
- Smart retry logic with network error detection
- No DevTools overhead in production
- Stable useEffect dependencies preventing unnecessary updates

## Recommendations for Future Development

1. **Always add cleanup functions** for side effects (EventSource, intervals, timeouts)
2. **Use stable dependencies** in useEffect hooks
3. **Implement proper error handling** for network requests
4. **Avoid duplicate connections** to the same endpoints
5. **Test memory usage** during development
6. **Monitor production metrics** for memory leaks
7. **Use React DevTools Profiler** to identify performance issues

## Emergency Debugging

If memory leaks reoccur:

1. **Check EventSource connections**: `document.querySelectorAll('*')` in console
2. **Monitor React Query cache**: Use React Query DevTools (in dev only)
3. **Check for infinite loops**: Look for rapidly repeating console logs
4. **Verify cleanup functions**: Ensure all useEffect hooks return cleanup functions
5. **Test component unmounting**: Verify proper cleanup on navigation

This comprehensive fix should eliminate all memory leaks and prevent future issues.
