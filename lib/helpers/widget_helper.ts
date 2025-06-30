/**
 * @fileoverview Widget helper functions for the API
 */

import Widget, { IWidget, WidgetType } from "../models/Widget"; // Assuming Widget.ts exports IWidget and WidgetType enum
import Display from "../models/Display"; // Assuming Display.ts exports IDisplay
// Removed unused Slideshow import - validation not implemented
import mongoose from "mongoose";
import { Request, Response } from "express"; // For typing req/res
import { sendEventToDisplay } from "../sse_manager"; // Added import
import { validateWidgetData as validateWidgetDataTypeSafe } from "./widget_helper_validation"; // Import type-safe validation

/**
 * Finds all Display IDs that are currently using a given widget.
 * @param {string | mongoose.Types.ObjectId} widgetId - The ID of the widget.
 * @returns {Promise<string[]>} A promise that resolves to an array of unique display IDs (as strings).
 * @throws {Error} If there's an issue with database queries.
 */
export async function getDisplayIdsForWidget(
  widgetId: string | mongoose.Types.ObjectId
): Promise<string[]> {
  try {
    const wId =
      typeof widgetId === "string"
        ? new mongoose.Types.ObjectId(widgetId)
        : widgetId;

    const displays = await Display.find({
      widgets: wId, // Check if widgetId is in the 'widgets' array
    })
      .select("_id")
      .lean();

    if (!displays || displays.length === 0) {
      return [];
    }

    // Using Set to ensure uniqueness and converting ObjectId to string
    const displayIds = Array.from(
      new Set(displays.map((display) => display._id.toString()))
    );

    return displayIds;
  } catch (error) {
    console.error("Error fetching display IDs for widget:", error);
    throw error; // Rethrow to be handled by the caller
  }
}

// Define interface for cleaner typing, adjust as needed based on actual widget data structure
interface MockWidgetData {
  _id: string | { equals: (val: string) => boolean };
  display: string;
  // Add other widget properties if necessary
}

/**
 * Validates widget data based on its type.
 * @param {WidgetType} type - The type of the widget.
 * @param {any} data - The data object for the widget.
 * @returns {Promise<boolean>} True if data is valid, false otherwise.
 * @throws {Error} If validation fails with a specific message.
 */
/**
 * Validates widget data based on its type.
 * Delegates to type-safe validation function.
 */
export const validateWidgetData = validateWidgetDataTypeSafe;

/**
 * Removes a widget from all displays that contain it.
 * @param {string | mongoose.Types.ObjectId} widgetId - The ID of the widget to remove.
 * @returns {Promise<void>}
 * @throws {Error} If updating displays fails.
 */
export const removeWidgetFromAllDisplays = async (
  widgetId: string | mongoose.Types.ObjectId
): Promise<void> => {
  const idToRemove =
    typeof widgetId === "string"
      ? new mongoose.Types.ObjectId(widgetId)
      : widgetId;

  try {
    await Display.updateMany(
      { widgets: idToRemove },
      { $pull: { widgets: idToRemove } }
    );
  } catch (error) { // TypeScript will infer error as unknown
    console.error(`Error removing widget ${idToRemove} from displays:`, error);
    throw new Error("Failed to remove widget from displays.");
  }
};

/**
 * Deletes a widget and also removes its references from any displays.
 * @param {string | mongoose.Types.ObjectId} widgetId - The ID of the widget to delete.
 * @returns {Promise<IWidget | null>} The deleted widget document or null if not found.
 * @throws {Error} If deletion or reference cleaning fails.
 */
export const deleteWidgetAndCleanReferences = async (
  widgetId: string | mongoose.Types.ObjectId,
  dependencies: {
    getDisplayIds?: typeof getDisplayIdsForWidget;
    removeFromDisplays?: typeof removeWidgetFromAllDisplays;
  } = {}
): Promise<IWidget | null> => {
  const {
    getDisplayIds = getDisplayIdsForWidget,
    removeFromDisplays = removeWidgetFromAllDisplays,
  } = dependencies;

  const idToDelete =
    typeof widgetId === "string"
      ? new mongoose.Types.ObjectId(widgetId)
      : widgetId;

  let affectedDisplayIds: string[] = [];

  try {
    // First, get the display IDs that are using this widget
    try {
      affectedDisplayIds = await getDisplayIds(idToDelete);
    } catch (e) {
      console.error(
        `Error fetching display IDs for widget ${idToDelete} before deletion:`,
        e
      );
      // Continue with deletion even if fetching display IDs fails, but log the error.
    }

    const widget = await Widget.findById(idToDelete);
    if (!widget) {
      // If widget not found, no need to proceed further with notifications for it.
      return null; // Or throw: throw new Error(`Widget with ID ${idToDelete} not found.`);
    }

    // Remove widget reference from all displays
    await removeFromDisplays(idToDelete);

    // Delete the widget itself
    await Widget.findByIdAndDelete(idToDelete);

    // Notify affected displays after successful deletion
    for (const displayId of affectedDisplayIds) {
      sendEventToDisplay(displayId, "display_updated", {
        displayId: displayId,
        action: "update",
        reason: "widget_deleted",
        widgetId: idToDelete.toString(),
      });
    }

    return widget; // Return the (now deleted) widget document
  } catch (error) { // TypeScript will infer error as unknown
    console.error("Error deleting widget and cleaning references:", error);
    // Consider if specific error types should be thrown or if a generic error is okay
    throw new Error(
      `Failed to delete widget ${idToDelete} and clean references.`
    );
  }
};

// Define widget data interface for add/delete operations
interface WidgetOperationData {
  _id: string | mongoose.Types.ObjectId;
  display: string;
}

export async function addWidget(req: Request, res: Response, widgetData: WidgetOperationData) {
  if (!widgetData || !widgetData._id || !widgetData.display) {
    return res
      .status(400)
      .json({ error: "Invalid widget data provided to addWidget helper." });
  }

  const displayId = widgetData.display;
  const widgetId = widgetData._id;

  try {
    const display = await Display.findById(displayId);

    if (!display) {
      return res.status(404).json({ error: "Display not found" });
    }

    display.widgets.push(widgetId);
    const savedDisplay = await display.save();

    if (!savedDisplay) {
      return res.status(500).json({ error: "Display not saved" });
    }
    return { success: true, display: savedDisplay };
  } catch (error) {
    throw error;
  }
}

export async function deleteWidget(
  req: Request,
  res: Response,
  widgetData: WidgetOperationData
) {
  if (!widgetData || !widgetData._id || !widgetData.display) {
    return res
      .status(400)
      .json({ error: "Invalid widget data provided to deleteWidget helper." });
  }

  const displayId = widgetData.display;
  const widgetId =
    typeof widgetData._id === "string"
      ? widgetData._id
      : (widgetData._id as mongoose.Types.ObjectId).equals(widgetData._id) ? widgetData._id : widgetData._id.toString(); // Properly type ObjectId equals method

  try {
    const display = await Display.findById(displayId);

    if (!display) {
      return res.status(404).json({ error: "Display not found" });
    }

    display.widgets = display.widgets.filter((id: mongoose.Types.ObjectId) => { // Widgets array contains ObjectIds
      // Handle both string IDs and Mongoose ObjectIds with an .equals method
      if (typeof id === "string") {
        return id !== widgetId;
      } else if (id && typeof id.equals === "function") {
        return !id.equals(widgetId);
      }
      return true;
    });

    const savedDisplay = await display.save();

    if (!savedDisplay) {
      return res.status(500).json({ error: "Display not saved" });
    }

    return { success: true, display: savedDisplay };
  } catch (error) {
    throw error;
  }
}
