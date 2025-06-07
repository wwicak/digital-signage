import axios, { AxiosResponse } from "axios";
import * as z from "zod";
import { SlideTypeZod, SlideDataZod } from "@/lib/models/Slide"; // Using Zod schemas from the model
// Local slideshow schema to avoid circular dependency
const LocalSlideshowSchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  slides: z.array(z.any()), // Will contain slide objects or IDs
  creator_id: z.string().optional(),
  creation_date: z
    .preprocess(
      (arg) =>
        typeof arg === "string" || typeof arg === "number"
          ? new Date(arg)
          : arg,
      z.date()
    )
    .optional(),
  last_update: z
    .preprocess(
      (arg) =>
        typeof arg === "string" || typeof arg === "number"
          ? new Date(arg)
          : arg,
      z.date()
    )
    .optional(),
  is_enabled: z.boolean().optional().default(true),
});

// Zod schema for slide data in actions context
export const SlideActionDataSchema = z.object({
  _id: z.string(),
  name: z.string(), // Matches SlideSchemaZod (required)
  description: z.string().optional(), // Matches SlideSchemaZod
  type: SlideTypeZod,
  data: SlideDataZod, // Directly use SlideDataZod from models, assuming API aligns
  duration: z.number().default(10), // Matches SlideSchemaZod
  is_enabled: z.boolean().default(true), // Matches SlideSchemaZod
  creator_id: z.string(), // String version of ObjectId, required
  creation_date: z
    .preprocess(
      (arg) =>
        typeof arg === "string" || typeof arg === "number"
          ? new Date(arg)
          : arg,
      z.date()
    )
    .optional(),
  last_update: z
    .preprocess(
      (arg) =>
        typeof arg === "string" || typeof arg === "number"
          ? new Date(arg)
          : arg,
      z.date()
    )
    .optional(),
  slideshow_ids: z.array(z.string()).optional(), // Additional field from original ISlideData
  __v: z.number().optional(), // From Mongoose
});

export type ISlideData = z.infer<typeof SlideActionDataSchema>;

// Zod Schema for API responses
export const ApiResponseSchema = z.object({
  message: z.string().optional(),
  // other potential fields can be added here
});
export type IApiResponse = z.infer<typeof ApiResponseSchema>;

// Zod Schema for the standalone_upload response
export const StandaloneUploadResponseSchema = z.object({
  url: z.string().url(),
  // other potential fields like fileId, etc.
});
export type IStandaloneUploadResponse = z.infer<
  typeof StandaloneUploadResponseSchema
>;

export const getSlides = (
  slideshowId: string,
  host: string = ""
): Promise<ISlideData[]> => {
  // Get slides through the slideshow endpoint since slideshows populate their slides
  return axios
    .get<unknown>(`${host}/api/slideshows/${slideshowId}`) // Get the slideshow which includes populated slides
    .then((res: AxiosResponse<unknown>) => {
      if (res && res.data) {
        const slideshow = LocalSlideshowSchema.parse(res.data);
        // Extract slides from the slideshow, ensuring they are full slide objects, not just IDs
        if (slideshow.slides && Array.isArray(slideshow.slides)) {
          const fullSlides = slideshow.slides.filter(
            (slide: any) => typeof slide === "object" && slide !== null
          ) as ISlideData[];
          return fullSlides;
        }
        return [];
      }
      return [];
    });
};

export const getSlide = (
  slideId: string,
  host: string = ""
): Promise<ISlideData> => {
  return axios
    .get<unknown>(`${host}/api/slides/${slideId}`) // Updated to use new Next.js API route
    .then((res: AxiosResponse<unknown>) => {
      if (res && res.data) {
        return SlideActionDataSchema.parse(res.data);
      }
      throw new Error(`Failed to get slide ${slideId}: no data received`);
    });
};

export const deleteSlide = (
  id: string,
  host: string = ""
): Promise<IApiResponse> => {
  // Return type changed to Promise<IApiResponse>
  return axios
    .delete<unknown>(`${host}/api/slides/${id}`) // Updated to use new Next.js API route
    .then((res: AxiosResponse<unknown>) => {
      if (res && res.data && Object.keys(res.data).length > 0) {
        // Check if data is not empty
        return ApiResponseSchema.parse(res.data);
      }
      // Handle cases where delete might not return a body but is successful
      if (res.status >= 200 && res.status < 300) {
        return { message: "Slide deleted successfully" }; // Provide a default success message
      }
      // Fallback for unexpected cases
      const responseData = res.data as any;
      throw new Error(
        responseData?.message ||
          `Failed to delete slide ${id}: no confirmation received`
      );
    })
    .catch((error) => {
      // Attempt to parse error response if available
      if (error.response && error.response.data) {
        const parsedError = ApiResponseSchema.safeParse(error.response.data);
        if (parsedError.success)
          throw new Error(
            parsedError.data.message || `Error deleting slide ${id}`
          );
      }
      throw error; // Rethrow original error if parsing fails
    });
};

// Type for the 'data' parameter (metadata) in updateSlide and addSlide
export type SlideUpdatePayload = Omit<
  Partial<ISlideData>,
  "_id" | "creator_id" | "creation_date" | "last_update" | "data" // 'data' here is the SlideData complex object
> & {
  /*
   * This allows other string keys for FormData compatibility but is not strictly type-safe for those extra keys.
   * It's a common pattern for FormData.
   */
  [key: string]: any;
};

// Export types that are expected by components
export type SlideAddData = SlideAddPayload;
export type SlideUpdateData = SlideUpdatePayload;

export const updateSlide = (
  id: string,
  file: File | null,
  payload: SlideUpdatePayload,
  host: string = ""
): Promise<ISlideData> => {
  const formData = new FormData();
  // Append metadata
  Object.keys(payload).forEach((key) => {
    const value = (payload as any)[key];
    if (
      value !== undefined &&
      typeof value !== "object" &&
      !Array.isArray(value)
    ) {
      // FormData typically takes string/blob
      formData.append(key, String(value));
    } else if (
      value !== undefined &&
      (Array.isArray(value) || typeof value === "object")
    ) {
      formData.append(key, JSON.stringify(value)); // Or handle objects/arrays appropriately for backend
    }
  });

  if (file) {
    formData.append("slideFile", file);
  }

  return axios
    .put<unknown>(`${host}/api/slides/${id}`, formData, {
      // Updated to use new Next.js API route and PUT method
      headers: {
        // "Content-Type": "multipart/form-data", // Axios sets this with FormData
      },
    })
    .then((res: AxiosResponse<unknown>) => {
      if (res && res.data) {
        return SlideActionDataSchema.parse(res.data);
      }
      throw new Error(`Failed to update slide ${id}: no data received`);
    });
};

export type SlideAddPayload = Omit<
  Partial<ISlideData>,
  | "_id"
  | "creator_id"
  | "creation_date"
  | "last_update"
  | "data" // SlideData complex object
  | "slideshow_ids"
> & {
  [key: string]: any;
};

export const addSlide = (
  slideshowId: string,
  file: File | null,
  payload: SlideAddPayload,
  host: string = ""
): Promise<ISlideData> => {
  const formData = new FormData();
  Object.keys(payload).forEach((key) => {
    const value = (payload as any)[key];
    if (
      value !== undefined &&
      typeof value !== "object" &&
      !Array.isArray(value)
    ) {
      formData.append(key, String(value));
    } else if (
      value !== undefined &&
      (Array.isArray(value) || typeof value === "object")
    ) {
      formData.append(key, JSON.stringify(value));
    }
  });

  if (file) {
    formData.append("slideFile", file);
  }
  formData.append("slideshow_id", slideshowId);

  return axios
    .post<unknown>(`${host}/api/slides`, formData, {
      // Updated to use new Next.js API route
      headers: {
        // "Content-Type": "multipart/form-data", // Axios sets this
      },
    })
    .then((res: AxiosResponse<unknown>) => {
      if (res && res.data) {
        return SlideActionDataSchema.parse(res.data);
      }
      throw new Error("Failed to add slide: no data received");
    });
};

export const standaloneUpload = (
  file: File,
  host: string = ""
): Promise<IStandaloneUploadResponse> => {
  const formData = new FormData();
  formData.append("slideFile", file);
  return axios
    .post<unknown>(`${host}/api/slides/standalone_upload`, formData, {
      // Updated to use new Next.js API route
      headers: {
        // "Content-Type": "multipart/form-data", // Axios sets this
      },
    })
    .then((res: AxiosResponse<unknown>) => {
      if (res && res.data) {
        return StandaloneUploadResponseSchema.parse(res.data);
      }
      throw new Error("Failed to upload file: no data received");
    });
};
