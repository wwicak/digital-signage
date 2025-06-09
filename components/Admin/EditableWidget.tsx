import React, { useRef, useState, memo, useCallback } from "react";
import { Settings, X } from "lucide-react";

import Widgets from "../../widgets";
import { IBaseWidget } from "../../widgets/base_widget";
import WidgetEditDialog from "./WidgetEditDialog";
import DeleteWidgetModal from "./DeleteWidgetModal";
import * as z from "zod";
import { WidgetType, WidgetTypeZod } from "@/lib/models/Widget"; // Import enum and its Zod schema

// Zod schema for EditableWidget props
export const EditableWidgetPropsSchema = z.object({
  id: z.string(),
  type: WidgetTypeZod.default(WidgetType.SLIDESHOW), // Default to slideshow type
  onDelete: z.function(z.tuple([]), z.union([z.void(), z.promise(z.void())])), // Function with no args, returns void or Promise<void>
  layout: z.enum(["spaced", "compact"]).default("spaced"), // Default to spaced layout
  /*
   * react-grid-layout props like 'style', 'className', 'data-grid' are omitted
   * as they are typically handled by RGL and not directly used by this component's logic.
   */
});

// Derive TypeScript type from Zod schema
export type IEditableWidgetProps = z.infer<typeof EditableWidgetPropsSchema>;

const EditableWidget: React.FC<IEditableWidgetProps> = memo(({
  id,
  type = WidgetType.SLIDESHOW,
  onDelete,
  layout: _layout = "spaced",
}) => {
  // Using useRef hook instead of createRef
  const dialogRef = useRef<WidgetEditDialog>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const openDialog = useCallback((e?: React.MouseEvent): void => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    console.log('[DEBUG] Opening widget configuration dialog for widget ID:', id);
    dialogRef.current?.open();
  }, [id]);

  const handleDeleteClick = useCallback((e?: React.MouseEvent): void => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setShowDeleteConfirm(true);
  }, []);



  // Retrieve widget definition from the global Widgets object
  const widgetDefinition: IBaseWidget | undefined = Widgets[type];

  const widgetName = widgetDefinition?.name || "Broken Widget";
  const WidgetIcon = widgetDefinition?.icon || X; // Default icon if not found

  return (
    <>
      <div className='group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow w-full h-full cursor-grab active:cursor-grabbing'>
        <div className='absolute top-2 right-2 flex space-x-1 controls no-drag z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
          <button
            className='p-2 rounded hover:bg-gray-100 transition-colors bg-white/90 backdrop-blur-sm shadow-sm'
            onClick={openDialog}
            aria-label='Edit widget'
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onDragStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Settings className='w-4 h-4 text-gray-500' />
          </button>
          <button
            className='p-2 rounded hover:bg-gray-100 transition-colors bg-white/90 backdrop-blur-sm shadow-sm hover:bg-red-50 hover:text-red-600'
            onClick={handleDeleteClick}
            aria-label='Delete widget'
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onDragStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <X className='w-4 h-4 text-gray-500' />
          </button>
        </div>
        <div className='flex flex-col items-center justify-center h-full min-h-24 select-none'>
          <div className='mb-2'>
            <WidgetIcon className='w-8 h-8 text-primary' />
          </div>
          <span className='text-sm font-medium text-gray-600 text-center'>
            {widgetName}
          </span>
        </div>
        <WidgetEditDialog
          ref={dialogRef}
          OptionsComponent={widgetDefinition?.Options as any}
          widgetId={id} // Pass widgetId instead of id if that's what WidgetEditDialog expects
          widgetType={type} // Pass widgetType for context in dialog
        />
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteWidgetModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={onDelete}
        widgetName={widgetName}
        widgetType={type}
      />
    </>
  );
});

EditableWidget.displayName = 'EditableWidget';

export default EditableWidget;
