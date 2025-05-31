import React, { useEffect, useRef, useMemo } from 'react';
import GridLayout, { Layout as RglLayout } from 'react-grid-layout';
import _ from 'lodash';

import Frame from './Frame';
import HeightProvider from '../Widgets/HeightProvider';
import Widgets from '../../widgets';
import EmptyWidget from '../Widgets/EmptyWidget';
import { IBaseWidget } from '../../widgets/base_widget';
import { useDisplayContext } from '../../contexts/DisplayContext';

// --- Component Props and State ---
export type DisplayLayoutType = 'spaced' | 'compact';
import * as z from 'zod';

export const DisplayComponentPropsSchema = z.object({
  display: z.string().optional(),
});
export type IDisplayComponentProps = z.infer<typeof DisplayComponentPropsSchema>;

// --- Constants ---
const DEFAULT_STATUS_BAR: string[] = [];
const DEFAULT_LAYOUT: DisplayLayoutType = 'spaced';

const Display: React.FC<IDisplayComponentProps> = ({ display }) => {
  const { state, setId } = useDisplayContext();
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Create a simple refresh function that can be called when SSE events occur
  const refreshDisplay = useMemo(() => _.debounce(() => {
    if (display) {
      setId(display);
    }
  }, 1500), [display, setId]);

  const setupSSE = (): void => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (display) {
      const sseUrl = `/api/v1/displays/${display}/events`;
      eventSourceRef.current = new EventSource(sseUrl);

      eventSourceRef.current.addEventListener('display_updated', (event: MessageEvent) => {
        console.log('SSE event "display_updated" received:', event.data);
        // Trigger a refresh via the context
        refreshDisplay();
      });

      eventSourceRef.current.onerror = (err: Event) => {
        console.error('EventSource failed:', err);
        // Optional: Implement reconnection logic or error display
      };

      eventSourceRef.current.addEventListener('connected', (event: MessageEvent) => {
        try {
            const eventData = JSON.parse(event.data);
            console.log('SSE connection established:', eventData);
        } catch (e) {
            console.error("Failed to parse 'connected' event data:", e, event.data);
        }
      });
    }
  };
  useEffect(() => {
    if (display) {
      setId(display); // This will trigger the data fetch via context
    }
    setupSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      // Cancel any pending debounced refresh calls
      refreshDisplay.cancel();
    };
  }, [display, setId, refreshDisplay]);

  // Prepare layout for react-grid-layout
  const rglWidgetLayout: RglLayout[] = (state.widgets || []).map((widget: any) => ({
    i: widget._id, // react-grid-layout uses 'i' for id
    x: widget.x || 0,
    y: widget.y || 0,
    w: widget.w || 1,
    h: widget.h || 1,
    // Add other RGL properties if needed: minW, maxW, isDraggable, isResizable etc.
  }));

  // HeightProvider HOC - cast to any to avoid typing issues with HOC
  const currentLayout = state.layout || DEFAULT_LAYOUT;
  const RglComponent = HeightProvider(GridLayout as any, containerRef.current, currentLayout) as any;

  return (
    // Frame.tsx statusBar prop expects string[] currently.
    // If IDisplayData.statusBar is more complex (e.g. { enabled, color, elements }),
    // then Frame prop or this mapping needs adjustment.
    // Current Frame.tsx expects string[] (item identifiers).
    // Assuming this.state.statusBar (from displayData.statusBar.elements) is string[]
    <Frame statusBar={state.statusBar?.elements || DEFAULT_STATUS_BAR}>
      <div className={'gridContainer'} ref={containerRef}>
        <RglComponent
          className='layout' // Default class, react-grid-layout uses this
          isDraggable={false} // From original JS
          isResizable={false} // From original JS
          layout={rglWidgetLayout}
          cols={6}
          rowHeight={containerRef.current ? containerRef.current.clientHeight / (currentLayout === 'compact' ? 12 : 10) : 50}
          margin={currentLayout === 'spaced' ? ([10, 10] as [number, number]) : ([0, 0] as [number, number])}
          // Other RGL props: width, autoSize, compactType, etc.
        >
          {state.widgets.map((widget: any) => {
            // Widgets is Record<string, IBaseWidget>
            // widget.type is string (e.g. "announcement")
            const WidgetDefinition: IBaseWidget | undefined = Widgets[widget.type];
            const WidgetComponent = WidgetDefinition ? WidgetDefinition.Widget : EmptyWidget;
            
            // Key for RGL items must be string, widget._id is string.
            return (
              <div key={widget._id} className={'widget-wrapper'}> {/* Renamed class */}
                {/* Pass widget-specific data to the WidgetComponent */}
                {/* Also pass isPreview or other context if needed */}
                <WidgetComponent
                  {...(widget.data ? { data: widget.data } : {})}
                  widgetId={widget._id} // Pass widgetId
                />
              </div>
            );
          })}
        </RglComponent>
        <style jsx>
          {`
            .gridContainer {
              flex: 1;
              overflow: hidden; /* Important for RGL and scrolling */
              margin-bottom: ${currentLayout === 'spaced' ? '10px' : '0px'};
              /* background: #eee; */ /* Optional: for visualizing grid container */
            }
            .widget-wrapper { /* Renamed from .widget */
              border-radius: ${currentLayout === 'spaced' ? '6px' : '0px'};
              overflow: hidden; /* Clip widget content */
              background-color: rgba(200,200,200,0.1); /* Example placeholder background */
              /* Add transition for smooth resize/move if RGL animations are on */
            }
          `}
        </style>
      </div>
    </Frame>
  );
};

export default Display;
