import React, { useRef, useState, memo, useCallback } from "react";
import { Settings, X, GripVertical } from "lucide-react";

import Widgets from "../../widgets";
import { IBaseWidget } from "../../widgets/base_widget";
import WidgetEditDialog from "../Admin/WidgetEditDialog";
import DeleteWidgetModal from "../Admin/DeleteWidgetModal";
import * as z from "zod";
import { WidgetType, WidgetTypeZod } from "@/lib/models/Widget";

// Zod schema for GridStackEditableWidget props
export const GridStackEditableWidgetPropsSchema = z.object({
  id: z.string(),
  type: WidgetTypeZod.default(WidgetType.SLIDESHOW),
  onDelete: z.function(z.tuple([]), z.union([z.void(), z.promise(z.void())])),
  layout: z.enum(["spaced", "compact"]).default("spaced"),
});

// Derive TypeScript type from Zod schema
export type IGridStackEditableWidgetProps = z.infer<typeof GridStackEditableWidgetPropsSchema>;

const GridStackEditableWidget: React.FC<IGridStackEditableWidgetProps> = memo(({
  id,
  type = WidgetType.SLIDESHOW,
  onDelete,
  layout: _layout = "spaced",
}) => {
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
  const WidgetIcon = widgetDefinition?.icon || X;

  return (
    <div className='group relative bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow w-full h-full'>
      {/* Drag Handle - GridStack specific */}
      <div className='gridstack-drag-handle absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-move z-10'>
        <div className='p-1 rounded bg-white/90 backdrop-blur-sm shadow-sm'>
          <GripVertical className='w-4 h-4 text-gray-500' />
        </div>
      </div>

      {/* Controls - positioned to not interfere with drag handle */}
      <div className='absolute top-2 right-2 flex space-x-1 controls gridstack-no-drag z-10 group-hover:z-30 opacity-0 group-hover:opacity-100 transition-all duration-200'>
        <button
          className='p-2 rounded hover:bg-gray-100 transition-colors bg-white/90 backdrop-blur-sm shadow-sm'
          onClick={openDialog}
          aria-label='Edit widget'
        >
          <Settings className='w-4 h-4 text-gray-500' />
        </button>
        <button
          className='p-2 rounded hover:bg-gray-100 transition-colors bg-white/90 backdrop-blur-sm shadow-sm hover:bg-red-50 hover:text-red-600'
          onClick={handleDeleteClick}
          aria-label='Delete widget'
        >
          <X className='w-4 h-4 text-gray-500' />
        </button>
      </div>

      {/* Widget content */}
      <div className='relative flex flex-col items-center justify-center h-full min-h-24 p-4 pt-8'>
        <div className='mb-2'>
          <WidgetIcon className='w-8 h-8 text-primary' />
        </div>
        <span className='text-sm font-medium text-gray-600 text-center'>
          {widgetName}
        </span>
      </div>

      <WidgetEditDialog
        ref={dialogRef}
        OptionsComponent={widgetDefinition?.Options}
        widgetId={id}
        widgetType={type}
      />

      {/* Delete Confirmation Modal */}
      <DeleteWidgetModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={onDelete}
        widgetName={widgetName}
        widgetType={type}
      />
    </div>
  );
});

GridStackEditableWidget.displayName = 'GridStackEditableWidget';

export default GridStackEditableWidget;
