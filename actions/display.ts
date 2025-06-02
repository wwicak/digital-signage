import axios, { AxiosResponse } from "axios";

/*
 * Define interfaces for the data structures
 * These should ideally match the backend API/models or be a subset
 * For now, defining them based on common expectations for display data.
 */

interface IWidget {
  _id: string;
  name: string;
  type: string; // Consider an enum if widget types are fixed
  x: number;
  y: number;
  w: number;
  h: number;
  data: any; // Be more specific if possible
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
  layout?: "spaced" | "compact"; // Assuming these are the possible layouts
  orientation?: "landscape" | "portrait"; // Display orientation
  statusBar?: IStatusBar; // Or string[] if it's just a list of element IDs/names
  widgets?: IWidget[];
  creator_id?: string; // Assuming it's part of the display data
  creation_date?: string; // Or Date
  last_update?: string; // Or Date
  // Add any other fields that are part of the display object
}

// Interface for the response when a display is deleted (often just a message)
export interface IDeleteResponse {
  message: string;
  // Potentially other fields like id of deleted item
}

export const getDisplays = (host: string = ""): Promise<IDisplayData[]> => {
  return axios
    .get<IDisplayData[]>(`${host}/api/v1/display`)
    .then((res: AxiosResponse<IDisplayData[]>) => {
      // Ensure we have valid response data and it's an array
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
      console.warn("getDisplays: Invalid response data, returning empty array");
      return []; // Return empty array if data is not valid
    })
    .catch((error) => {
      console.error("getDisplays: API request failed:", error);
      return []; // Return empty array on error instead of throwing
    });
};

export const addDisplay = (host: string = ""): Promise<IDisplayData> => {
  /*
   * Typically, a POST request for creation might take some initial data,
   * but the original function doesn't pass any.
   * If it should, add a 'data: Partial<IDisplayData>' parameter.
   */
  return axios
    .post<IDisplayData>(`${host}/api/v1/display`)
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
    .get<IDisplayData>(`${host}/api/v1/display/${id}`)
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
    .delete(`${host}/api/v1/display/${id}`)
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
    .patch<IDisplayData>(`${host}/api/v1/display/${id}`, data)
    .then((res: AxiosResponse<IDisplayData>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error(`Failed to update display ${id}: no data received`);
    });
};
