import axios, { AxiosResponse } from "axios";

// Define interfaces for the data structures
// This should ideally match the backend API/models or be a subset.
export interface ISlideData {
  _id: string;
  name?: string; // Assuming name is optional or might not always be there
  type: "image" | "video" | "web" | "markdown" | "photo" | "youtube"; // Example types, adjust as needed
  data: any; // For image/video URL, web URL, or markdown content. Be more specific if possible.
  duration?: number;
  position?: number;
  slideshow_ids?: string[]; // Assuming it's an array of slideshow IDs
  creator_id?: string;
  creation_date?: string; // Or Date
  last_update?: string; // Or Date
  // Add any other fields that are part of the slide object
}

// Interface for responses that might just be a success message or some specific data
interface IApiResponse {
  message?: string;
  // other potential fields
}

// Interface for the standalone_upload response
interface IStandaloneUploadResponse {
  url: string; // Assuming the server responds with the URL of the uploaded file
  // other potential fields like fileId, etc.
}

export const getSlides = (
  slideshowId: string,
  host: string = ""
): Promise<ISlideData[]> => {
  return axios
    .get<ISlideData[]>(`${host}/api/v1/slideshow/${slideshowId}/slides`)
    .then((res: AxiosResponse<ISlideData[]>) => {
      if (res && res.data) {
        return res.data;
      }
      return []; // Or throw an error
    });
};

export const getSlide = (
  slideId: string,
  host: string = ""
): Promise<ISlideData> => {
  return axios
    .get<ISlideData>(`${host}/api/v1/slide/${slideId}`)
    .then((res: AxiosResponse<ISlideData>) => {
      if (res && res.data) {
        return res.data;
      }
      throw new Error(`Failed to get slide ${slideId}: no data received`);
    });
};

// For delete, Axios typically returns AxiosResponse<any> or specific success/error structure.
// If the backend returns a specific JSON structure like { message: "deleted" }, type it.
export const deleteSlide = (
  id: string,
  host: string = ""
): Promise<AxiosResponse<IApiResponse>> => {
  return axios.delete(`${host}/api/v1/slide/${id}`);
};

// Type for the 'data' parameter in updateSlide and addSlide, excluding file
export type SlideUpdateData = Omit<
  Partial<ISlideData>,
  "_id" | "creator_id" | "creation_date" | "last_update" | "data"
> & {
  // Add other specific fields that can be sent in the FormData body, if any
  [key: string]: any; // Allow other string keys for FormData compatibility
};

export const updateSlide = (
  id: string,
  file: File | null,
  data: SlideUpdateData,
  host: string = ""
): Promise<AxiosResponse<ISlideData>> => {
  const formData = new FormData();
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      formData.append(key, data[key]);
    }
  }
  if (file) {
    formData.append("data", file); // 'data' is often the field name for the file itself
  }
  return axios.patch<ISlideData>(`${host}/api/v1/slide/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export type SlideAddData = Omit<
  Partial<ISlideData>,
  | "_id"
  | "creator_id"
  | "creation_date"
  | "last_update"
  | "data"
  | "slideshow_ids"
> & {
  // Add other specific fields that can be sent in the FormData body
  [key: string]: any; // Allow other string keys for FormData compatibility
};

export const addSlide = (
  slideshowId: string,
  file: File | null,
  data: SlideAddData,
  host: string = ""
): Promise<AxiosResponse<ISlideData>> => {
  const formData = new FormData();
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      formData.append(key, data[key]);
    }
  }
  if (file) {
    formData.append("data", file); // Field name for the file
  }
  formData.append("slideshow", slideshowId); // Assuming 'slideshow' is the field for slideshow ID
  return axios.post<ISlideData>(`${host}/api/v1/slide`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const standaloneUpload = (
  file: File,
  host: string = ""
): Promise<AxiosResponse<IStandaloneUploadResponse>> => {
  const formData = new FormData();
  formData.append("data", file); // 'data' is the field name for the file
  return axios.post<IStandaloneUploadResponse>(
    `${host}/api/v1/slide/standalone_upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};
