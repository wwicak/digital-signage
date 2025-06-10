import React, { useEffect, useRef, useMemo, useCallback } from "react";
import _ from "lodash";

import Frame from "./Frame";
import GridStackWrapper, { GridStackItem } from "../GridStack/GridStackWrapper";
import Widgets from "../../widgets";
import EmptyWidget from "../Widgets/EmptyWidget";
import { IBaseWidget } from "../../widgets/base_widget";
import { useDisplayContext } from "../../contexts/DisplayContext";

// --- Component Props and State ---
export type DisplayLayoutType = "spaced" | "compact";
import * as z from "zod";

export const DisplayComponentPropsSchema = z.object({
  display: z.string().optional(),
});
export type IDisplayComponentProps = z.infer<
  typeof DisplayComponentPropsSchema
>;

// --- Constants ---
const DEFAULT_STATUS_BAR: string[] = [];
const DEFAULT_LAYOUT: DisplayLayoutType = "spaced";

const Display: React.FC<IDisplayComponentProps> = React.memo(({ display }) => {
  const { state, setId, refreshDisplayData } = useDisplayContext();
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layoutChangeCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Create a debounced refresh function for SSE events using React Query invalidation
  const refreshDisplay = useMemo(
    () =>
      _.debounce(() => {
        refreshDisplayData();
      }, 500),
    [refreshDisplayData],
  ); // Reduced debounce time since invalidation is more efficient

  // Function to check for layout changes
  const checkForLayoutChanges = useCallback(async () => {
    if (!display) return;

    try {
      const response = await fetch(`/api/v1/displays/${display}/change-layout`);
      if (response.ok) {
        const data = await response.json();

        // If a layout change was requested and we haven't reloaded yet
        if (data.layoutChangeRequested) {
          console.log('Layout change detected, reloading display...');

          // Clear the layout change flag using PATCH method
          await fetch(`/api/v1/displays/${display}/change-layout`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          });

          // Reload the page to apply the new layout
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error checking for layout changes:', error);
    }
  }, [display]);

  // Set up periodic layout change checking
  useEffect(() => {
    if (display) {
      // Check for layout changes every 10 seconds
      layoutChangeCheckRef.current = setInterval(checkForLayoutChanges, 10000);

      // Also check immediately
      checkForLayoutChanges();
    }

    return () => {
      if (layoutChangeCheckRef.current) {
        clearInterval(layoutChangeCheckRef.current);
        layoutChangeCheckRef.current = null;
      }
    };
  }, [display, checkForLayoutChanges]);

  const setupSSE = (): void => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (display) {
      const sseUrl = `/api/v1/displays/${display}/events`;
      eventSourceRef.current = new EventSource(sseUrl);

      eventSourceRef.current.addEventListener(
        "display_updated",
        (event: MessageEvent) => {
          console.log('SSE event "display_updated" received:', event.data);
          // Trigger a refresh via the context
          refreshDisplay();
        },
      );

      // Listen for layout change events
      eventSourceRef.current.addEventListener(
        "layout_change_requested",
        (event: MessageEvent) => {
          console.log('SSE event "layout_change_requested" received:', event.data);
          // Immediately check for layout changes
          checkForLayoutChanges();
        },
      );

      eventSourceRef.current.onerror = (err: Event) => {
        console.error("EventSource failed:", err);
        // Optional: Implement reconnection logic or error display
      };

      eventSourceRef.current.addEventListener(
        "connected",
        (event: MessageEvent) => {
          try {
            const eventData = JSON.parse(event.data);
            console.log("SSE connection established:", eventData);
          } catch (e) {
            console.error(
              "Failed to parse 'connected' event data:",
              e,
              event.data,
            );
          }
        },
      );
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
      if (layoutChangeCheckRef.current) {
        clearInterval(layoutChangeCheckRef.current);
        layoutChangeCheckRef.current = null;
      }
      // Cancel any pending debounced refresh calls
      refreshDisplay.cancel();
    };
  }, [display, setId, refreshDisplay]);

  // Determine orientation-specific styling and grid configuration FIRST
  const isPortrait = state.orientation === "portrait";
  const orientationClass = isPortrait
    ? "portrait-display"
    : "landscape-display";

  // Adjust grid columns based on aspect ratio (16:9 landscape, 9:16 portrait)
  const gridCols = isPortrait ? 9 : 16; // Portrait: 9 cols (9:16), Landscape: 16 cols (16:9)

  // Memoize layout for GridStack to prevent unnecessary re-renders
  const gridStackItems: GridStackItem[] = useMemo(
    () =>
      (state.widgets || []).map((widget: any) => {
        const WidgetComponent = Widgets[widget.type]?.Component;

        return {
          id: widget._id,
          x: widget.x || 0,
          y: widget.y || 0,
          w: widget.w || 1,
          h: widget.h || 1,
          content: WidgetComponent ? (
            <WidgetComponent
              key={widget._id}
              id={widget._id}
              options={widget.options || {}}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-red-100 text-red-600">
              Unknown Widget: {widget.type}
            </div>
          )
        };
      }),
    [state.widgets],
  );

  // Memoize layout setting
  const currentLayout = useMemo(
    () => state.layout || DEFAULT_LAYOUT,
    [state.layout],
  );

  // Memoize margin calculation for stable props
  const gridMargin = useMemo(
    () =>
      currentLayout === "spaced"
        ? ([10, 10] as [number, number])
        : ([0, 0] as [number, number]),
    [currentLayout],
  );



  return (
    /*
     * Frame.tsx statusBar prop expects string[] currently.
     * If IDisplayData.statusBar is more complex (e.g. { enabled, color, elements }),
     * then Frame prop or this mapping needs adjustment.
     * Current Frame.tsx expects string[] (item identifiers).
     * Assuming this.state.statusBar (from displayData.statusBar.elements) is string[]
     */
    <Frame
      statusBar={state.statusBar?.elements || DEFAULT_STATUS_BAR}
      orientation={state.orientation}
    >
      <div
        className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out ${
          currentLayout === "spaced" ? "mb-2" : "mb-0"
        } ${orientationClass}`}
        ref={containerRef}
        style={{
          marginBottom: currentLayout === "spaced" ? "10px" : "0px",
        }}
      >
        <GridStackWrapper
          items={gridStackItems}
          options={{
            float: true,
            cellHeight: 'auto',
            margin: gridMargin[0],
            column: gridCols,
            staticGrid: true, // Make grid read-only for display
            disableDrag: true,
            disableResize: true,
            animate: false, // Disable animations for better performance
          }}
          className="display-grid"
        />
      </div>
    </Frame>
  );
});

Display.displayName = "Display";

export default Display;
