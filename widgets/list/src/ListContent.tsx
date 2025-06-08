import React, { Component, CSSProperties } from 'react'
// FontAwesome configuration is handled globally

import AutoScroll from '../../../components/AutoScroll' // Assuming .js or .tsx
// Import IListItem from widget index
import * as z from 'zod'

// Zod schema for IListItem
export const ListItemSchema = z.object({
  text: z.string(),
  label: z.string().nullable().optional(),
})
export type IListItemZod = z.infer<typeof ListItemSchema>; // Exporting inferred type if needed elsewhere

// Zod schema for the list widget's content data
export const ListWidgetContentDataSchema = z.object({
  title: z.string().nullable().optional(),
  color: z.string().optional(), // Background color for the widget
  textColor: z.string().optional(), // Text color for list items
  list: z.array(ListItemSchema).optional(),
  ordered: z.boolean().optional(), // Whether the list is ordered or unordered
  fontSize: z.number().optional(), // Font size for list items
})
export type IListWidgetData = z.infer<typeof ListWidgetContentDataSchema>;

// Zod schema for ListContent component props
export const ListContentPropsSchema = z.object({
  data: ListWidgetContentDataSchema.optional(),
  isPreview: z.boolean().optional(),
})
export type IListContentProps = z.infer<typeof ListContentPropsSchema>;

const DEFAULT_COLOR = '#34495e' // Wet Asphalt from original defaultData
const DEFAULT_TEXT_COLOR = '#ffffff' // White from original defaultData
const DEFAULT_FONT_SIZE = 16 // Default font size from current IListDefaultData
const DEFAULT_ORDERED = false // Default to unordered

class ListContent extends Component<IListContentProps> {
  render() {
    const { data = {} } = this.props
    const {
      title = null,
      textColor = DEFAULT_TEXT_COLOR,
      color = DEFAULT_COLOR,
      list = [], // Default to empty array
      ordered = DEFAULT_ORDERED,
      fontSize = DEFAULT_FONT_SIZE,
    } = data

    const ListTag = ordered ? 'ol' : 'ul'

    const itemStyle: CSSProperties = {
      fontSize: `${fontSize}px`,
      // Other item-specific styles can be added here if needed
    }

    return (
      <div className="box-border h-full w-full flex flex-col overflow-hidden" style={{ background: color, color: textColor }}> {/* Renamed class */}
        {title && (
          <div className='title-container'> {/* Renamed class */}
            <div className='title-text'>{title}</div> {/* Renamed class */}
          </div>
        )}
        <div className="pl-3 flex"> {/* Renamed class */}
          <AutoScroll
            style={{
              display: 'block', // Changed to block for AutoScroll to manage its own layout
              paddingTop: 12,
              paddingBottom: 12,
              flex: 1, // Allow AutoScroll to take available space
              overflowY: 'auto', // Ensure AutoScroll itself can scroll if content exceeds its bounds
              minHeight: 0, // Important for flex children that need to scroll
            }}
          >
            <ListTag className={`list-tag ${ordered ? 'ordered' : 'unordered'}`}>
              {list.map((item, index) => (
                <li key={`list-item-${index}-${item.text.slice(0,10)}` className="flex-row justify-between items-center rounded w-full box-border" style={itemStyle}> {/* Renamed class */}
                  <span className='text-content'>{item.text || 'Insert some text ...'}</span> {/* Renamed class */}
                  {item.label && <div className='label-tag'>{item.label}</div>} {/* Renamed class */}
                </li>
              ))}
            </ListTag>
          </AutoScroll>
        </div>
        
      </div>
    )
  }
}

export default ListContent