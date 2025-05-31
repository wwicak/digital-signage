import React from 'react';
import { render, act, screen, waitFor } from '@testing-library/react';
import Slideshow from './Slideshow'; // Adjust path as necessary
import { DisplayContext, DisplayContextType } from '../../../contexts/DisplayContext'; // Adjust path
import { getSlides, ISlideData } from '../../../actions/slide'; // Adjust path

// Mock the getSlides action
jest.mock('../../../actions/slide', () => ({
  getSlides: jest.fn(),
}));

// Mock the slide components to simplify testing
jest.mock('./Slide/Generic', () => () => <div data-testid="generic-slide">Generic Slide</div>);
jest.mock('./Slide/Photo', () => () => <div data-testid="photo-slide">Photo Slide</div>);
jest.mock('./Slide/Youtube', () => () => <div data-testid="youtube-slide">Youtube Slide</div>);
jest.mock('./Slide/Web', () => () => <div data-testid="web-slide">Web Slide</div>);

const mockGetSlides = getSlides as jest.Mock;

const mockSlides: ISlideData[] = [
  { _id: 's1', type: 'photo', data: {}, duration: 5, position: 0, name: 'Slide 1' },
  { _id: 's2', type: 'youtube', data: {}, duration: 5, position: 1, name: 'Slide 2' },
  { _id: 's3', type: 'web', data: {}, duration: 5, position: 2, name: 'Slide 3' },
];

describe('Slideshow Widget', () => {
  let mockUpdateCurrentPageWidgetData: jest.Mock;
  let mockContextValue: DisplayContextType;

  beforeEach(() => {
    jest.useFakeTimers();
    mockGetSlides.mockReset();
    mockUpdateCurrentPageWidgetData = jest.fn();

    // Default mock context value - can be overridden in tests
    mockContextValue = {
      // Provide default state and functions as needed by Slideshow, even if not directly tested
      state: {
        id: 'display1',
        name: 'Test Display',
        layout: 'spaced',
        statusBar: { enabled: true, elements: [] },
        widgets: [],
        currentPageData: {}, // Default to empty
      },
      setId: jest.fn(),
      setName: jest.fn(),
      updateName: jest.fn(),
      updateLayout: jest.fn(),
      updateWidgets: jest.fn(),
      addStatusBarItem: jest.fn(),
      removeStatusBarItem: jest.fn(),
      reorderStatusBarItems: jest.fn(),
      isLoading: false,
      error: null,
      currentPageData: {}, // Default to empty, will be overridden in specific tests
      updateCurrentPageWidgetData: mockUpdateCurrentPageWidgetData,
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const renderSlideshow = (contextValue: Partial<DisplayContextType> = {}, props: Partial<React.ComponentProps<typeof Slideshow>> = {}) => {
    const finalContextValue = { ...mockContextValue, ...contextValue };
    const defaultProps: React.ComponentProps<typeof Slideshow> = {
      widgetId: 'widget1',
      data: { slideshow_id: 'slideshow1' }, // Default props
      // Add other required props if any, or ensure they are optional
    };
    return render(
      <DisplayContext.Provider value={finalContextValue}>
        <Slideshow {...defaultProps} {...props} />
      </DisplayContext.Provider>
    );
  };

  test('should restore currentSlideIndex from currentPageData on mount', async () => {
    mockGetSlides.mockResolvedValue([...mockSlides]);
    const widgetId = 'widget123';
    const initialIndex = 2;
    const contextWithInitialData = {
      ...mockContextValue,
      currentPageData: { [widgetId]: initialIndex },
    };

    renderSlideshow(contextWithInitialData, { widgetId });

    await waitFor(() => expect(mockGetSlides).toHaveBeenCalledWith('slideshow1'));

    // Slideshow component uses slideRefs to call play/stop.
    // We need a way to inspect the currentSlideIndex or the effect of it.
    // Since play() is called on the slide ref, we'd ideally mock the slide instances.
    // For now, let's assume if it loads, the internal state is set.
    // A more robust test would involve spying on slideRef[initialIndex].play()
    // This test is more of an integration test for the state restoration logic.
    // We can check if the correct slide is "visible" if visibility is controlled by state.
    // The provided Slideshow component does not seem to have an easy way to inspect currentSlideIndex directly from outside.
    // However, the call to updateCurrentPageWidgetData on the *next* slide change will reveal the current index.

    // Let's advance the slide and see what index it reports
    act(() => {
      jest.advanceTimersByTime(6000); // Advance past the first slide's duration (5s) + buffer
    });

    await waitFor(() => {
      // The next slide index should be (initialIndex + 1) % mockSlides.length
      // initialIndex = 2, mockSlides.length = 3. So, (2+1)%3 = 0
      expect(mockUpdateCurrentPageWidgetData).toHaveBeenCalledWith(widgetId, 0);
    });
  });

  test('should call updateCurrentPageWidgetData with the new index on slide change', async () => {
    mockGetSlides.mockResolvedValue([...mockSlides]);
    const widgetId = 'widgetABC';

    renderSlideshow({ currentPageData: {} }, { widgetId }); // Start with no persisted data

    await waitFor(() => expect(mockGetSlides).toHaveBeenCalledWith('slideshow1'));

    // Initial slide index is 0. Advance to next slide.
    act(() => {
      jest.advanceTimersByTime(5000 + 100); // Default duration 5s + buffer
    });

    await waitFor(() => {
      // Next slide index should be 1
      expect(mockUpdateCurrentPageWidgetData).toHaveBeenCalledWith(widgetId, 1);
    });

    // Advance again
    act(() => {
      jest.advanceTimersByTime(5000 + 100);
    });

    await waitFor(() => {
      // Next slide index should be 2
      expect(mockUpdateCurrentPageWidgetData).toHaveBeenCalledWith(widgetId, 2);
    });
  });

  test('should start from index 0 if no persisted data exists for widgetId', async () => {
    mockGetSlides.mockResolvedValue([...mockSlides]);
    const widgetId = 'widgetNoData';
    // Ensure currentPageData is empty or doesn't contain widgetId
    const contextWithoutSpecificData = {
      ...mockContextValue,
      currentPageData: { otherWidget: 5 },
    };

    renderSlideshow(contextWithoutSpecificData, { widgetId });

    await waitFor(() => expect(mockGetSlides).toHaveBeenCalledWith('slideshow1'));

    // Advance to next slide. If it started at 0, next will be 1.
    act(() => {
      jest.advanceTimersByTime(5000 + 100);
    });

    await waitFor(() => {
      expect(mockUpdateCurrentPageWidgetData).toHaveBeenCalledWith(widgetId, 1);
    });
  });

  test('should start from index 0 if persisted index is out of bounds', async () => {
    mockGetSlides.mockResolvedValue([...mockSlides]); // mockSlides has length 3
    const widgetId = 'widgetOutOfBounds';
    const outOfBoundsIndex = 10;
    const contextWithOutOfBoundsData = {
      ...mockContextValue,
      currentPageData: { [widgetId]: outOfBoundsIndex },
    };

    renderSlideshow(contextWithOutOfBoundsData, { widgetId });

    await waitFor(() => expect(mockGetSlides).toHaveBeenCalledWith('slideshow1'));

    // Advance to next slide. If it started at 0 (due to out-of-bounds), next will be 1.
    act(() => {
      jest.advanceTimersByTime(5000 + 100);
    });

    await waitFor(() => {
      expect(mockUpdateCurrentPageWidgetData).toHaveBeenCalledWith(widgetId, 1);
    });
  });

  test('should re-fetch and restore index when slideshow_id prop changes', async () => {
    mockGetSlides.mockResolvedValueOnce([...mockSlides]); // First call
    const widgetId = 'widgetDynamic';
    const initialContext = {
      ...mockContextValue,
      currentPageData: { [widgetId]: 1 }, // Start at index 1 for the first slideshow
    };

    const { rerender } = renderSlideshow(initialContext, {
      widgetId,
      data: { slideshow_id: 'slideshow1' }
    });

    await waitFor(() => expect(mockGetSlides).toHaveBeenCalledWith('slideshow1'));

    // First advance, should go from 1 to 2
    act(() => { jest.advanceTimersByTime(5000 + 100); });
    await waitFor(() => expect(mockUpdateCurrentPageWidgetData).toHaveBeenCalledWith(widgetId, 2));
    mockUpdateCurrentPageWidgetData.mockClear(); // Clear for next assertion

    // Change slideshow_id prop
    const newSlides = [{ _id: 'ns1', type: 'photo', data: {}, duration: 3, position: 0, name: 'New Slide 1' }];
    mockGetSlides.mockResolvedValueOnce([...newSlides]); // Second call for new slideshow

    // Assume for the new slideshow, there's no persisted data, or it's different.
    // For this test, let's say the context's currentPageData *doesn't* change when slideshow_id does.
    // The component should try to use `currentPageData[widgetId]` (which is 1)
    // but since newSlides only has 1 slide, it should default to 0.

    const newProps = { widgetId, data: { slideshow_id: 'slideshow2' } };
    act(() => {
      render(
        <DisplayContext.Provider value={initialContext}> {/* Use same context */}
          <Slideshow {...newProps} />
        </DisplayContext.Provider>,
        { container: screen.getByTestId('root').parentNode } // Hacky way to rerender with new props via testing-library's render
      );
    });

    // The above rerender approach is not standard. testing-library's `rerender` is preferred.
    // Let's correct the rerender call:
    act(() => {
        rerender(
            <DisplayContext.Provider value={initialContext}>
                <Slideshow {...initialContext.state} {...newProps} />
            </DisplayContext.Provider>
        );
    });


    await waitFor(() => expect(mockGetSlides).toHaveBeenCalledWith('slideshow2'));
    // It should try to restore from index 1 (from context), but new slideshow only has 1 slide.
    // So it should default to 0. Then advance.
    act(() => { jest.advanceTimersByTime(3000 + 100); }); // New duration 3s

    // Since newSlides has only 1 slide, after starting at 0 and advancing, it should loop back to 0.
    await waitFor(() => expect(mockUpdateCurrentPageWidgetData).toHaveBeenCalledWith(widgetId, 0));
  });

});
