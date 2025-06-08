import React, { useRef, useState } from "react";
import { Settings, X } from "lucide-react";

import Widgets from "../../widgets";
import { IBaseWidget } from "../../widgets/base_widget";
import WidgetEditDialog from "./WidgetEditDialog";
import * as z from "zod";
import { WidgetType, WidgetTypeZod } from "@/lib/models/Widget"; // Import enum and its Zod schema

// Zod schema for EditableWidget props
export const EditableWidgetPropsSchema = z.object({
  id: z.string(),
  type: WidgetTypeZod.default(WidgetType.SLIDESHOW), // Default to slideshow type
  onDelete: z.function(z.tuple([]), z.void()), // Function with no args, returns void
  layout: z.enum(["spaced", "compact"]).default("spaced"), // Default to spaced layout
  /*
   * react-grid-layout props like 'style', 'className', 'data-grid' are omitted
   * as they are typically handled by RGL and not directly used by this component's logic.
   */
});

// Derive TypeScript type from Zod schema
export type IEditableWidgetProps = z.infer<typeof EditableWidgetPropsSchema>;

const EditableWidget: React.FC<IEditableWidgetProps> = ({
  id,
  type = WidgetType.SLIDESHOW,
  onDelete,
  layout = "spaced",
}) => {
  // Using useRef hook instead of createRef
  const dialogRef = useRef<WidgetEditDialog>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const openDialog = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation();
    dialogRef.current?.open();
  };

  const handleDeleteClick = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation();
    setShowDeleteConfirm(false);
    onDelete(); // Call the onDelete prop passed from parent
  };

  const cancelDelete = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  // Retrieve widget definition from the global Widgets object
  const widgetDefinition: IBaseWidget | undefined = Widgets[type];

  const widgetName = widgetDefinition?.name || "Broken Widget";
  const WidgetIcon = widgetDefinition?.icon || X; // Default icon if not found

  return (
    <>
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
          <span className="text-sm font-medium text-gray-600 text-center">
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
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Widget</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {widgetName}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditableWidget;
