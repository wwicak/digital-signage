import React, { useEffect, useRef, useMemo, useCallback, useState } from "react";
import _ from "lodash";
import { ILayoutData } from "../../actions/layouts";

import Frame from "./Frame";
import GridStackWrapper, { GridStackItem } from "../GridStack/GridStackWrapper";
import Widgets from "../../widgets";
import PriorityVideoDisplay, { PriorityVideoData } from "../PriorityVideo/PriorityVideoDisplay";

// Debug log available widgets
console.log('Available widgets:', Object.keys(Widgets));
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

// Type for widget data object
interface WidgetObjectData {
  _id: string;
  type: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

// Type for layout widget with position data
interface LayoutWidget {
  widget_id?: unknown;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

// --- Constants ---
const DEFAULT_STATUS_BAR: string[] = [];

const Display: React.FC<IDisplayComponentProps> = React.memo(({ display }) => {
  const { state, setId, refreshDisplayData } = useDisplayContext();
  const [layoutData, setLayoutData] = React.useState<ILayoutData | null>(null);
  const [priorityVideo, setPriorityVideo] = useState<PriorityVideoData | null>(null);
  const [showPriorityVideo, setShowPriorityVideo] = useState(false);
  const priorityCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch layout data when display data changes
  React.useEffect(() => {
    if (state.layout && typeof state.layout === 'string') {
      fetch(`/api/layouts/${state.layout}`)
        .then(res => res.json())
        .then(data => {
          setLayoutData(data.layout);
        })
        .catch(err => console.error('Error fetching layout:', err));
    }
  }, [state.layout]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layoutChangeCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check for priority video
  const checkPriorityVideo = useCallback(async () => {
    if (!display) 
      console.log('No display ID provided, skipping priority video check.');
      return;

    try {
      const response = await fetch(`/api/displays/${display}/priority-video`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.isActive && data.priorityVideo) {
          console.log('Priority video is active:', data.priorityVideo);
          setPriorityVideo(data.priorityVideo);
          setShowPriorityVideo(true);
        } else {
          setShowPriorityVideo(false);
          setPriorityVideo(null);
        }
      }
    } catch (error) {
      console.error('Error checking priority video:', error);
    }
  }, [display]);

  // Set up periodic priority video checking
  useEffect(() => {
    if (display) {
      // Check for priority video every 30 seconds
      priorityCheckRef.current = setInterval(checkPriorityVideo, 30000);

      // Also check immediately
      checkPriorityVideo();
    }

    return () => {
      if (priorityCheckRef.current) {
        clearInterval(priorityCheckRef.current);
        priorityCheckRef.current = null;
      }
    };
  }, [display, checkPriorityVideo]);

  // Handle priority video exit
  const handlePriorityVideoExit = useCallback(() => {
    setShowPriorityVideo(false);
    setPriorityVideo(null);
    // Re-check priority video status after a short delay
    setTimeout(() => {
      checkPriorityVideo();
    }, 5000);
  }, [checkPriorityVideo]);

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
      if (priorityCheckRef.current) {
        clearInterval(priorityCheckRef.current);
        priorityCheckRef.current = null;
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
      (layoutData?.widgets || [])
        .map((widget: LayoutWidget) => {
        // Skip if no widget data
        if (!widget?.widget_id) return null;

        // Get the widget definition data - handle both string ID and embedded object
        const widgetData = widget.widget_id; // Widget data is not reassigned
        if (typeof widgetData !== 'object' || widgetData === null) {
          console.error('Widget data is not an object:', widgetData);
          return null;
        }

        // Type guard to ensure we have the expected structure
        const isValidWidgetData = (data: unknown): data is WidgetObjectData => {
          return (
            typeof data === 'object' &&
            data !== null &&
            typeof (data as WidgetObjectData)._id === 'string' &&
            typeof (data as WidgetObjectData).type === 'string'
          );
        };

        if (!isValidWidgetData(widgetData)) {
          console.error('Invalid widget data structure:', widget);
          return null;
        }

        // Detailed debug logging
        console.log('Full widget data:', JSON.stringify(widgetData, null, 2));
        console.log('Widget instance:', widget);

        // Debug log widget type and available widgets
        // Type normalization and debug logging
        const widgetType = (widgetData.type || '').toLowerCase();
        const registeredWidgets = Object.keys(Widgets);
        console.log('Widget type:', widgetType, 'Original:', widgetData.type);
        console.log('Available widgets:', registeredWidgets);
        console.log('Type comparison:', registeredWidgets.map(k => ({
          registered: k,
          lowercased: k.toLowerCase(),
          matches: k.toLowerCase() === widgetType
        })));

        // Get the component from our widgets registry
        // Find widget definition regardless of case
        let widgetDef;
        const matchingKey = Object.keys(Widgets).find(key =>
          key.toLowerCase() === widgetType ||
          key === widgetData.type // try exact match too
        );

        if (matchingKey) {
          widgetDef = Widgets[matchingKey];
          console.log('Found widget definition for type:', widgetData.type, 'using key:', matchingKey);
        }

        if (!widgetDef) {
          console.error(`Widget type "${widgetData.type}" not found in registry. Available types:`,
            Object.keys(Widgets).join(', '),
            '\nAttempted lowercase match:', widgetType,
            '\nAttempted exact match:', widgetData.type
          );
          return null;
        }

        return {
          id: widgetData._id,
          x: widget.x || 0,
          y: widget.y || 0,
          w: widget.w || 1,
          h: widget.h || 1,
          content: widgetDef.Widget ? (
            <widgetDef.Widget
              key={widgetData._id}
              // id={widgetData._id}
              data={widgetData.data || {}}
              isPreview={false}
            />
          ) : (
            <div className='flex items-center justify-center h-full bg-red-100 text-red-600'>
              Unknown Widget Type: {widgetData.type} (Available types: {Object.keys(Widgets).join(', ')})
            </div>
          )
        };
      })
      .filter(Boolean) as GridStackItem[], // Remove any null items
    [layoutData?.widgets],
  );





  if (!layoutData) {
    return (
      <Frame
        statusBar={state.statusBar?.elements || DEFAULT_STATUS_BAR}
        orientation={state.orientation}
      >
        <div className='flex items-center justify-center h-full'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
        </div>
      </Frame>
    );
  }

  return (
    <>
      {/* Priority Video Overlay */}
      {showPriorityVideo && priorityVideo && (
        <PriorityVideoDisplay
          data={priorityVideo}
          onExit={handlePriorityVideoExit}
        />
      )}
      
      {/* Regular Display Content */}
      <Frame
        statusBar={state.statusBar?.elements || DEFAULT_STATUS_BAR}
        orientation={state.orientation}
      >
        <div
          className={`flex-1 h-full w-full overflow-hidden ${orientationClass}`}
          ref={containerRef}
        >
          <GridStackWrapper
            items={gridStackItems}
            options={{
              float: true,
              cellHeight: 'auto',
              margin: "2",
              column: layoutData.gridConfig?.cols || gridCols,
              staticGrid: true, // Make grid read-only for display
              disableDrag: true,
              disableResize: true,
              animate: false, // Disable animations for better performance
            }}
            className="display-grid"
          />
        </div>
      </Frame>
    </>
  );
});

Display.displayName = "Display";

export default Display;
