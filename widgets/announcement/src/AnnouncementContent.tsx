import React from 'react'
import AnnouncementCard from './AnnouncementCard'
import * as z from 'zod'

// Zod schema for the announcement widget's content data, matching the new card design
export const AnnouncementWidgetContentDataSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  category: z.string().optional(),
  type: z.enum(["alert", "info", "success", "general"]).optional(),
})
export type IAnnouncementWidgetData = z.infer<typeof AnnouncementWidgetContentDataSchema>;

// Zod schema for AnnouncementContent component props
export const AnnouncementContentPropsSchema = z.object({
  data: AnnouncementWidgetContentDataSchema.optional(),
  isPreview: z.boolean().optional(),
})
export type IAnnouncementContentProps = z.infer<typeof AnnouncementContentPropsSchema>;

const AnnouncementContent: React.FC<IAnnouncementContentProps> = React.memo(({ data = {}, isPreview }) => {
  const {
    title = "Important Announcement",
    content = "This is an important announcement. Please read carefully.",
    date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    time = "All Day",
    priority = "medium" as const,
    category = "General",
    type = "general" as const,
  } = data;

  return (
    <div className="w-full h-full">
      <AnnouncementCard
        title={title}
        content={content}
        date={date}
        time={time}
        priority={priority}
        category={category}
        type={type}
      />
    </div>
  )
})

AnnouncementContent.displayName = 'AnnouncementContent'

export default AnnouncementContent