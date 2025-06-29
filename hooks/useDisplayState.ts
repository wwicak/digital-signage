import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface DisplayState {
  layout?: {
    _id: string;
    name: string;
    orientation: "landscape" | "portrait";
    layoutType: "spaced" | "compact";
    backgroundColor?: string;
    statusBar?: {
      enabled: boolean;
      color?: string;
      elements?: string[];
    };
  };
  widgets: Array<{
    _id: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    options?: Record<string, unknown>;
  }>;
}

// Hook to get display state for rendering
export function useDisplayState(displayId?: string, layoutId?: string) {
  const [state, setState] = useState<DisplayState>({
    widgets: [],
  });

  // If we have a layoutId, fetch layout data
  const {
    data: layoutData,
    isLoading: layoutLoading,
    error: layoutError,
  } = useQuery({
    queryKey: ["layout", layoutId],
    queryFn: async () => {
      if (!layoutId) return null;
      const response = await fetch(`/api/layouts/${layoutId}`);
      if (!response.ok) throw new Error("Failed to fetch layout");
      const data = await response.json();
      return data.layout;
    },
    enabled: !!layoutId,
  });

  // If we have a displayId, fetch display data
  const {
    data: displayData,
    isLoading: displayLoading,
    error: displayError,
  } = useQuery({
    queryKey: ["display", displayId],
    queryFn: async () => {
      if (!displayId) return null;
      const response = await fetch(`/api/displays/${displayId}`);
      if (!response.ok) throw new Error("Failed to fetch display");
      const data = await response.json();
      return data.display;
    },
    enabled: !!displayId,
  });

  // Update state when data changes
  useEffect(() => {
    if (layoutData) {
      setState({
        layout: {
          _id: layoutData._id,
          name: layoutData.name,
          orientation: layoutData.orientation || "landscape",
          layoutType: layoutData.layoutType || "spaced",
          backgroundColor: layoutData.backgroundColor,
          statusBar: layoutData.statusBar,
        },
        widgets: (layoutData.widgets || []).map((widget: {
          widget_id: string | { _id: string; type: string; data?: Record<string, unknown> };
          x?: number;
          y?: number;
          w?: number;
          h?: number;
        }) => ({
          _id:
            typeof widget.widget_id === "string"
              ? widget.widget_id
              : widget.widget_id?._id,
          type:
            typeof widget.widget_id === "object"
              ? widget.widget_id?.type
              : "unknown",
          x: widget.x || 0,
          y: widget.y || 0,
          w: widget.w || 2,
          h: widget.h || 2,
          options:
            typeof widget.widget_id === "object" ? widget.widget_id?.data : {},
        })) as Array<{
          _id: string;
          type: string;
          x: number;
          y: number;
          w: number;
          h: number;
          options?: Record<string, unknown>;
        }>,
      });
    } else if (displayData?.layout) {
      // Use display's assigned layout
      setState({
        layout: displayData.layout,
        widgets: displayData.layout.widgets || [],
      });
    }
  }, [layoutData, displayData]);

  return {
    state,
    isLoading: layoutLoading || displayLoading,
    error: layoutError || displayError,
  };
}
