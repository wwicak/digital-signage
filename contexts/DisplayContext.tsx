'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import _ from 'lodash'
import shortid from 'shortid'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDisplay, updateDisplay, IDisplayData } from '../actions/display'
import { WidgetData, WidgetType } from '../lib/models/Widget'

// Types - Display Widget interface for context (simpler than full IWidget model)
interface IDisplayWidget {
  _id: string;
  name: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  data: WidgetData;
}

interface IStatusBar {
  enabled?: boolean;
  color?: string;
  elements?: string[];
}

interface DisplayState {
  id: string | null;
  name: string | null;
  layout: string | null;
  orientation: 'landscape' | 'portrait' | null;
  statusBar: IStatusBar;
  widgets: IDisplayWidget[];
}

type DisplayAction =
  | { type: 'SET_DISPLAY_DATA'; payload: IDisplayData }
  | { type: 'SET_ID'; payload: string | null }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_LAYOUT'; payload: 'spaced' | 'compact' }
  | { type: 'SET_ORIENTATION'; payload: 'landscape' | 'portrait' }
  | { type: 'SET_STATUS_BAR'; payload: IStatusBar }
  | { type: 'SET_WIDGETS'; payload: IDisplayWidget[] }
  | { type: 'ADD_STATUS_BAR_ITEM'; payload: string }
  | { type: 'REMOVE_STATUS_BAR_ITEM'; payload: number }
  | { type: 'REORDER_STATUS_BAR_ITEMS'; payload: { startIndex: number; endIndex: number } };
const initialState: DisplayState = {
  id: null,
  name: null,
  layout: null,
  orientation: null,
  statusBar: { enabled: false, elements: [] },
  widgets: [],
}

function displayReducer(state: DisplayState, action: DisplayAction): DisplayState {
  switch (action.type) {
    case 'SET_DISPLAY_DATA':
      return {
        ...state,
        id: action.payload._id || state.id,
        name: action.payload.name || null,
        layout: action.payload.layout || null,
        orientation: action.payload.orientation || null,
        statusBar: action.payload.statusBar || { enabled: false, elements: [] },
        widgets: action.payload.widgets || [],
      }
    case 'SET_ID':
      return { ...state, id: action.payload }
    case 'SET_NAME':
      return { ...state, name: action.payload }
    case 'SET_LAYOUT':
      return { ...state, layout: action.payload }
    case 'SET_ORIENTATION':
      return { ...state, orientation: action.payload }
    case 'SET_STATUS_BAR':
      return { ...state, statusBar: action.payload }
    case 'SET_WIDGETS':
      return { ...state, widgets: action.payload }
    case 'ADD_STATUS_BAR_ITEM':
      const newElements = [...(state.statusBar.elements || []), action.payload + '_' + shortid.generate()]
      return {
        ...state,
        statusBar: { ...state.statusBar, elements: newElements },
      }
    case 'REMOVE_STATUS_BAR_ITEM':
      const elements = state.statusBar.elements || []
      const filteredElements = [...elements.slice(0, action.payload), ...elements.slice(action.payload + 1)]
      return {
        ...state,
        statusBar: { ...state.statusBar, elements: filteredElements },
      }
    case 'REORDER_STATUS_BAR_ITEMS':
      const { startIndex, endIndex } = action.payload
      const reorderElements = Array.from(state.statusBar.elements || [])
      const [removed] = reorderElements.splice(startIndex, 1)
      reorderElements.splice(endIndex, 0, removed)
      return {
        ...state,
        statusBar: { ...state.statusBar, elements: reorderElements },
      }
    default:
      return state
  }
}

interface DisplayContextType {
  state: DisplayState;
  setId: (id: string) => Promise<void>;
  setName: (name: string) => void;
  updateName: (name: string) => void;
  updateLayout: (layout: 'spaced' | 'compact') => void;
  updateOrientation: (orientation: 'landscape' | 'portrait') => void;
  updateWidgets: (widgets: IDisplayWidget[]) => void;
  addStatusBarItem: (type: string) => Promise<void>;
  removeStatusBarItem: (index: number) => void;
  reorderStatusBarItems: (startIndex: number, endIndex: number) => void;
  refreshDisplayData: () => void;
  isLoading: boolean;
  error: Error | null;
}

const DisplayContext = createContext<DisplayContextType | undefined>(undefined)
export const DisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(displayReducer, initialState)
  const queryClient = useQueryClient()
  
  // Debug logging for state changes
  React.useEffect(() => {
    console.log('[DEBUG] DisplayContext: State changed:', {
      id: state.id,
      name: state.name,
      widgetsCount: state.widgets.length
    })
  }, [state.id, state.name, state.widgets.length])
  // Use TanStack Query to fetch display data with optimized settings
  const { data: displayData, isLoading, error } = useQuery({
    queryKey: ['display', state.id],
    queryFn: () => getDisplay(state.id!),
    enabled: !!state.id,
    staleTime: 30 * 60 * 1000, // 30 minutes - much longer stale time to prevent repeated requests
    gcTime: 60 * 60 * 1000, // 60 minutes cache time
    retry: 1, // Reduce retry attempts
    refetchOnWindowFocus: false, // Disable refetch on window focus for digital signage
    refetchOnReconnect: false, // Disable refetch on reconnect to prevent loops
    refetchInterval: false, // Disable automatic refetching
    refetchIntervalInBackground: false, // Disable background refetching
  })
  // Enhanced mutation for updating display data with global list updates
  const updateDisplayMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IDisplayData> }) =>
      updateDisplay(id, data),
    onSuccess: (updatedDisplay, variables) => {
      // Update individual display cache
      queryClient.setQueryData(['display', variables.id], updatedDisplay)

      // Update displays list cache to ensure global state consistency
      queryClient.setQueryData(
        ['displays'],
        (old: IDisplayData[] | undefined) => {
          if (!old) return [updatedDisplay]
          return old.map((display) =>
            display._id === variables.id ? updatedDisplay : display
          )
        }
      )

      // Invalidate to ensure fresh data from server
      queryClient.invalidateQueries({ queryKey: ['display', variables.id] })
    },
  })

  // Update local state when display data changes
  React.useEffect(() => {
    if (displayData) {
      dispatch({ type: 'SET_DISPLAY_DATA', payload: displayData })
    }
  }, [displayData])

  // Throttled update function with proper cleanup
  const updateDisplayThrottled = useCallback(
    _.debounce((id: string, data: Partial<IDisplayData>) => {
      updateDisplayMutation.mutate({ id, data })
    }, 300),
    [updateDisplayMutation]
  )

  // Clean up debounced function when component unmounts or dependencies change
  React.useEffect(() => {
    return () => {
      updateDisplayThrottled.cancel()
    }
  }, [updateDisplayThrottled])

  const setId = useCallback(async (id: string): Promise<void> => {
    if (!id) {
      console.warn('[DEBUG] DisplayContext: setId called with empty/null ID')
      return
    }
    console.log(`[DEBUG] DisplayContext: Setting display ID to: ${id}`)
    dispatch({ type: 'SET_ID', payload: id })
    
    /*
     * No need to fetch data here - React Query will handle it automatically
     * when the queryKey changes due to the new ID
     */
  }, [])

  const setName = useCallback((name: string) => {
    if (!name) return
    dispatch({ type: 'SET_NAME', payload: name })
  }, [])

  const updateName = useCallback((name: string) => {
    if (!name || !state.id) return
    dispatch({ type: 'SET_NAME', payload: name })
    updateDisplayThrottled(state.id, { name })
  }, [state.id, updateDisplayThrottled])

  const updateLayout = useCallback((layout: 'spaced' | 'compact') => {
    if (!layout || !['spaced', 'compact'].includes(layout) || !state.id) return
    dispatch({ type: 'SET_LAYOUT', payload: layout })
    updateDisplayThrottled(state.id, { layout })
  }, [state.id, updateDisplayThrottled])

  const updateOrientation = useCallback((orientation: 'landscape' | 'portrait') => {
    if (!orientation || !['landscape', 'portrait'].includes(orientation) || !state.id) return
    dispatch({ type: 'SET_ORIENTATION', payload: orientation })
    updateDisplayThrottled(state.id, { orientation })
  }, [state.id, updateDisplayThrottled])

  const updateWidgets = useCallback((widgets: IDisplayWidget[]) => {
    if (!state.id) return
    dispatch({ type: 'SET_WIDGETS', payload: widgets })
    updateDisplayThrottled(state.id, { widgets })
  }, [state.id, updateDisplayThrottled])

  const addStatusBarItem = useCallback(async (type: string): Promise<void> => {
    if (!state.id) return Promise.resolve()

    dispatch({ type: 'ADD_STATUS_BAR_ITEM', payload: type })
    // Update will be handled by the reducer, then we sync with server
    const newElements = [...(state.statusBar.elements || []), type + '_' + shortid.generate()]
    const newStatusBar = { ...state.statusBar, elements: newElements }
    updateDisplayThrottled(state.id, { statusBar: newStatusBar })
    return Promise.resolve()
  }, [state.id, state.statusBar, updateDisplayThrottled])

  const removeStatusBarItem = useCallback((index: number) => {
    const elements = state.statusBar.elements || []
    if (!state.id || index < 0 || index >= elements.length) return
    
    dispatch({ type: 'REMOVE_STATUS_BAR_ITEM', payload: index })
    const newElements = [...elements.slice(0, index), ...elements.slice(index + 1)]
    const newStatusBar = { ...state.statusBar, elements: newElements }
    updateDisplayThrottled(state.id, { statusBar: newStatusBar })
  }, [state.id, state.statusBar, updateDisplayThrottled])

  const reorderStatusBarItems = useCallback((startIndex: number, endIndex: number) => {
    const elements = state.statusBar.elements || []
    if (!state.id || elements.length === 0) return

    dispatch({ type: 'REORDER_STATUS_BAR_ITEMS', payload: { startIndex, endIndex } })
    const result = Array.from(elements)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    const newStatusBar = { ...state.statusBar, elements: result }
    updateDisplayThrottled(state.id, { statusBar: newStatusBar })
  }, [state.id, state.statusBar, updateDisplayThrottled])

  // Add a method to refresh display data (for SSE usage)
  const refreshDisplayData = useCallback(() => {
    if (state.id) {
      queryClient.invalidateQueries({ queryKey: ['display', state.id] })
    }
  }, [state.id, queryClient])

  const value: DisplayContextType = {
    state,
    setId,
    setName,
    updateName,
    updateLayout,
    updateOrientation,
    updateWidgets,
    addStatusBarItem,
    removeStatusBarItem,
    reorderStatusBarItems,
    refreshDisplayData,
    isLoading,
    error,
  }

  return (
    <DisplayContext.Provider value={value}>
      {children}
    </DisplayContext.Provider>
  )
}

export const useDisplayContext = () => {
  const context = useContext(DisplayContext)
  if (context === undefined) {
    throw new Error('useDisplayContext must be used within a DisplayProvider')
  }
  return context
}