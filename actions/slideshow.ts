import axios, { AxiosResponse } from "axios";
import { ISlideData } from "./slide"; // Assuming ISlideData is exported from slide actions

// Define interfaces for the data structures
export interface ISlideshowData {
  _id: string;
  name: string;
  description?: string;
  slides: string[] | ISlideData[]; // Array of slide IDs or populated slide objects
  creator_id?: string;
  creation_date?: string; // Or Date
  last_update?: string; // Or Date
  // Add any other fields that are part of the slideshow object
}

// Interface for the response when a slideshow is deleted
interface IDeleteResponse {
  message: string;
  // Potentially other fields like id of deleted item
}

// Interface for the response of reorderSlides (could be the updated slideshow or just a message)
interface IReorderResponse {
  message?: string;
  slideshow?: ISlideshowData; // If the updated slideshow is returned
}

export const getSlideshows = (host: string = ""): Promise<ISlideshowData[]> => {
  return axios
    .get<ISlideshowData[]>(`${host}/api/v1/slideshow`)
    .then((res: AxiosResponse<ISlideshowData[]>) => {
      if (res && res.data) {
        return res.data;
      }
      return []; // Or throw an error
    });
};

export const addSlideshow = (
  initialData?: Partial<Omit<ISlideshowData, "_id" | "slides">>,
  host: string = ""
): Promise<ISlideshowData> => {
  // Allow passing some initial data for the slideshow, e.g., name, description
  return axios
    .post<ISlideshowData>(`${host}/api/v1/slideshow`, initialData)
    .then((res: AxiosResponse<ISlideshowData>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error("Failed to create slideshow: no data received");
    });
};

export const getSlideshow = (
  id: string,
  host: string = ""
): Promise<ISlideshowData> => {
  return axios
    .get<ISlideshowData>(`${host}/api/v1/slideshow/${id}`)
    .then((res: AxiosResponse<ISlideshowData>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error(`Failed to get slideshow ${id}: no data received`);
    });
};

export const deleteSlideshow = (
  id: string,
  host: string = ""
): Promise<IDeleteResponse> => {
  return axios
    .delete(`${host}/api/v1/slideshow/${id}`)
    .then((res: AxiosResponse<IDeleteResponse>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error(
        `Failed to delete slideshow ${id}: no confirmation received`
      );
    });
};

export const updateSlideshow = (
  id: string,
  data: Partial<Omit<ISlideshowData, "_id" | "slides">>,
  host: string = ""
): Promise<ISlideshowData> => {
  // Exclude 'slides' from typical update path if slides are managed by different endpoints
  // or if reordering is handled by a specific function.
  return axios
    .patch<ISlideshowData>(`${host}/api/v1/slideshow/${id}`, data)
    .then((res: AxiosResponse<ISlideshowData>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error(`Failed to update slideshow ${id}: no data received`);
    });
};

export const reorderSlides = (
  id: string,
  oldIndex: number,
  newIndex: number,
  host: string = ""
): Promise<IReorderResponse> => {
  return axios
    .patch<IReorderResponse>(`${host}/api/v1/slideshow/${id}/reorder`, {
      oldIndex,
      newIndex,
    })
    .then((res: AxiosResponse<IReorderResponse>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error(
        `Failed to reorder slides for slideshow ${id}: no confirmation received`
      );
    });
};
