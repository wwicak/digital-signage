import React, { createContext, useContext, useReducer, useCallback } from 'react';
import _ from 'lodash';
import shortid from 'shortid';
import { useDisplay, useUpdateDisplay } from '../hooks/useDisplay';
import { IDisplayData } from '../actions/display';

// Types
interface IWidget {
  _id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  data: any;
}

interface IStatusBar {
  enabled?: boolean;
  color?: string;
  elements?: string[];
}

interface DisplayState {
  id: string | null;
  name: string | null;
  layout: "spaced" | "compact" | null;
  statusBar: IStatusBar;
  widgets: IWidget[];
}

type DisplayAction =
  | { type: 'SET_DISPLAY_DATA'; payload: IDisplayData }
  | { type: 'SET_ID'; payload: string | null }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_LAYOUT'; payload: "spaced" | "compact" }
  | { type: 'SET_STATUS_BAR'; payload: IStatusBar }
  | { type: 'ADD_STATUS_BAR_ITEM'; payload: string }
  | { type: 'REMOVE_STATUS_BAR_ITEM'; payload: number }
  | { type: 'REORDER_STATUS_BAR_ITEMS'; payload: { startIndex: number; endIndex: number } };

const initialState: DisplayState = {
  id: null,
  name: null,
  layout: null,
  statusBar: { enabled: false, elements: [] },
  widgets: [],
};

function displayReducer(state: DisplayState, action: DisplayAction): DisplayState {
  switch (action.type) {
    case 'SET_DISPLAY_DATA':
      return {
        ...state,
        id: action.payload._id || state.id,
        name: action.payload.name || null,
        layout: action.payload.layout || null,
        statusBar: action.payload.statusBar || { enabled: false, elements: [] },
        widgets: action.payload.widgets || [],
      };
    case 'SET_ID':
      return { ...state, id: action.payload };
    case 'SET_NAME':
      return { ...state, name: action.payload };
    case 'SET_LAYOUT':
      return { ...state, layout: action.payload };
    case 'SET_STATUS_BAR':
      return { ...state, statusBar: action.payload };
    case 'ADD_STATUS_BAR_ITEM':
      const newElements = [...(state.statusBar.elements || []), action.payload + "_" + shortid.generate()];
      return {
        ...state,
        statusBar: { ...state.statusBar, elements: newElements },
      };
    case 'REMOVE_STATUS_BAR_ITEM':
      const elements = state.statusBar.elements || [];
      const filteredElements = [...elements.slice(0, action.payload), ...elements.slice(action.payload + 1)];
      return {
        ...state,
        statusBar: { ...state.statusBar, elements: filteredElements },
      };
    case 'REORDER_STATUS_BAR_ITEMS':
      const { startIndex, endIndex } = action.payload;
      const reorderElements = Array.from(state.statusBar.elements || []);
      const [removed] = reorderElements.splice(startIndex, 1);
      reorderElements.splice(endIndex, 0, removed);
      return {
        ...state,
        statusBar: { ...state.statusBar, elements: reorderElements },
      };
    default:
      return state;
  }
}

interface DisplayContextType {
  state: DisplayState;
  setId: (id: string) => void;
  setName: (name: string) => void;
  updateName: (name: string) => void;
  updateLayout: (layout: "spaced" | "compact") => void;
  addStatusBarItem: (type: string) => void;
  removeStatusBarItem: (index: number) => void;
  reorderStatusBarItems: (startIndex: number, endIndex: number) => void;
  isLoading: boolean;
  error: any;
}

const DisplayContext = createContext<DisplayContextType | undefined>(undefined);

export const DisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(displayReducer, initialState);
  const updateDisplayMutation = useUpdateDisplay();
  
  // Use TanStack Query to fetch display data
  const { data: displayData, isLoading, error } = useDisplay(state.id);

  // Update local state when display data changes
  React.useEffect(() => {
    if (displayData) {
      dispatch({ type: 'SET_DISPLAY_DATA', payload: displayData });
    }
  }, [displayData]);

  // Throttled update function
  const updateDisplayThrottled = useCallback(
    _.debounce((id: string, data: Partial<IDisplayData>) => {
      updateDisplayMutation.mutate({ id, data });
    }, 300),
    [updateDisplayMutation]
  );

  const setId = useCallback((id: string) => {
    dispatch({ type: 'SET_ID', payload: id });
  }, []);

  const setName = useCallback((name: string) => {
    if (!name) return;
    dispatch({ type: 'SET_NAME', payload: name });
  }, []);

  const updateName = useCallback((name: string) => {
    if (!name || !state.id) return;
    dispatch({ type: 'SET_NAME', payload: name });
    updateDisplayThrottled(state.id, { name });
  }, [state.id, updateDisplayThrottled]);

  const updateLayout = useCallback((layout: "spaced" | "compact") => {
    if (!layout || !["spaced", "compact"].includes(layout) || !state.id) return;
    dispatch({ type: 'SET_LAYOUT', payload: layout });
    updateDisplayThrottled(state.id, { layout });
  }, [state.id, updateDisplayThrottled]);

  const addStatusBarItem = useCallback((type: string) => {
    if (!state.id) return;
    dispatch({ type: 'ADD_STATUS_BAR_ITEM', payload: type });
    // Update will be handled by the reducer, then we sync with server
    const newElements = [...(state.statusBar.elements || []), type + "_" + shortid.generate()];
    const newStatusBar = { ...state.statusBar, elements: newElements };
    updateDisplayThrottled(state.id, { statusBar: newStatusBar });
  }, [state.id, state.statusBar, updateDisplayThrottled]);

  const removeStatusBarItem = useCallback((index: number) => {
    const elements = state.statusBar.elements || [];
    if (!state.id || index < 0 || index >= elements.length) return;
    
    dispatch({ type: 'REMOVE_STATUS_BAR_ITEM', payload: index });
    const newElements = [...elements.slice(0, index), ...elements.slice(index + 1)];
    const newStatusBar = { ...state.statusBar, elements: newElements };
    updateDisplayThrottled(state.id, { statusBar: newStatusBar });
  }, [state.id, state.statusBar, updateDisplayThrottled]);

  const reorderStatusBarItems = useCallback((startIndex: number, endIndex: number) => {
    const elements = state.statusBar.elements || [];
    if (!state.id || elements.length === 0) return;

    dispatch({ type: 'REORDER_STATUS_BAR_ITEMS', payload: { startIndex, endIndex } });
    const result = Array.from(elements);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    const newStatusBar = { ...state.statusBar, elements: result };
    updateDisplayThrottled(state.id, { statusBar: newStatusBar });
  }, [state.id, state.statusBar, updateDisplayThrottled]);

  const value: DisplayContextType = {
    state,
    setId,
    setName,
    updateName,
    updateLayout,
    addStatusBarItem,
    removeStatusBarItem,
    reorderStatusBarItems,
    isLoading,
    error,
  };

  return (
    <DisplayContext.Provider value={value}>
      {children}
    </DisplayContext.Provider>
  );
};

export const useDisplayContext = () => {
  const context = useContext(DisplayContext);
  if (context === undefined) {
    throw new Error('useDisplayContext must be used within a DisplayProvider');
  }
  return context;
};