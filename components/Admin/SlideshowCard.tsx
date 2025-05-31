import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconProp } from '@fortawesome/fontawesome-svg-core'
import { faClock, faImages } from '@fortawesome/free-regular-svg-icons'
import { faTrash, faPlay } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import * as z from 'zod'

import { deleteSlideshow, ISlideshowData, SlideshowActionDataSchema } from '../../actions/slideshow'
import { ISlideData } from '../../actions/slide' // This is z.infer<typeof SlideActionDataSchema>
import { useDisplayContext } from '../../contexts/DisplayContext'

// Zod schema for SlideshowCard props
export const SlideshowCardPropsSchema = z.object({
  value: SlideshowActionDataSchema, // Use the Zod schema for slideshow data
  refresh: z.function(z.tuple([]), z.void()).optional(), // Function with no args, returns void, optional
})

// Derive TypeScript type from Zod schema
export type ISlideshowCardProps = z.infer<typeof SlideshowCardPropsSchema>;

const SlideshowCard: React.FC<ISlideshowCardProps> = ({ value, refresh = () => {} }) => {
  const { state: displayState } = useDisplayContext()
  const handleDelete = (event: React.MouseEvent): void => {
    event.preventDefault() // Prevent Link navigation when clicking delete icon
    event.stopPropagation() // Stop event from bubbling further

    if (value && value._id) {
      deleteSlideshow(value._id)
        .then(() => {
          refresh()
        })
        .catch(error => {
          console.error('Failed to delete slideshow:', error)
          // Optionally, provide user feedback here
        })
    }
  }

  const calculateTotalDuration = (): number => {
    if (value && value.slides && value.slides.length > 0) {
      // Check if slides are populated (ISlideData) or just IDs (string)
      if (typeof value.slides[0] === 'object') {
        // Slides are populated ISlideData objects
        return (value.slides as ISlideData[]).reduce((acc, slide) => acc + (slide.duration || 0), 0)
      }
      /*
       * If slides are just string IDs, we cannot calculate duration here without fetching them.
       * For now, return 0 or indicate 'unknown'.
       * This might require fetching populated slides if duration is critical.
       */
      console.warn('SlideshowCard: Slides are not populated, cannot calculate total duration.')
      return 0
    }
    return 0
  }

  const totalDuration = calculateTotalDuration()
  const slideCount = value.slides ? value.slides.length : 0
  const displayId = displayState.id || '' // Fallback if displayState.id is null

  // Original JS used value.title, ISlideshowData uses value.name
  const slideshowTitle = value.name || 'Untitled Slideshow'

  return (
    <Link href={`/slideshow/${value._id}?display=${displayId}`}>
      <a className='slideshow-card-anchor'> {/* Use an anchor tag for proper semantics */}
        <div className='slideshow-card'> {/* Renamed class */}
          <div className='left-content'> {/* Renamed class */}
            <div
              className={'thumbnail'}
              style={{
                /*
                 * backgroundImage: value.data was for SlideCard, not SlideshowCard.
                 * Slideshows usually don't have a single 'data' URL for thumbnail.
                 * Using a generic icon or placeholder color.
                 */
                backgroundColor: '#4a90e2', // Example color
              }}
            >
              <FontAwesomeIcon icon={faPlay as IconProp} fixedWidth size='lg' color='#FFFFFF' />
            </div>
          </div>
          <div className='middle-content'> {/* Renamed class */}
            <div className='title-text'>{slideshowTitle}</div> {/* Renamed class */}
            <div className='info'>
              <div className='duration-info'> {/* Renamed class */}
                <div className='icon'>
                  <FontAwesomeIcon icon={faClock as IconProp} fixedWidth color='#878787' />
                </div>
                <span className='text'>{totalDuration}s</span>
              </div>
              <div className='slidenum-info'> {/* Renamed class */}
                <div className='icon'>
                  <FontAwesomeIcon icon={faImages as IconProp} fixedWidth color='#878787' />
                </div>
                <span className='text'>{slideCount} slides</span> {/* Changed from just count */}
              </div>
            </div>
          </div>
          <div className='right-actions'> {/* Renamed class */}
            <div
              className='action-icon'
              onClick={handleDelete}
              role='button'
              tabIndex={0}
              onKeyPress={(e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') handleDelete(e as any)}}
              aria-label='Delete Slideshow'
            >
              <FontAwesomeIcon
                icon={faTrash as IconProp}
                fixedWidth
                color='#828282'
              />
            </div>
          </div>
          <style jsx>
            {`
              .slideshow-card-anchor {
                text-decoration: none;
                color: inherit;
                display: block;
              }
              .slideshow-card { /* Renamed */
                padding: 12px;
                font-family: 'Open Sans', sans-serif;
                border-radius: 4px;
                cursor: pointer;
                background: white;
                margin-top: 20px; /* Adjusted margins */
                margin-bottom: 20px;
                display: flex;
                flex-direction: row;
                align-items: center; /* Vertically align items */
                position: relative;
                z-index: 1;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                transition: box-shadow 0.2s ease-in-out;
              }
              .slideshow-card:hover {
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
              }

              .title-text { /* Renamed */
                font-family: 'Open Sans', sans-serif;
                font-size: 16px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                color: #4f4f4f;
                margin-bottom: 8px;
              }

              .left-content { /* Renamed */
                /* justify-content: center; */ /* Not needed if thumbnail has fixed size */
                padding-left: 8px; /* Outer padding for card */
                padding-right: 12px; /* Space between thumb and middle */
                display: flex; /* Align item center */
                align-items: center;
              }

              .info {
                display: flex;
                flex-direction: row;
                align-items: center;
              }

              .duration-info, /* Renamed */
              .slidenum-info { /* Renamed */
                font-family: 'Open Sans', sans-serif;
                font-size: 14px;
                color: #878787;
                display: flex; /* Align icon and text */
                align-items: center;
              }

              .duration-info .icon, /* Renamed */
              .slidenum-info .icon { /* Renamed */
                margin-right: 4px;
              }

              /* .duration-info .text, .slidenum-info .text are fine */

              .duration-info { /* Renamed */
                margin-right: 12px;
              }

              .middle-content { /* Renamed */
                font-family: 'Open Sans', sans-serif;
                display: flex;
                flex-direction: column;
                justify-content: center;
                /* padding-left: 8px; */ /* Handled by left-content */
                padding-right: 8px;
                flex: 1;
                min-width: 0; /* For text-overflow */
              }

              .right-actions { /* Renamed */
                display: flex;
                flex-direction: row;
                font-family: 'Open Sans', sans-serif;
                align-items: center; /* Vertically center action icon */
                padding-left: 8px;
                padding-right: 8px; /* Outer padding for card */
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
                border: 1px solid #eee; /* Light border for thumbnail */
              }

              .action-icon { /* Renamed */
                /* margin-right: 8px; */ /* Only one action icon, no need for right margin */
                /* margin-left: 8px; */
                padding: 8px;
                border-radius: 50%;
                cursor: pointer;
                transition: background-color 0.2s ease-in-out;
              }
              .action-icon:hover {
                background-color: #f0f0f0;
              }
            `}
          </style>
        </div>
      </a>
    </Link>
  )
}

export default SlideshowCard
