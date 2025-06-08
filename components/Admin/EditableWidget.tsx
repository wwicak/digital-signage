import React, { useRef } from 'react'
import {
  faTimes,
  faCog,
} from '@fortawesome/free-solid-svg-icons'

// FontAwesome configuration is handled globally

import Widgets from '../../widgets'
import { IBaseWidget } from '../../widgets/base_widget'
import WidgetEditDialog from './WidgetEditDialog' // Removed IWidgetEditDialog import assuming it's default export or typed internally
import * as z from 'zod'
import { WidgetType, WidgetTypeZod } from '@/lib/models/Widget' // Import enum and its Zod schema

// Zod schema for EditableWidget props
export const EditableWidgetPropsSchema = z.object({
  id: z.string(),
  type: WidgetTypeZod.default(WidgetType.SLIDESHOW), // Default to slideshow type
  onDelete: z.function(z.tuple([]), z.void()), // Function with no args, returns void
  layout: z.enum(['spaced', 'compact']).default('spaced'), // Default to spaced layout
  /*
   * react-grid-layout props like 'style', 'className', 'data-grid' are omitted
   * as they are typically handled by RGL and not directly used by this component's logic.
   */
})

// Derive TypeScript type from Zod schema
export type IEditableWidgetProps = z.infer<typeof EditableWidgetPropsSchema>;

const EditableWidget: React.FC<IEditableWidgetProps> = ({ id, type = WidgetType.SLIDESHOW, onDelete, layout = 'spaced' }) => {
  // Using useRef hook instead of createRef
  const dialogRef = useRef<WidgetEditDialog>(null)

  const openDialog = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation()
    dialogRef.current?.open()
  }

  const handleDeleteClick = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation()
    onDelete() // Call the onDelete prop passed from parent
  }

  // Retrieve widget definition from the global Widgets object
  const widgetDefinition: IBaseWidget | undefined = Widgets[type]

  const widgetName = widgetDefinition?.name || 'Broken Widget'
  const widgetIcon = widgetDefinition?.icon || faTimes // Default icon if not found

  return (
    <div className={'widget-editable-container'}>
      <div className={'controls'}>
        <div className={'edit-btn'} onClick={openDialog} role='button' tabIndex={0}>
          <<Settings className={'xs' />
        </div>
        <div className={'delete-btn' className="w-4 h-4" /> onClick={handleDeleteClick} role='button' tabIndex={0}>
          <<X className={'xs' />
        </div>
      </div>
      <div className={'info' className="w-4 h-4" />>
        <div className={'icon-display'}>
          <<widgetIcon  className={'2x' className="w-4 h-4" /> /> {/* Cast to  */}
        </div>
        <span className={'type-name'}>{widgetName}</span>
      </div>
      <WidgetEditDialog
        ref={dialogRef}
        OptionsComponent={widgetDefinition?.Options as any}
        widgetId={id} // Pass widgetId instead of id if that's what WidgetEditDialog expects
        widgetType={type} // Pass widgetType for context in dialog
      />
      
    </div>
  )
}

export default EditableWidget