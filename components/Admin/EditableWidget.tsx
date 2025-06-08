import React, { useRef } from 'react'
import { Settings, X } from 'lucide-react'

import Widgets from '../../widgets'
import { IBaseWidget } from '../../widgets/base_widget'
import WidgetEditDialog from './WidgetEditDialog'
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
  const WidgetIcon = widgetDefinition?.icon || X // Default icon if not found

  return (
    <div className="relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="absolute top-2 right-2 flex space-x-1">
        <button
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          onClick={openDialog}
          aria-label="Edit widget"
        >
          <Settings className="w-4 h-4 text-gray-500" />
        </button>
        <button
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          onClick={handleDeleteClick}
          aria-label="Delete widget"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="flex flex-col items-center justify-center h-full min-h-24">
        <div className="mb-2">
          <WidgetIcon className="w-8 h-8 text-primary" />
        </div>
        <span className="text-sm font-medium text-gray-600 text-center">{widgetName}</span>
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