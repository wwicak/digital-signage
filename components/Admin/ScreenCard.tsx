import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconProp } from '@fortawesome/fontawesome-svg-core'
import { faWindowRestore } from '@fortawesome/free-regular-svg-icons'
import { faChromecast } from '@fortawesome/free-brands-svg-icons'
import { faTrash, faTv, faEye, faLink, faEdit } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import * as z from 'zod'
import OrientationPreview from './OrientationPreview'
import DisplayEditDialog from './DisplayEditDialog'

/*
 * Assuming IDisplayData is an interface. We'll define a Zod schema for the 'value' prop
 * that matches the expected structure of IDisplayData used in this component.
 * For a more robust solution, actions/display.ts should export a DisplayActionDataSchema.
 * For now, we define what ScreenCard expects from IDisplayData.
 */
const ScreenCardValueSchema = z.object({
  _id: z.string(),
  name: z.string().optional(), // Based on usage: value.name || 'Untitled Display'
  orientation: z.enum(['landscape', 'portrait']).optional(), // Display orientation
  widgets: z.array(z.union([z.string(), z.object({})])).optional(), // Based on usage: Array.isArray(value.widgets)
  clientCount: z.number(), // Number of clients paired to this display
  isOnline: z.boolean(), // Online status of the display
  /*
   * Add other fields from IDisplayData if they were directly used by ScreenCard and need validation.
   * For this component, only _id, name, and widgets structure seem directly accessed.
   */
})

// Import the original IDisplayData to ensure compatibility or use if it becomes a Zod type later.
import { useDisplayMutations } from '../../hooks/useDisplayMutations'

// Zod schema for ScreenCard props
export const ScreenCardPropsSchema = z.object({
  value: ScreenCardValueSchema, // Use the locally defined Zod schema for the 'value' prop
  refresh: z.function(z.tuple([]), z.void()).optional(),
})

// Derive TypeScript type from Zod schema
export type IScreenCardProps = z.infer<typeof ScreenCardPropsSchema>;
const ScreenCard: React.FC<IScreenCardProps> = ({ value, refresh = () => {} }) => {
  const { deleteDisplay, updateDisplay } = useDisplayMutations()
  const [isUpdatingOrientation, setIsUpdatingOrientation] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleOrientationChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    
    const newOrientation = event.target.value as 'landscape' | 'portrait'
    if (value && value._id && newOrientation !== value.orientation) {
      setIsUpdatingOrientation(true)
      updateDisplay.mutate(
        {
          id: value._id,
          data: { orientation: newOrientation }
        },
        {
          onSuccess: () => {
            setIsUpdatingOrientation(false)
            refresh()
          },
          onError: (error: any) => {
            console.error('Failed to update orientation:', error)
            setIsUpdatingOrientation(false)
          }
        }
      )
    }
  }

  const handleEdit = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    setIsEditDialogOpen(true)
  }

  const handleDelete = (event: React.MouseEvent): void => {
    event.preventDefault() // Prevent Link navigation when clicking delete icon
    event.stopPropagation() // Stop event from bubbling further

    if (value && value._id) {
      const confirmDelete = window.confirm(`Are you sure you want to delete "${value.name || 'Untitled Display'}"?`)
      if (!confirmDelete) return

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
  const widgetCount = value && Array.isArray(value.widgets) ? value.widgets.length : 0

  return (
    // The outer Link wraps the entire card. Clicks on action icons inside need stopPropagation.
    <Link href={`/layout?display=${value?._id || ''}`}>
      <a className="no-underline text-inherit block">
        <div className="p-4 font-sans rounded-lg cursor-pointer bg-white my-10 flex flex-row justify-center relative z-10 shadow-md hover:shadow-lg transition-shadow duration-200">
          <div className="flex justify-center items-center px-2">
            <div className="h-16 w-16 bg-cover flex justify-center items-center border border-gray-200 rounded">
              <FontAwesomeIcon icon={faTv as IconProp} fixedWidth size='lg' color='#7bc043' />
            </div>
          </div>
          <div className="flex flex-col justify-center px-2 flex-1 min-w-0">
            <div className="font-sans text-base overflow-hidden whitespace-nowrap text-ellipsis text-gray-600 mb-2">
              {value?.name || 'Untitled Display'}
            </div>
            <div className="flex flex-row items-center">
              <div className="font-sans text-sm text-gray-500 mr-3 flex items-center">
                <div className="mr-1">
                  <FontAwesomeIcon icon={faWindowRestore as IconProp} fixedWidth color='#878787' />
                </div>
                <span>{widgetCount} widgets</span>
              </div>
              <div className="font-sans text-sm text-gray-500 mr-3 flex items-center">
                <div className="mr-1">
                  <FontAwesomeIcon icon={faChromecast as IconProp} fixedWidth color='#878787' />
                </div>
                <span>
                  {value?.clientCount || 0} client{(value?.clientCount || 0) !== 1 ? 's' : ''} paired
                </span>
              </div>
              <div className="font-sans text-sm text-gray-500 mr-3 flex items-center gap-2">
                <OrientationPreview orientation={value?.orientation || null} />
                <span className="text-xs">
                  {value?.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                </span>
              </div>
              <div className={`font-sans text-sm mr-3 flex items-center ${value?.isOnline ? 'text-green-500' : 'text-red-500'}`}>
                <span className={`text-2xl leading-3 mr-1 ${value?.isOnline ? 'text-green-500' : 'text-red-500'}`}>•</span>
                <span>{value?.isOnline ? 'online' : 'offline'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-row justify-center items-center px-2">
            {/* Edit Display */}
            <div
              className="mx-1 p-2 rounded-full transition-colors duration-200 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              onClick={handleEdit}
              role='button'
              tabIndex={0}
              onKeyPress={(e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') handleEdit(e as any)}}
              aria-label='Edit Display'
            >
              <FontAwesomeIcon icon={faEdit as IconProp} fixedWidth color='#828282' />
            </div>
            {/* Edit Layout Link */}
            <Link href={`/layout?display=${value?._id || ''}`}>
              <a className="mx-1 p-2 rounded-full transition-colors duration-200 hover:bg-gray-100 flex items-center justify-center" onClick={(e) => e.stopPropagation()} aria-label='Edit Layout'>
                <FontAwesomeIcon icon={faEye as IconProp} fixedWidth color='#828282' />
              </a>
            </Link>
            {/* View Display Link */}
            <Link href={`/display/${value?._id || ''}`}>
              <a className="mx-1 p-2 rounded-full transition-colors duration-200 hover:bg-gray-100 flex items-center justify-center" onClick={(e) => e.stopPropagation()} aria-label='View Display'>
                <FontAwesomeIcon icon={faLink as IconProp} fixedWidth color='#828282' />
              </a>
            </Link>
            {/* Delete Action */}
            <div
              className="mx-1 p-2 rounded-full transition-colors duration-200 hover:bg-gray-100 flex items-center justify-center cursor-pointer"
              onClick={handleDelete}
              role='button'
              tabIndex={0}
              onKeyPress={(e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') handleDelete(e as any)}}
              aria-label='Delete Display'
            >
              <FontAwesomeIcon
                icon={faTrash as IconProp}
                fixedWidth
                color='#828282'
              />
            </div>
          </div>

          {/* Edit Dialog */}
          {isEditDialogOpen && (
            <DisplayEditDialog
              display={value ? {
                _id: value._id,
                name: value.name || '',
                orientation: value.orientation,
                layout: 'spaced' // Default layout, could be enhanced to get from display data
              } : null}
              isCreateMode={false}
              onClose={() => setIsEditDialogOpen(false)}
              onSave={() => {
                setIsEditDialogOpen(false);
                refresh();
              }}
            />
          )}
        </div>
      </a>
    </Link>
  )
}

export default ScreenCard
