import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconProp } from '@fortawesome/fontawesome-svg-core'
import { faWindowRestore } from '@fortawesome/free-regular-svg-icons'
import { faChromecast } from '@fortawesome/free-brands-svg-icons'
import { faTrash, faTv, faEye, faLink } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import * as z from 'zod'

/*
 * Assuming IDisplayData is an interface. We'll define a Zod schema for the 'value' prop
 * that matches the expected structure of IDisplayData used in this component.
 * For a more robust solution, actions/display.ts should export a DisplayActionDataSchema.
 * For now, we define what ScreenCard expects from IDisplayData.
 */
const ScreenCardValueSchema = z.object({
  _id: z.string(),
  name: z.string().optional(), // Based on usage: value.name || 'Untitled Display'
  widgets: z.array(z.union([z.string(), z.object({})])).optional(), // Based on usage: Array.isArray(value.widgets)
  /*
   * Add other fields from IDisplayData if they were directly used by ScreenCard and need validation.
   * For this component, only _id, name, and widgets structure seem directly accessed.
   */
})

// Import the original IDisplayData to ensure compatibility or use if it becomes a Zod type later.
import { IDisplayData } from '../../actions/display'
import { useDisplayMutations } from '../../hooks/useDisplayMutations'

// Zod schema for ScreenCard props
export const ScreenCardPropsSchema = z.object({
  value: ScreenCardValueSchema, // Use the locally defined Zod schema for the 'value' prop
  refresh: z.function(z.tuple([]), z.void()).optional(),
})

// Derive TypeScript type from Zod schema
export type IScreenCardProps = z.infer<typeof ScreenCardPropsSchema>;
const ScreenCard: React.FC<IScreenCardProps> = ({ value, refresh = () => {} }) => {
  const { deleteDisplay } = useDisplayMutations()

  const handleDelete = (event: React.MouseEvent): void => {
    event.preventDefault() // Prevent Link navigation when clicking delete icon
    event.stopPropagation() // Stop event from bubbling further

    if (value && value._id) {
      deleteDisplay.mutate(
        { id: value._id },
        {
          onSuccess: () => {
            // The mutation automatically updates the global cache,
            // but we still call refresh in case the parent needs to do something
            refresh()
          },
          onError: (error: any) => {
            console.error('Failed to delete display:', error)
            // Optionally, provide user feedback here
          }
        }
      )
    }
  }

  // Fallback for widgets if undefined (though IDisplayData defines it as optional IWidget[] or string[])
  const widgetCount = Array.isArray(value.widgets) ? value.widgets.length : 0

  return (
    // The outer Link wraps the entire card. Clicks on action icons inside need stopPropagation.
    <Link href={`/layout?display=${value._id}`}>
      <a className='card-anchor-wrapper'> {/* Use an anchor tag for proper semantics with Next.js Link */}
        <div className='card'>
          <div className='left'>
            <div className={'thumbnail'}>
              <FontAwesomeIcon icon={faTv as IconProp} fixedWidth size='lg' color='#7bc043' />
            </div>
          </div>
          <div className='middle'>
            <div className='title'>{value.name || 'Untitled Display'}</div>
            <div className='info'>
              <div className='widgetnum'>
                <div className='icon'>
                  <FontAwesomeIcon icon={faWindowRestore as IconProp} fixedWidth color='#878787' />
                </div>
                <span className='text'>{widgetCount} widgets</span>
              </div>
              <div className='clientnum'>
                <div className='icon'>
                  <FontAwesomeIcon icon={faChromecast as IconProp} fixedWidth color='#878787' />
                </div>
                {/* TODO: Client count is hardcoded, should come from data if available */}
                <span className='text'>1 client paired</span>
              </div>
              <div className='online'>
                {/* TODO: Online status is hardcoded, should come from data if available */}
                <span className='text'>online</span>
              </div>
            </div>
          </div>
          <div className='right'>
            {/* Edit Layout Link */}
            <Link href={`/layout?display=${value._id}`}>
              <a className='actionIcon' onClick={(e) => e.stopPropagation()} aria-label='Edit Layout'>
                <FontAwesomeIcon icon={faEye as IconProp} fixedWidth color='#828282' />
              </a>
            </Link>
            {/* View Display Link */}
            <Link href={`/display/${value._id}`}>
              <a className='actionIcon' onClick={(e) => e.stopPropagation()} aria-label='View Display'>
                <FontAwesomeIcon icon={faLink as IconProp} fixedWidth color='#828282' />
              </a>
            </Link>
            {/* Delete Action */}
            <div className='actionIcon' onClick={handleDelete}
              role='button'
              tabIndex={0}
              onKeyPress={(e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') handleDelete(e as any)}}
              aria-label='Delete Display'
            >
              <FontAwesomeIcon
                icon={faTrash as IconProp}
                fixedWidth
                color='#828282'
                // onClick handler is on the parent div to better manage event propagation
              />
            </div>
          </div>
          <style jsx>
            {`
              .card-anchor-wrapper { /* Style for the anchor tag from Next.js Link */
                text-decoration: none;
                color: inherit;
                display: block; /* Make it block to contain the card properly */
              }
              .card {
                padding: 12px;
                font-family: 'Open Sans', sans-serif;
                border-radius: 4px;
                cursor: pointer;
                background: white;
                margin-top: 40px; /* These margins might be better on the parent container */
                margin-bottom: 40px;
                display: flex;
                flex-direction: row;
                justify-content: center; /* This might not be desired if card width is fixed */
                position: relative;
                z-index: 1;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1); /* Added a subtle shadow */
                transition: box-shadow 0.2s ease-in-out;
              }
              .card:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              }

              .title {
                font-family: 'Open Sans', sans-serif;
                font-size: 16px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                color: #4f4f4f;
                margin-bottom: 8px;
              }

              .left {
                font-family: 'Open Sans', sans-serif;
                justify-content: center;
                padding-left: 8px;
                padding-right: 8px;
                display: flex; /* Added to center thumbnail vertically */
                align-items: center;
              }

              .info {
                display: flex;
                flex-direction: row;
                align-items: center; /* Align items in info row */
              }

              .widgetnum,
              .online,
              .clientnum {
                font-family: 'Open Sans', sans-serif;
                font-size: 14px;
                color: #878787;
                margin-right: 12px; /* Increased margin */
                display: flex; /* For icon and text alignment */
                align-items: center;
              }

              .widgetnum .icon,
              /* .online .icon, */ /* Online status uses ::before pseudo-element */
              .clientnum .icon {
                margin-right: 4px;
                /* display: inline; */ /* Not needed with flex */
                /* vertical-align: middle; */ /* Not needed with flex */
              }

              .widgetnum .text,
              .online .text,
              .clientnum .text {
                /* vertical-align: middle; */ /* Not needed with flex */
              }

              .online {
                color: #7bc043;
              }

              .online::before {
                content: '•';
                color: #7bc043;
                font-size: 32px; /* Visual size of dot */
                line-height: 14px; /* Align with text */
                margin-right: 4px; /* Spacing from text */
                vertical-align: middle; /* Better alignment */
              }

              .middle {
                font-family: 'Open Sans', sans-serif;
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding-left: 8px;
                padding-right: 8px;
                flex: 1;
                min-width: 0; /* Prevents text overflow from breaking layout */
              }

              .right {
                display: flex;
                flex-direction: row;
                font-family: 'Open Sans', sans-serif;
                justify-content: center;
                align-items: center;
                padding-left: 8px;
                padding-right: 8px;
              }

              .thumbnail {
                height: 60px;
                width: 60px;
                background-size: cover; /* If using background image */
                display: flex;
                justify-content: center;
                align-items: center;
                border: 1px solid #eee; /* Added a light border */
                border-radius: 4px; /* Rounded corners for thumbnail box */
              }

              .actionIcon {
                margin-right: 8px; /* Adjusted margin */
                margin-left: 8px;
                padding: 8px; /* Added padding to make click target larger */
                border-radius: 50%; /* Circular background for hover effect */
                transition: background-color 0.2s ease-in-out;
                display: flex; /* For centering icon if needed */
                align-items: center;
                justify-content: center;
              }
              .actionIcon:hover {
                background-color: #f0f0f0; /* Hover effect */
              }
              .actionIcon:last-child {
                  margin-right: 0; /* Remove margin for last icon */
              }
            `}
          </style>
        </div>
      </a>
    </Link>
  )
}

export default ScreenCard
