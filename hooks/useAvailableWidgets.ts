import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface AvailableWidget {
  key: string;
  name: string;
  type: string;
  icon: string;
  version: string;
  defaultData?: Record<string, any>;
}

interface AvailableWidgetsResponse {
  widgets: AvailableWidget[];
  total: number;
}

// API function to fetch available widgets
const fetchAvailableWidgets = async (): Promise<AvailableWidgetsResponse> => {
  const response = await axios.get("/api/widgets/available");
  return response.data;
};

// Hook for fetching available widgets based on user's feature flag access
export function useAvailableWidgets() {
  return useQuery({
    queryKey: ["available-widgets"],
    queryFn: fetchAvailableWidgets,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Hook to get widget choices formatted for dropdowns
export function useWidgetChoices() {
  const { data, isLoading, error } = useAvailableWidgets();
  
  const widgetChoices = data?.widgets.map(widget => ({
    key: widget.key,
    name: widget.name,
    icon: widget.icon,
  })) || [];

  return {
    widgetChoices,
    isLoading,
    error,
    total: data?.total || 0,
  };
}
