import { z } from "zod";

export const CreateSlideshowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  slide_ids: z.array(z.string()).optional().default([]),
  is_enabled: z.boolean().optional().default(true),
});

export const UpdateSlideshowSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  slide_ids: z.array(z.string()).optional(),
  is_enabled: z.boolean().optional(),
  oldIndex: z.number().optional(),
  newIndex: z.number().optional(),
});
