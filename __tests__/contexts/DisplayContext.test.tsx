import React, { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react-hooks'; // For testing hooks
import { useDisplayContext, DisplayProvider } from '../../contexts/DisplayContext'; // Adjust path
import * as displayActions from '../../actions/display'; // To mock updateDisplay

// --- Reducer and Types (copied from DisplayContext.tsx for testing) ---
interface IWidget { _id: string; name: string; type: string; x: number; y: number; w: number; h: number; data: any; }
interface IStatusBar { enabled?: boolean; color?: string; elements?: string[]; }

interface DisplayState {
  id: string | null;
  name: string | null;
  layout: "spaced" | "compact" | null;
  statusBar: IStatusBar;
  widgets: IWidget[];
  currentPageData?: Record<string, any>;
}

type DisplayAction =
  | { type: 'SET_DISPLAY_DATA'; payload: displayActions.IDisplayData }
  | { type: 'SET_ID'; payload: string | null }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_LAYOUT'; payload: "spaced" | "compact" }
  | { type: 'SET_STATUS_BAR'; payload: IStatusBar }
  | { type: 'SET_WIDGETS'; payload: IWidget[] }
  | { type: 'ADD_STATUS_BAR_ITEM'; payload: string } // Assuming payload is string for simplicity
  | { type: 'REMOVE_STATUS_BAR_ITEM'; payload: number }
  | { type: 'REORDER_STATUS_BAR_ITEMS'; payload: { startIndex: number; endIndex: number } }
  | { type: 'UPDATE_CURRENT_PAGE_WIDGET_DATA'; payload: { widgetId: string; data: any } };

const initialDisplayState: DisplayState = {
  id: null, name: null, layout: null,
  statusBar: { enabled: false, elements: [] },
  widgets: [], currentPageData: {},
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
        currentPageData: action.payload.currentPageData || {}, // Ensure this line exists and is correct
      };
    case 'UPDATE_CURRENT_PAGE_WIDGET_DATA':
      return {
        ...state,
        currentPageData: {
          ...(state.currentPageData || {}), // Ensure existing data is spread
          [action.payload.widgetId]: action.payload.data,
        },
      };
    // Other actions from the actual reducer...
    case 'SET_ID': return { ...state, id: action.payload };
    case 'SET_NAME': return { ...state, name: action.payload };
    default: return state;
  }
}
// --- End of copied Reducer and Types ---

// Mock displayActions.updateDisplay
jest.mock('../../actions/display', () => ({
  ...jest.requireActual('../../actions/display'), // Keep other exports
  getDisplay: jest.fn(), // Mock getDisplay as it's used in context's useEffect
  updateDisplay: jest.fn(), // This is what updateDisplayThrottled will call
}));

const mockUpdateDisplay = displayActions.updateDisplay as jest.Mock;
const mockGetDisplay = displayActions.getDisplay as jest.Mock;


describe('DisplayContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUpdateDisplay.mockClear();
    mockGetDisplay.mockResolvedValue({ _id: 'display1', name: 'Mocked Display', widgets: [], currentPageData: {} }); // Default mock for getDisplay
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('displayReducer', () => {
    it('should handle SET_DISPLAY_DATA and initialize currentPageData if missing', () => {
      const payload: displayActions.IDisplayData = { _id: 'd1', name: 'Test' /* no currentPageData */ };
      const newState = displayReducer(initialDisplayState, { type: 'SET_DISPLAY_DATA', payload });
      expect(newState.currentPageData).toEqual({});
    });

    it('should handle SET_DISPLAY_DATA with provided currentPageData', () => {
      const cpData = { widget1: 'data' };
      const payload: displayActions.IDisplayData = { _id: 'd1', name: 'Test', currentPageData: cpData };
      const newState = displayReducer(initialDisplayState, { type: 'SET_DISPLAY_DATA', payload });
      expect(newState.currentPageData).toEqual(cpData);
    });

    it('UPDATE_CURRENT_PAGE_WIDGET_DATA - should add data for a new widgetId', () => {
      const stateWithEmptyCp = { ...initialDisplayState, id: 'd1', currentPageData: {} };
      const action: DisplayAction = { type: 'UPDATE_CURRENT_PAGE_WIDGET_DATA', payload: { widgetId: 'w1', data: 'testData' } };
      const newState = displayReducer(stateWithEmptyCp, action);
      expect(newState.currentPageData).toEqual({ w1: 'testData' });
    });

    it('UPDATE_CURRENT_PAGE_WIDGET_DATA - should update data for an existing widgetId', () => {
      const stateWithExistingCp = { ...initialDisplayState, id: 'd1', currentPageData: { w1: 'oldData', w2: 'otherData' } };
      const action: DisplayAction = { type: 'UPDATE_CURRENT_PAGE_WIDGET_DATA', payload: { widgetId: 'w1', data: 'newData' } };
      const newState = displayReducer(stateWithExistingCp, action);
      expect(newState.currentPageData).toEqual({ w1: 'newData', w2: 'otherData' });
    });

    it('UPDATE_CURRENT_PAGE_WIDGET_DATA - should add to existing data, preserving other widgets', () => {
      const stateWithExistingCp = { ...initialDisplayState, id: 'd1', currentPageData: { wOld: 'oldStuff' } };
      const action: DisplayAction = { type: 'UPDATE_CURRENT_PAGE_WIDGET_DATA', payload: { widgetId: 'wNew', data: 'newStuff' } };
      const newState = displayReducer(stateWithExistingCp, action);
      expect(newState.currentPageData).toEqual({ wOld: 'oldStuff', wNew: 'newStuff' });
    });
     it('UPDATE_CURRENT_PAGE_WIDGET_DATA - should work if initial currentPageData is undefined', () => {
      const stateWithoutCp = { ...initialDisplayState, id: 'd1', currentPageData: undefined };
      const action: DisplayAction = { type: 'UPDATE_CURRENT_PAGE_WIDGET_DATA', payload: { widgetId: 'w1', data: 'testData' } };
      const newState = displayReducer(stateWithoutCp, action);
      expect(newState.currentPageData).toEqual({ w1: 'testData' });
    });
  });

  describe('updateCurrentPageWidgetData function', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DisplayProvider>{children}</DisplayProvider>
    );

    it('should dispatch UPDATE_CURRENT_PAGE_WIDGET_DATA and call updateDisplayThrottled', async () => {
      // Mock getDisplay to set an ID so updateDisplayThrottled can run
      mockGetDisplay.mockResolvedValueOnce({ _id: 'testDisplayId', name: 'Test', currentPageData: {} });

      const { result, waitForNextUpdate } = renderHook(() => useDisplayContext(), { wrapper });

      // Set an ID for the display context to simulate a loaded display
      await act(async () => {
        await result.current.setId('testDisplayId'); // setId fetches and sets data
      });

      // Ensure initial state is as expected (currentPageData is empty object)
      expect(result.current.state.currentPageData).toEqual({});
      expect(result.current.currentPageData).toEqual({}); // Also check the direct context value

      const widgetId = 'widget1';
      const widgetData = { setting: 'value' };

      act(() => {
        result.current.updateCurrentPageWidgetData(widgetId, widgetData);
      });

      // Check local state update (via reducer)
      expect(result.current.state.currentPageData).toEqual({ [widgetId]: widgetData });
      expect(result.current.currentPageData).toEqual({ [widgetId]: widgetData });


      // Fast-forward timers to trigger the debounced updateDisplay
      act(() => {
        jest.runAllTimers(); // Or jest.advanceTimersByTime(300) if debounce time is 300ms
      });

      // Check that updateDisplay (mocked) was called by updateDisplayThrottled
      await waitFor(() => {
          expect(mockUpdateDisplay).toHaveBeenCalledTimes(1);
      });
      expect(mockUpdateDisplay).toHaveBeenCalledWith('testDisplayId', {
        currentPageData: { [widgetId]: widgetData },
      });
    });

    it('updateCurrentPageWidgetData should merge with existing data before sending to backend', async () => {
        mockGetDisplay.mockResolvedValueOnce({ _id: 'testDisplayId', name: 'Test', currentPageData: { existingWidget: "oldData" } });
        const { result, waitForNextUpdate } = renderHook(() => useDisplayContext(), { wrapper });
        await act(async () => { await result.current.setId('testDisplayId'); });

        expect(result.current.currentPageData).toEqual({ existingWidget: "oldData" });

        const widgetId = 'newWidget';
        const widgetData = { setting: 'newValue' };

        act(() => {
            result.current.updateCurrentPageWidgetData(widgetId, widgetData);
        });

        // Local state is updated immediately
        expect(result.current.currentPageData).toEqual({
            existingWidget: "oldData",
            [widgetId]: widgetData,
        });

        act(() => { jest.runAllTimers(); });

        await waitFor(() => { expect(mockUpdateDisplay).toHaveBeenCalledTimes(1); });
        expect(mockUpdateDisplay).toHaveBeenCalledWith('testDisplayId', {
            currentPageData: {
                existingWidget: "oldData",
                [widgetId]: widgetData,
            },
        });
    });
  });
});
