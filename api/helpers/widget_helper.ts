/**
 * @fileoverview Widget helper functions for the API
 */

import Widget, { IWidget, WidgetType } from "../models/Widget"; // Assuming Widget.ts exports IWidget and WidgetType enum
import Display, { IDisplay } from "../models/Display"; // Assuming Display.ts exports IDisplay
import Slideshow from "../models/Slideshow"; // For validating slideshow_id in widget data
import mongoose from "mongoose";
import { Request, Response } from "express"; // For typing req/res

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
export const validateWidgetData = async (
  type: WidgetType,
  data: any
): Promise<boolean> => {
  if (!data) {
    // Some widgets might not require data, handle accordingly.
    // For now, let's assume if data is provided, it should be validated.
    // If a widget type explicitly needs no data, this function might not be called for it,
    // or this check needs to be more nuanced.
    return true; // Or false if data is always expected for types that use this validator.
  }

  switch (type) {
    case WidgetType.ANNOUNCEMENT:
      if (typeof data.title !== "string" || typeof data.message !== "string") {
        throw new Error(
          "Invalid data for Announcement widget: title and message must be strings."
        );
      }
      break;
    case WidgetType.CONGRATS:
      if (
        typeof data.title !== "string" ||
        typeof data.message !== "string" ||
        typeof data.recipient !== "string"
      ) {
        throw new Error(
          "Invalid data for Congrats widget: title, message, and recipient must be strings."
        );
      }
      break;
    case WidgetType.IMAGE:
      if (
        typeof data.url !== "string" ||
        !data.url.match(/\.(jpeg|jpg|gif|png)$/)
      ) {
        throw new Error(
          "Invalid data for Image widget: URL must be a valid image URL (jpeg, jpg, gif, png)."
        );
      }
      break;
    case WidgetType.LIST:
      if (
        !Array.isArray(data.items) ||
        !data.items.every((item: any) => typeof item === "string")
      ) {
        // Added type for item
        throw new Error(
          "Invalid data for List widget: items must be an array of strings."
        );
      }
      if (data.title && typeof data.title !== "string") {
        throw new Error(
          "Invalid data for List widget: title, if provided, must be a string."
        );
      }
      break;
    case WidgetType.SLIDESHOW:
      if (
        !data.slideshow_id ||
        !mongoose.Types.ObjectId.isValid(data.slideshow_id)
      ) {
        throw new Error(
          "Invalid data for Slideshow widget: slideshow_id must be a valid ObjectId string."
        );
      }
      // Check if the slideshow actually exists
      const slideshowExists = await Slideshow.findById(data.slideshow_id);
      if (!slideshowExists) {
        throw new Error(`Slideshow with id ${data.slideshow_id} not found.`);
      }
      break;
    case WidgetType.WEATHER:
      // Example: data might include a location string or object
      if (
        typeof data.location !== "string" &&
        (typeof data.location !== "object" || !data.location.city)
      ) {
        throw new Error(
          "Invalid data for Weather widget: location (string or object with city) is required."
        );
      }
      if (data.unit && !["metric", "imperial"].includes(data.unit)) {
        throw new Error(
          'Invalid data for Weather widget: unit must be "metric" or "imperial".'
        );
      }
      break;
    case WidgetType.WEB:
      if (typeof data.url !== "string" || !data.url.startsWith("http")) {
        // Basic URL check
        throw new Error(
          "Invalid data for Web widget: URL must be a valid web URL."
        );
      }
      break;
    case WidgetType.YOUTUBE:
      if (typeof data.video_id !== "string") {
        // Could also validate with a regex for YouTube video IDs
        throw new Error(
          "Invalid data for YouTube widget: video_id must be a string."
        );
      }
      break;
    case WidgetType.EMPTY:
      // Empty widgets typically have no data or minimal configuration
      break;
    default:
      // For unknown widget types, we might assume data is valid or throw an error
      console.warn(`Validation not implemented for widget type: ${type}`);
      return true;
  }
  return true; // If all checks pass for a known type
};

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
  } catch (error: any) {
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
  widgetId: string | mongoose.Types.ObjectId
): Promise<IWidget | null> => {
  const idToDelete =
    typeof widgetId === "string"
      ? new mongoose.Types.ObjectId(widgetId)
      : widgetId;

  try {
    const widget = await Widget.findById(idToDelete);
    if (!widget) {
      return null; // Or throw: throw new Error(`Widget with ID ${idToDelete} not found.`);
    }

    // Remove widget reference from all displays
    await removeWidgetFromAllDisplays(idToDelete);

    // Delete the widget itself
    await Widget.findByIdAndDelete(idToDelete);

    return widget; // Return the (now deleted) widget document
  } catch (error: any) {
    console.error("Error deleting widget and cleaning references:", error);
    // Consider if specific error types should be thrown or if a generic error is okay
    throw new Error(
      `Failed to delete widget ${idToDelete} and clean references.`
    );
  }
};

export async function addWidget(req: Request, res: Response, widgetData: any) {
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
  widgetData: any
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
      : (widgetData._id as any).equals(widgetData._id) && widgetData._id;

  try {
    const display = await Display.findById(displayId);

    if (!display) {
      return res.status(404).json({ error: "Display not found" });
    }

    display.widgets = display.widgets.filter((id: any) => {
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
