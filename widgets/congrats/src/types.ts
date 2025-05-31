import * as z from 'zod';

// Zod schema for the congrats widget's content data
export const CongratsWidgetContentDataSchema = z.object({
  text: z.string().optional(),
  textColor: z.string().optional(),
  animation: z.string().optional(), // Name of the Lottie animation
  fontSize: z.number().optional(),
  color: z.string().optional(), // Background color
  recipient: z.string().optional(),
});

export type ICongratsWidgetData = z.infer<typeof CongratsWidgetContentDataSchema>;
