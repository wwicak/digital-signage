import React, { useMemo, memo } from "react";
import { GridStackOptions } from "gridstack";

import Frame from "../Admin/Frame";
import GridStackWrapper, { GridStackItem } from "../GridStack/GridStackWrapper";
import Widgets from "../../widgets";
import { useDisplayState } from "../../hooks/useDisplayState";

interface DisplayGridStackProps {
  displayId?: string;
  layoutId?: string;
  className?: string;
}

const DisplayGridStack: React.FC<DisplayGridStackProps> = memo(({
  displayId,
  layoutId,
  className = "",
}) => {
  const { state, isLoading, error } = useDisplayState(displayId, layoutId);

  // Determine if the layout is portrait based on orientation
  const isPortrait = state.layout?.orientation === "portrait";

  // Grid configuration based on orientation
  const gridCols = isPortrait ? 9 : 16;
  const gridMargin = state.layout?.layoutType === "spaced" ? 12 : 6;

  // Convert widgets to GridStack items
  const gridStackItems: GridStackItem[] = useMemo(() => {
    if (!state.widgets || state.widgets.length === 0) return [];

    return state.widgets.map((widget: any) => {
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
    });
  }, [state.widgets]);

  // GridStack options for display mode (read-only)
  const gridStackOptions: GridStackOptions = useMemo(() => ({
    float: true,
    cellHeight: 'auto',
    margin: gridMargin,
    column: gridCols,
    staticGrid: true, // Make grid read-only for display
    disableDrag: true,
    disableResize: true,
    animate: false, // Disable animations for better performance
  }), [gridCols, gridMargin]);

  if (isLoading) {
    return (
      <Frame>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading display...</p>
          </div>
        </div>
      </Frame>
    );
  }

  if (error) {
    return (
      <Frame>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center text-red-600">
            <p className="text-xl font-semibold mb-2">Error Loading Display</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </Frame>
    );
  }

  if (!state.layout) {
    return (
      <Frame>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center text-gray-600">
            <p className="text-xl font-semibold mb-2">No Layout Found</p>
            <p className="text-sm">Please assign a layout to this display.</p>
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div
        className={`display-container ${className}`}
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          background: state.layout.backgroundColor || "#000000",
        }}
      >
        <GridStackWrapper
          items={gridStackItems}
          options={gridStackOptions}
          className="display-grid"
        />
        
        {/* Status Bar */}
        {state.layout.statusBar?.enabled && (
          <div
            className="status-bar"
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              height: "40px",
              backgroundColor: state.layout.statusBar.color || "#333333",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              fontSize: "14px",
              zIndex: 1000,
            }}
          >
            <div className="status-left">
              {state.layout.name}
            </div>
            <div className="status-right">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </Frame>
  );
});

DisplayGridStack.displayName = "DisplayGridStack";

export default DisplayGridStack;
