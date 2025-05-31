/**
 * @fileoverview Display helper functions for the API
 */

import Display, { IDisplay } from '../models/Display'; // Assuming Display.ts exports IDisplay
import Widget, { IWidget } from '../models/Widget';   // Assuming Widget.ts exports IWidget
import mongoose from 'mongoose';

interface WidgetData {
  name: string;
  type: string; // Consider using an enum like WidgetType if available
  x: number;
  y: number;
  w: number;
  h: number;
  data: any;
  // creator_id will be set by the helper
}

/**
 * Creates widgets for a display.
 * @param {IDisplay} display - The display document to add widgets to.
 * @param {WidgetData[]} widgetsData - An array of widget data objects.
 * @param {mongoose.Types.ObjectId | string} creatorId - The ID of the creator.
 * @returns {Promise<mongoose.Types.ObjectId[]>} - An array of created widget ObjectIds.
 * @throws {Error} If widget creation fails.
 */
export const createWidgetsForDisplay = async (
  display: IDisplay,
  widgetsData: WidgetData[],
  creatorId: mongoose.Types.ObjectId | string
): Promise<mongoose.Types.ObjectId[]> => {
  if (!widgetsData || widgetsData.length === 0) {
    return [];
  }

  const widgetDocsToCreate = widgetsData.map(widget => ({
    ...widget,
    creator_id: creatorId // Assign creator_id to each widget
  }));

  try {
    const createdWidgets = await Widget.insertMany(widgetDocsToCreate);
    const widgetIds = createdWidgets.map(widget => widget._id);
    
    // Add widget IDs to the display's widgets array
    display.widgets.push(...widgetIds); 
    // No need to save display here, as the calling function should be responsible for saving the parent document.
    // await display.save(); // This might be redundant if the caller saves.
    
    return widgetIds;
  } catch (error: any) {
    console.error('Error creating widgets for display:', error);
    // Potentially, clean up created widgets if the process is transactional, though MongoDB makes this complex.
    throw new Error('Failed to create widgets for display.');
  }
};

/**
 * Updates widgets for a display. This can involve creating new ones,
 * updating existing ones, and removing ones not in the new list.
 * @param {IDisplay} display - The display document.
 * @param {Partial<IWidget>[]} newWidgetsData - Array of new widget data. Existing widgets should have _id.
 * @param {mongoose.Types.ObjectId | string} creatorId - The ID of the creator (for new widgets).
 * @returns {Promise<mongoose.Types.ObjectId[]>} - Array of ObjectIds for current widgets.
 * @throws {Error} If widget update process fails.
 */
export const updateWidgetsForDisplay = async (
  display: IDisplay,
  newWidgetsData: Partial<IWidget>[],
  creatorId: mongoose.Types.ObjectId | string
): Promise<mongoose.Types.ObjectId[]> => {
  const widgetsToCreate: WidgetData[] = [];
  const widgetsToUpdate: Partial<IWidget>[] = []; // Assuming IWidget includes _id

  newWidgetsData.forEach(widget => {
    if (widget._id) {
      widgetsToUpdate.push(widget);
    } else {
      // Type assertion might be needed if WidgetData and Partial<IWidget> are very different
      // For now, assume widget data for creation matches WidgetData structure.
      widgetsToCreate.push(widget as WidgetData);
    }
  });

  const createdWidgetIds = await _createWidgets(widgetsToCreate, creatorId);
  const updatedWidgetIds = await _updateWidgets(widgetsToUpdate);

  const allNewWidgetIds = [
    ...createdWidgetIds.map(id => id.toString()),
    ...updatedWidgetIds.map(id => id.toString())
  ];

  // Note: display.widgets contains mongoose.Types.ObjectId[], so mapping to string for comparison
  const currentWidgetIdsStr = display.widgets.map(id => id.toString());
  await _deleteWidgets(currentWidgetIdsStr, allNewWidgetIds);

  // The function should return ObjectIds of all widgets that should currently be on the display
  return [...createdWidgetIds, ...updatedWidgetIds];
};


/**
 * (Private) Creates new widgets.
 * @param {WidgetData[]} newWidgetsData - Array of widget data for new widgets (without _id).
 * @param {mongoose.Types.ObjectId | string} creatorId - The ID of the creator.
 * @returns {Promise<mongoose.Types.ObjectId[]>} - An array of ObjectIds for the created widgets.
 */
const _createWidgets = async (
  newWidgetsData: WidgetData[],
  creatorId: mongoose.Types.ObjectId | string
): Promise<mongoose.Types.ObjectId[]> => {
  if (!newWidgetsData || newWidgetsData.length === 0) {
    return [];
  }
  const createdWidgetObjectIds: mongoose.Types.ObjectId[] = [];
  for (const widgetData of newWidgetsData) {
    try {
      // Widget.create() can take an array, but to handle individual errors as per prompt:
      const newWidget = await Widget.create({
        ...widgetData,
        creator_id: creatorId
      });
      createdWidgetObjectIds.push(newWidget._id);
    } catch (error) {
      console.error('Error creating new widget:', error);
      // Depending on requirements, could throw, or collect errors, or just log and continue
    }
  }
  return createdWidgetObjectIds;
};

/**
 * (Private) Updates existing widgets.
 * @param {Partial<IWidget>[]} widgetsToUpdateData - Array of widget data for existing widgets (must include _id).
 * @returns {Promise<mongoose.Types.ObjectId[]>} - An array of ObjectIds for the updated widgets.
 */
const _updateWidgets = async (
  widgetsToUpdateData: Partial<IWidget>[]
): Promise<mongoose.Types.ObjectId[]> => {
  if (!widgetsToUpdateData || widgetsToUpdateData.length === 0) {
    return [];
  }
  const updatedWidgetObjectIds: mongoose.Types.ObjectId[] = [];
  for (const widgetData of widgetsToUpdateData) {
    if (!widgetData._id) { // Should not happen if logic in calling function is correct
      console.error('Widget data for update is missing _id:', widgetData);
      continue;
    }
    try {
      await Widget.findByIdAndUpdate(widgetData._id, widgetData, { new: true, runValidators: true });
      // Ensure widgetData._id is correctly typed as ObjectId if it comes from client as string
      updatedWidgetObjectIds.push(new mongoose.Types.ObjectId(widgetData._id.toString()));
    } catch (error) {
      console.error(`Error updating widget ${widgetData._id}:`, error);
      // Error handling strategy
    }
  }
  return updatedWidgetObjectIds;
};

/**
 * (Private) Deletes widgets that are not in the new list of widgets.
 * @param {string[]} currentWidgetIds - Array of current widget IDs (as strings).
 * @param {string[]} newWidgetIds - Array of new widget IDs (as strings) that should remain.
 * @returns {Promise<void>}
 */
const _deleteWidgets = async (
  currentWidgetIds: string[],
  newWidgetIds: string[]
): Promise<void> => {
  const widgetsToRemove = currentWidgetIds.filter(id => !newWidgetIds.includes(id));
  if (widgetsToRemove.length > 0) {
    try {
      await Widget.deleteMany({ _id: { $in: widgetsToRemove.map(id => new mongoose.Types.ObjectId(id)) } });
    } catch (error) {
      console.error('Error deleting old widgets:', error);
      // Error handling strategy
    }
  }
};

/**
 * Deletes all widgets associated with a display.
 * @param {IDisplay} display - The display document.
 * @returns {Promise<void>}
 * @throws {Error} If deletion fails.
 */
export const deleteWidgetsForDisplay = async (display: IDisplay): Promise<void> => {
  if (display.widgets && display.widgets.length > 0) {
    try {
      await Widget.deleteMany({ _id: { $in: display.widgets } });
      display.widgets = [];
      // await display.save(); // Caller should save the display
    } catch (error: any) {
      console.error('Error deleting widgets for display:', error);
      throw new Error('Failed to delete widgets for display.');
    }
  }
};

// Example of another helper if needed:
/**
 * Get a display with its widgets populated.
 * @param {string | mongoose.Types.ObjectId} displayId
 * @returns {Promise<IDisplay | null>}
 */
export const getDisplayWithWidgets = async (displayId: string | mongoose.Types.ObjectId): Promise<IDisplay | null> => {
  try {
    const display = await Display.findById(displayId).populate('widgets');
    return display;
  } catch (error) {
    console.error('Error fetching display with widgets:', error);
    return null;
  }
};
