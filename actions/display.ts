import axios, { AxiosResponse } from "axios";
import { WidgetType, WidgetData } from "@/lib/models/Widget";

/*
 * Define interfaces for the data structures
 * These should ideally match the backend API/models or be a subset
 * Using the proper types from the Widget model for consistency.
 */

interface IWidget {
  _id: string;
  name: string;
  type: WidgetType; // Use the defined WidgetType enum for better type safety
  x: number;
  y: number;
  w: number;
  h: number;
  data: WidgetData; // Use the union type for widget-specific data
}

interface IStatusBar {
  enabled?: boolean;
  color?: string;
  elements?: string[];
}

export interface IDisplayData {
  _id: string;
  name: string;
  description?: string;
  layout?: string; // Layout ID reference
  orientation?: "landscape" | "portrait"; // Display orientation
  location?: string; // Physical location of the display
  building?: string; // Building where the display is located
  statusBar?: IStatusBar; // Or string[] if it's just a list of element IDs/names
  widgets?: IWidget[];
  creator_id?: string; // Assuming it's part of the display data
  creation_date?: string; // Or Date
  last_update?: string; // Or Date
  clientCount: number; // Number of clients paired to this display
  isOnline: boolean; // Online status of the display
  refreshInterval?: number; // In seconds
  settings?: {
    volume?: number;
    brightness?: number;
    autoRestart?: boolean;
    maintenanceMode?: boolean;
    allowRemoteControl?: boolean;
    contentFiltering?: boolean;
    emergencyMessageEnabled?: boolean;
  };
  // Add any other fields that are part of the display object
}

// Interface for the response when a display is deleted (often just a message)
export interface IDeleteResponse {
  message: string;
  // Potentially other fields like id of deleted item
}

export const getDisplays = (host: string = ""): Promise<IDisplayData[]> => {
  // During build time, return empty array to prevent build issues
  if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
    return Promise.resolve([]);
  }

  return axios
    .get(`${host}/api/displays`)
    .then((res: AxiosResponse<{ displays: IDisplayData[] } | IDisplayData[]>) => {
      // The API returns {displays: [...], ...} structure
      if (
        res &&
        res.data &&
        'displays' in res.data &&
        Array.isArray(res.data.displays)
      ) {
        return res.data.displays;
      }
      // Fallback: check if data is directly an array (for backwards compatibility)
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "getDisplays: Invalid response data, returning empty array",
          res?.data
        );
      }
      return []; // Return empty array if data is not valid
    })
    .catch((error) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("getDisplays: API request failed:", error);
      }
      return []; // Return empty array on error instead of throwing
    });
};

export const addDisplay = (
  host: string = "",
  data?: Partial<IDisplayData>
): Promise<IDisplayData> => {
  /*
   * Updated to use new Next.js API route and allow optional initial data
   */
  const displayData = data || { name: "New Display" }; // Provide default name if none specified
  return axios
    .post<IDisplayData>(`${host}/api/displays`, displayData)
    .then((res: AxiosResponse<IDisplayData>) => {
      if (res && res.data) {
        return res.data;
      }
      // This path should ideally not be reached if server responds correctly or Axios throws.
      throw new Error("Failed to create display: no data received");
    });
};

export const getDisplay = (
  id: string,
  host: string = ""
): Promise<IDisplayData> => {
  return axios
    .get<IDisplayData>(`${host}/api/displays/${id}`)
    .then((res: AxiosResponse<IDisplayData>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error(`Failed to get display ${id}: no data received`);
    });
};

export const deleteDisplay = (
  id: string,
  host: string = ""
): Promise<IDeleteResponse> => {
  return axios
    .delete(`${host}/api/displays/${id}`)
    .then((res: AxiosResponse<IDeleteResponse>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error(
        `Failed to delete display ${id}: no confirmation received`
      );
    });
};

export const updateDisplay = (
  id: string,
  data: Partial<IDisplayData>,
  host: string = ""
): Promise<IDisplayData> => {
  return axios
    .put<IDisplayData>(`${host}/api/displays/${id}`, data)
    .then((res: AxiosResponse<IDisplayData>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error(`Failed to update display ${id}: no data received`);
    });
};
