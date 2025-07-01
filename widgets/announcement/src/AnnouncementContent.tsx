import React from 'react'
import { AlertTriangle } from 'lucide-react'

import AutoScroll from '../../../components/AutoScroll'
import * as z from 'zod'

// Zod schema for the announcement widget's content data, matching the component's internal usage
export const AnnouncementWidgetContentDataSchema = z.object({
  text: z.string().optional(),
  color: z.string().optional(), // Background color for the widget content
  textColor: z.string().optional(), // Text color for the main content
  titleTextColor: z.string().optional(), // Text color for the "Announcement" title bar
  accentColor: z.string().optional(), // Color for accents like the border-left of title bar
  title: z.string().optional(), // Optional title for the announcement content itself (not widget frame)
})
export type IAnnouncementWidgetData = z.infer<typeof AnnouncementWidgetContentDataSchema>;

// Zod schema for AnnouncementContent component props
export const AnnouncementContentPropsSchema = z.object({
  data: AnnouncementWidgetContentDataSchema.optional(),
  isPreview: z.boolean().optional(),
})
export type IAnnouncementContentProps = z.infer<typeof AnnouncementContentPropsSchema>;

const DEFAULT_COLOR = '#708090' // Slate gray
const DEFAULT_TEXT_COLOR = '#ffffff' // White
const DEFAULT_ACCENT_COLOR = '#EDC951' // Goldenrod
const DEFAULT_TEXT = ''
const DEFAULT_TITLE_TEXT_COLOR = '#fff0f0' // Snow

const AnnouncementContent: React.FC<IAnnouncementContentProps> = React.memo(({ data = {}, isPreview }) => {
  const text = data.text ?? DEFAULT_TEXT
  const textColor = data.textColor ?? DEFAULT_TEXT_COLOR
  const titleTextColor = data.titleTextColor ?? DEFAULT_TITLE_TEXT_COLOR
  const color = data.color ?? DEFAULT_COLOR
  const accentColor = data.accentColor ?? DEFAULT_ACCENT_COLOR

  return (
    <div className='relative box-border h-full w-full' style={{ backgroundColor: color }}>
      <div className='title-bar' style={{ color: titleTextColor, borderLeftColor: accentColor }}>
        <div className='icon'>
          <AlertTriangle style={{ fontSize: '0.9em', color: accentColor }} />
        </div>
        <span>Announcement{isPreview ? ' (Preview)' : ''}</span>
      </div>
      <AutoScroll style={{ display: 'block', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div className='text-content' style={{ color: textColor }}>
          {text.split('\n').map((line, index) => (
            <div key={`line-${index}`}>{line || <br />}</div>
          ))}
        </div>
      </AutoScroll>
      
    </div>
  )
})

AnnouncementContent.displayName = 'AnnouncementContent'

export default AnnouncementContent