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
      <div className='list-widget-content' style={{ background: color, color: textColor }}> {/* Renamed class */}
        {title && (
          <div className='title-container'> {/* Renamed class */}
            <div className='title-text'>{title}</div> {/* Renamed class */}
          </div>
        )}
        <div className='list-items-container'> {/* Renamed class */}
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
                <li key={`list-item-${index}-${item.text.slice(0,10)}`} className='list-element' style={itemStyle}> {/* Renamed class */}
                  <span className='text-content'>{item.text || 'Insert some text ...'}</span> {/* Renamed class */}
                  {item.label && <div className='label-tag'>{item.label}</div>} {/* Renamed class */}
                </li>
              ))}
            </ListTag>
          </AutoScroll>
        </div>
        <style jsx>
          {`
            .list-widget-content { /* Renamed */
              position: relative;
              box-sizing: border-box;
              height: 100%;
              width: 100%;
              /* background and color are set via inline style */
              flex: 1; /* Fill parent if flex item */
              font-family: 'Open Sans', sans-serif;
              display: flex;
              flex-direction: column;
              overflow: hidden; /* Prevent content spill */
            }
            .list-widget-content .title-container { /* Renamed */
              padding: 12px;
              flex-shrink: 0; /* Prevent title from shrinking */
            }
            .list-widget-content .title-text { /* Renamed */
              font-family: 'Open Sans', sans-serif;
              border-left: 3px solid rgba(255, 255, 255, 0.5); /* Use current textColor for border? */
              font-size: 1.1em; /* Relative font size */
              padding-left: 12px;
              font-weight: 600;
              text-transform: uppercase;
              z-index: 1; /* If needed over other elements */
            }
            .list-items-container { /* Renamed */
              padding-right: 12px;
              padding-left: 12px;
              display: flex; /* Make it a flex container for AutoScroll */
              flex-direction: column; /* Stack AutoScroll vertically */
              /* justify-content: center; */ /* Removed, let AutoScroll handle content alignment */
              /* align-items: flex-start; */ /* Removed */
              flex: 1; /* Allow this container to grow and shrink */
              overflow: hidden; /* Needed for AutoScroll to work correctly */
              min-height: 0; /* Crucial for flex children that need to scroll */
            }
            .list-tag {
              list-style-position: inside; /* Keep bullets/numbers inside padding */
              padding-left: ${ordered ? '10px' : '20px'}; /* Indent for numbers/bullets */
              margin: 0;
            }
            .list-tag.unordered {
              list-style-type: disc; /* Or square, circle, etc. */
            }
            .list-tag.ordered {
              list-style-type: decimal;
            }
            .list-element { /* Renamed */
              display: flex;
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              background: rgba(0, 0, 0, 0.25); /* Darker item background from original */
              /* color is inherited */
              padding: 8px 12px; /* Adjusted padding */
              margin-bottom: 8px;
              border-radius: 4px;
              width: 100%;
              box-sizing: border-box;
            }
            .list-element:last-child {
              margin-bottom: 0;
            }
            .text-content { /* Renamed */
              flex: 1; /* Allow text to take available space */
              word-break: break-word; /* Break long words */
            }
            .label-tag { /* Renamed */
              display: inline-block;
              background: rgba(255, 255, 255, 0.15); /* Lighter label background from original */
              /* color is inherited */
              padding: 6px 10px; /* Adjusted padding */
              font-weight: 600;
              font-size: 0.85em; /* Relative font size */
              border-radius: 4px;
              /* box-sizing: content-box; */ /* content-box can be tricky, border-box is often safer */
              box-sizing: border-box;
              /* align-self: flex-end; */ /* Removed, let parent flex control alignment */
              margin-left: 8px; /* Space between text and label */
              white-space: nowrap; /* Prevent label from wrapping */
            }
          `}
        </style>
      </div>
    )
  }
}

export default ListContent
