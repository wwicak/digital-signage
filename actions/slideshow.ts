import axios, { AxiosResponse } from "axios";
import * as z from "zod";
import { SlideActionDataSchema } from "./slide"; // Import the actual Zod schema

// Zod schema for slideshow data in actions context
export const SlideshowActionDataSchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  slides: z.array(z.union([z.string(), SlideActionDataSchema])).default([]), // Use imported SlideActionDataSchema
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

// Derive TypeScript type from Zod schema
export type ISlideshowData = z.infer<typeof SlideshowActionDataSchema>;

// Interface for the response when a slideshow is deleted
interface IDeleteResponse {
  message: string;
  // Potentially other fields like id of deleted item
}

/*
 * Interface for the response of reorderSlides (could be the updated slideshow or just a message)
 * If slideshow is returned, it should conform to ISlideshowData
 */
interface IReorderResponse {
  message?: string;
  slideshow?: ISlideshowData;
}

export const getSlideshows = (host: string = ""): Promise<ISlideshowData[]> => {
  return axios
    .get<unknown[]>(`${host}/api/slideshows`) // Updated to use new Next.js API route
    .then((res: AxiosResponse<unknown[]>) => {
      if (res && res.data) {
        // Validate and parse the array of slideshows
        return z.array(SlideshowActionDataSchema).parse(res.data);
      }
      return [];
    });
};

export const addSlideshow = (
  initialData?: Partial<
    Omit<
      ISlideshowData,
      "_id" | "slides" | "creation_date" | "last_update" | "is_enabled"
    >
  >, // Adjusted Omit for Zod schema
  host: string = ""
): Promise<ISlideshowData> => {
  return axios
    .post<unknown>(`${host}/api/slideshows`, initialData) // Updated to use new Next.js API route
    .then((res: AxiosResponse<unknown>) => {
      if (res && res.data) {
        // Validate and parse the slideshow data
        return SlideshowActionDataSchema.parse(res.data);
      }
      throw new Error("Failed to create slideshow: no data received");
    });
};

export const getSlideshow = (
  id: string,
  host: string = ""
): Promise<ISlideshowData> => {
  return axios
    .get<unknown>(`${host}/api/slideshows/${id}`) // Updated to use new Next.js API route
    .then((res: AxiosResponse<unknown>) => {
      if (res && res.data) {
        // Validate and parse the slideshow data
        return SlideshowActionDataSchema.parse(res.data);
      }
      throw new Error(`Failed to get slideshow ${id}: no data received`);
    });
};

export const deleteSlideshow = (
  id: string,
  host: string = ""
): Promise<IDeleteResponse> => {
  return axios
    .delete(`${host}/api/slideshows/${id}`) // Updated to use new Next.js API route
    .then((res: AxiosResponse<IDeleteResponse>) => {
      // Assuming IDeleteResponse is simple and trusted, or create a Zod schema for it too
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
  data: Partial<
    Omit<
      ISlideshowData,
      "_id" | "slides" | "creator_id" | "creation_date" | "last_update"
    >
  >, // Adjusted Omit
  host: string = ""
): Promise<ISlideshowData> => {
  return axios
    .put<unknown>(`${host}/api/slideshows/${id}`, data) // Updated to use new Next.js API route and PUT method
    .then((res: AxiosResponse<unknown>) => {
      if (res && res.data) {
        // Validate and parse the slideshow data
        return SlideshowActionDataSchema.parse(res.data);
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
    .put<unknown>(`${host}/api/slideshows/${id}`, {
      // Updated to use new Next.js API route with PUT method for reordering
      oldIndex,
      newIndex,
    })
    .then((res: AxiosResponse<unknown>) => {
      if (res && res.data) {
        /*
         * If IReorderResponse needs validation, create its Zod schema
         * For now, assuming it's simple or trusted.
         * If it returns the slideshow, it should be validated.
         */
        const ReorderResponseSchema = z.object({
          message: z.string().optional(),
          slideshow: SlideshowActionDataSchema.optional(),
        });
        return ReorderResponseSchema.parse(res.data);
      }
      throw new Error(
        `Failed to reorder slides for slideshow ${id}: no confirmation received`
      );
    });
};
