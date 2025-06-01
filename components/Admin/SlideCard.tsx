import React, { useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconProp } from '@fortawesome/fontawesome-svg-core'
import { faClock } from '@fortawesome/free-regular-svg-icons'
import { faTrash, faEdit, faPlay, faGlobe, faFileImage, faFileVideo, faFileAlt } from '@fortawesome/free-solid-svg-icons'
import * as z from 'zod'

import SlideEditDialog from './SlideEditDialog' // Removed ISlideEditDialogRef, assuming default export or internal typing
import { deleteSlide, SlideActionDataSchema } from '../../actions/slide' // ISlideData is z.infer<typeof SlideActionDataSchema>

// Zod schema for the 'value' prop, extending SlideActionDataSchema
const SlideCardValueSchema = SlideActionDataSchema.extend({
  order: z.number().optional(),
  title: z.string().optional(), // To cover the ExtendedSlideData interface's title field
})

// Zod schema for SlideCard props
export const SlideCardPropsSchema = z.object({
  value: SlideCardValueSchema,
  refresh: z.function(z.tuple([]), z.void()).optional(),
  // Draggable props would be added here if needed, e.g., using z.any() or more specific schemas
})

// Derive TypeScript type from Zod schema
export type ISlideCardProps = z.infer<typeof SlideCardPropsSchema>;

// Define and export ExtendedSlideData based on the schema for the value prop
export type ExtendedSlideData = z.infer<typeof SlideCardValueSchema>;

const SlideCard: React.FC<ISlideCardProps> = ({ value, refresh = () => {} }) => {
  const [loading, setLoading] = useState(false)
  const dialogRef = useRef<SlideEditDialog>(null)

  const handleEdit = (): void => {
    dialogRef.current?.open()
  }

  const handleDelete = (): void => {
    if (loading) return

    setLoading(true)
    deleteSlide(value._id)
      .then(() => {
        refresh()
        // No need to setLoading(false) if component is unmounted by refresh
      })
      .catch(error => {
        console.error('Failed to delete slide:', error)
        setLoading(false)
      })
  }

  const getThumbnailIcon = (slideType: string): IconProp => {
    switch (slideType) {
      case 'youtube': // Assuming 'youtube' is a value for ISlideData.type
      case 'video': // Or if ISlideData.type can be 'video'
        return faPlay
      case 'web':
        return faGlobe
      case 'image': // Assuming 'image' type
      case 'photo': // From original JS
        return faFileImage
      case 'markdown':
        return faFileAlt
      default:
        return faFileVideo // A generic fallback
    }
  }

  const getThumbnailBackgroundColor = (slideType: string): string => {
    switch (slideType) {
      case 'youtube':
      case 'video':
        return '#c23616' // Dark red
      case 'web':
        return '#0097e6' // Blue
      case 'image':
      case 'photo':
        return 'transparent' // No background if image is shown via backgroundImage
      case 'markdown':
        return '#333' // Dark grey for markdown
      default:
        return '#grey' // Default grey
    }
  }

  const slideTitle = value.title || value.name || 'Untitled slide'
  const slideType = value.type || 'unknown' // Ensure type has a fallback

  // Determine if thumbnail should be an icon or background image
  const showBackgroundImage = slideType === 'image'
  const thumbnailStyle: React.CSSProperties = {
    backgroundImage: showBackgroundImage && value.data ? `url(${value.data})` : 'none',
    backgroundColor: getThumbnailBackgroundColor(slideType),
  }

  return (
    <div className='slide-card'>
      {typeof value.order === 'number' && <div className='order-badge'>{value.order}</div>}
      <div className='left-content'>
        <div className={'thumbnail'} style={thumbnailStyle}>
          {!showBackgroundImage && (
            <FontAwesomeIcon icon={getThumbnailIcon(slideType)} fixedWidth size='lg' color='#FFFFFF' />
          )}
        </div>
      </div>
      <div className='middle-content'>
        <div className='title-text'>{slideTitle}</div>
        <div className='duration-info'>
          <div className='icon'>
            <FontAwesomeIcon icon={faClock} fixedWidth color='#878787' />
          </div>
          <span className='text'>{(value.duration || 0)}s</span> {/* Default duration to 0 */}
        </div>
      </div>
      <div className='right-actions'>
        <div className='action-icon' onClick={handleEdit} role='button' tabIndex={0} onKeyPress={(e) => {if(e.key === 'Enter' || e.key === ' ') handleEdit()}} aria-label='Edit slide'>
          <FontAwesomeIcon icon={faEdit} fixedWidth color='#828282' />
        </div>
        <div className='action-icon' onClick={!loading ? handleDelete : undefined} role='button' tabIndex={!loading ? 0 : -1} onKeyPress={(e) => {if(!loading && (e.key === 'Enter' || e.key === ' ')) handleDelete()}} aria-label='Delete slide' aria-disabled={loading}>
          <FontAwesomeIcon
            icon={faTrash}
            fixedWidth
            color={loading ? '#ccc' : '#828282'} // Dim icon when loading
          />
        </div>
      </div>
      <SlideEditDialog ref={dialogRef} slideId={value._id} refresh={refresh} />
      <style jsx>
        {`
          .slide-card {
            padding: 12px;
            font-family: 'Open Sans', sans-serif;
            border-radius: 4px;
            /* cursor: pointer; */ /* Card itself isn't clickable, actions are */
            background: white;
            margin-top: 10px; /* Adjusted margins */
            margin-bottom: 10px;
            display: flex;
            flex-direction: row;
            align-items: center; /* Vertically align items */
            position: relative;
            z-index: 1;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s ease-in-out;
          }
          .slide-card:hover {
              box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          }

          .order-badge { /* Style for order number */
            position: absolute;
            top: -5px;
            left: -5px;
            background-color: #555;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            z-index: 2;
          }

          .title-text { /* Renamed for clarity */
            font-family: 'Open Sans', sans-serif;
            font-size: 16px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            color: #4f4f4f;
            margin-bottom: 4px; /* Space between title and duration */
          }

          .left-content { /* Renamed */
            justify-content: center;
            padding-right: 12px; /* Increased padding */
          }

          .duration-info { /* Renamed */
            font-family: 'Open Sans', sans-serif;
            font-size: 14px;
            color: #878787;
            display: flex; /* Align icon and text */
            align-items: center;
          }

          .duration-info .icon {
            margin-right: 4px;
          }

          /* .duration-info .text is fine as is */

          .middle-content { /* Renamed */
            font-family: 'Open Sans', sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            /* padding-left: 8px; */ /* Removed, covered by left-content's padding-right */
            padding-right: 8px;
            flex: 1;
            min-width: 0; /* Important for text-overflow to work */
          }

          .right-actions { /* Renamed */
            display: flex;
            flex-direction: row;
            font-family: 'Open Sans', sans-serif;
            align-items: center; /* Vertically center action icons */
            /* padding-left: 8px; */ /* No need, icons have their own margin/padding */
            /* padding-right: 8px; */
          }

          .thumbnail {
            height: 50px; /* Adjusted size */
            width: 50px;
            border-radius: 4px; /* More rounded */
            background-size: cover;
            background-position: center;
            display: flex;
            justify-content: center;
            align-items: center;
            border: 1px solid #eee;
          }

          .action-icon { /* Renamed */
            margin-left: 8px; /* Spacing between icons */
            padding: 8px;
            border-radius: 50%;
            cursor: pointer;
            transition: background-color 0.2s ease-in-out;
          }
          .action-icon:hover {
              background-color: #f0f0f0;
          }
          .action-icon:first-child {
              margin-left: 0;
          }
        `}
      </style>
    </div>
  )
}

// Not wrapped with view() in original, so keeping it that way.
export default SlideCard
