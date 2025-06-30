import { useMemo } from "react";
import widgets from "@/widgets";

// Removed unused LucideIcon import
// Removed unused AvailableWidget interface - no references found in codebase

// Hook to get widget choices formatted for dropdowns
export function useWidgetChoices() {
  const widgetChoices = useMemo(() => {
    return Object.entries(widgets).map(([key, widget]) => ({
      key,
      name: widget.name,
      icon: widget.icon,
    }));
  }, []);

  return {
    widgetChoices,
    isLoading: false,
    error: null,
    total: widgetChoices.length,
  };
}

// Hook for getting all available widgets
export function useAvailableWidgets() {
  const availableWidgets = useMemo(() => {
    const widgetList = Object.entries(widgets).map(([key, widget]) => ({
      key,
      name: widget.name,
      type: widget.type,
      icon: widget.icon,
      version: widget.version,
      defaultData: widget.defaultData || {},
    }));

    return {
      widgets: widgetList,
      total: widgetList.length,
    };
  }, []);

  return {
    data: availableWidgets,
    isLoading: false,
    error: null,
  };
}
