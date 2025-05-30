import axios, { AxiosResponse } from "axios";

// Define a generic WidgetType enum or string literal union if types are known
// For example:
// export type WidgetType = 'clock' | 'weather' | 'news' | 'custom';
// For now, using string.
export type WidgetType = string;

export interface IWidgetData {
  _id: string;
  display_id: string; // ID of the display this widget belongs to
  name?: string; // Optional name for the widget
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  data: Record<string, any>; // For widget-specific configuration
  creator_id?: string;
  creation_date?: string; // Or Date
  last_update?: string; // Or Date
}

// Interface for the data sent when adding a new widget
export interface INewWidgetData {
  display: string; // Display ID
  type: WidgetType;
  name?: string;
  x?: number; // Optional during creation, server might assign default
  y?: number; // Optional during creation
  w?: number; // Optional during creation
  h?: number; // Optional during creation
  data?: Record<string, any>;
}

// Interface for the data sent when updating a widget
// Most fields are optional.
export interface IUpdateWidgetData
  extends Omit<
    Partial<IWidgetData>,
    "_id" | "display_id" | "creator_id" | "creation_date" | "last_update"
  > {
  // No additional fields needed here usually, but can be extended
}

// Interface for the response when a widget is deleted
interface IDeleteResponse {
  message: string;
  // Potentially other fields like id of deleted item
}

export const addWidget = (
  widgetDetails: INewWidgetData,
  host: string = ""
): Promise<IWidgetData> => {
  return axios
    .post<IWidgetData>(`${host}/api/v1/widgets`, widgetDetails)
    .then((res: AxiosResponse<IWidgetData>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error("Failed to add widget: no data received");
    });
};

export const getWidgets = (
  displayId: string,
  host: string = ""
): Promise<IWidgetData[]> => {
  return axios
    .get<IWidgetData[]>(`${host}/api/v1/display/${displayId}/widgets`)
    .then((res: AxiosResponse<IWidgetData[]>) => {
      if (res && res.data) {
        return res.data;
      }
      return []; // Or throw an error if data is always expected
    });
};

export const deleteWidget = (
  id: string,
  host: string = ""
): Promise<IDeleteResponse> => {
  return axios
    .delete(`${host}/api/v1/widgets/${id}`)
    .then((res: AxiosResponse<IDeleteResponse>) => {
      if (res && res.data) {
        return res.data;
      }
      // If server doesn't send a body on delete, this might be an empty object or string.
      // Adjust expected type or handling if necessary.
      // For now, assuming a JSON response like { message: "deleted" }.
      throw new Error(
        `Failed to delete widget ${id}: no confirmation received`
      );
    });
};

export const updateWidget = (
  id: string,
  data: IUpdateWidgetData,
  host: string = ""
): Promise<IWidgetData> => {
  return axios
    .put<IWidgetData>(`${host}/api/v1/widgets/${id}`, data)
    .then((res: AxiosResponse<IWidgetData>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error(`Failed to update widget ${id}: no data received`);
    });
};

export const getWidget = (
  id: string,
  host: string = ""
): Promise<IWidgetData> => {
  return axios
    .get<IWidgetData>(`${host}/api/v1/widgets/${id}`)
    .then((res: AxiosResponse<IWidgetData>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error(`Failed to get widget ${id}: no data received`);
    });
};
