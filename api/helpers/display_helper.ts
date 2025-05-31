/**
 * @fileoverview Display helper functions for the API
 */

import Display, { IDisplay } from '../models/Display' // Assuming Display.ts exports IDisplay
import Widget, { IWidget } from '../models/Widget' // Assuming Widget.ts exports IWidget
import mongoose from 'mongoose'

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
    return []
  }

  const widgetDocsToCreate = widgetsData.map((widget) => ({
    ...widget,
    creator_id: creatorId, // Assign creator_id to each widget
  }))

  try {
    const createdWidgets = await Widget.insertMany(widgetDocsToCreate)
    const widgetIds = createdWidgets.map(
      (widget) => widget._id as mongoose.Types.ObjectId
    )

    // Add widget IDs to the display's widgets array
    display.widgets.push(...widgetIds)
    /*
     * No need to save display here, as the calling function should be responsible for saving the parent document.
     * await display.save(); // This might be redundant if the caller saves.
     */

    return widgetIds
  } catch (error: any) {
    console.error('Error creating widgets for display:', error)
    // Potentially, clean up created widgets if the process is transactional, though MongoDB makes this complex.
    throw new Error('Failed to create widgets for display.')
  }
}

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
  newWidgetsData: Partial<IWidget>[], // Widgets can be partial for update, new ones won't have _id
  creatorId: mongoose.Types.ObjectId | string
): Promise<mongoose.Types.ObjectId[]> => {
  const currentWidgetIds = display.widgets.map((id) => id.toString())
  const newWidgetIds: string[] = []
  const updatedWidgetObjectIds: mongoose.Types.ObjectId[] = []

  // Update existing widgets or create new ones
  for (const widgetData of newWidgetsData) {
    if (widgetData._id) {
      // Existing widget
      const widgetIdStr = widgetData._id.toString()
      newWidgetIds.push(widgetIdStr)
      try {
        await Widget.findByIdAndUpdate(widgetData._id, widgetData, {
          new: true,
          runValidators: true,
        })
        updatedWidgetObjectIds.push(
          new mongoose.Types.ObjectId(widgetData._id as string)
        )
      } catch (error) {
        console.error(`Error updating widget ${widgetData._id}:`, error)
        // Decide if one failed update should stop the whole process
      }
    } else {
      // New widget
      try {
        const newWidget = new Widget({
          ...widgetData,
          creator_id: creatorId,
        })
        const savedWidget = await newWidget.save()
        newWidgetIds.push(
          (savedWidget._id as mongoose.Types.ObjectId).toString()
        )
        updatedWidgetObjectIds.push(savedWidget._id as mongoose.Types.ObjectId)
      } catch (error) {
        console.error('Error creating new widget:', error)
      }
    }
  }

  // Identify and remove widgets that are no longer in the display
  const widgetsToRemove = currentWidgetIds.filter(
    (id) => !newWidgetIds.includes(id)
  )
  if (widgetsToRemove.length > 0) {
    try {
      await Widget.deleteMany({
        _id: {
          $in: widgetsToRemove.map((id) => new mongoose.Types.ObjectId(id)),
        },
      })
    } catch (error) {
      console.error('Error deleting old widgets:', error)
      // Decide error handling strategy
    }
  }

  /*
   * Update the display's widget list
   * display.widgets = updatedWidgetObjectIds; // This line was in the original JS, ensure it's correct
   * Caller is usually responsible for saving the parent 'display' document after this helper returns.
   * If this helper is meant to be fully self-contained for widget manipulation including parent update:
   * display.widgets = updatedWidgetObjectIds;
   * await display.save();
   */

  return updatedWidgetObjectIds // Return the final list of widget IDs for the display
}

/**
 * Deletes all widgets associated with a display.
 * @param {IDisplay} display - The display document.
 * @returns {Promise<void>}
 * @throws {Error} If deletion fails.
 */
export const deleteWidgetsForDisplay = async (
  display: IDisplay
): Promise<void> => {
  if (display.widgets && display.widgets.length > 0) {
    try {
      await Widget.deleteMany({ _id: { $in: display.widgets } })
      display.widgets = []
      // await display.save(); // Caller should save the display
    } catch (error: any) {
      console.error('Error deleting widgets for display:', error)
      throw new Error('Failed to delete widgets for display.')
    }
  }
}

// Example of another helper if needed:
/**
 * Get a display with its widgets populated.
 * @param {string | mongoose.Types.ObjectId} displayId
 * @returns {Promise<IDisplay | null>}
 */
export const getDisplayWithWidgets = async (
  displayId: string | mongoose.Types.ObjectId
): Promise<IDisplay | null> => {
  try {
    const display = await Display.findById(displayId).populate('widgets')
    return display
  } catch (error) {
    console.error('Error fetching display with widgets:', error)
    return null
  }
}
