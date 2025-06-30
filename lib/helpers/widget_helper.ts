/**
 * @fileoverview Widget helper functions for the API
 */

import Widget, { IWidget, WidgetType } from "../models/Widget"; // Assuming Widget.ts exports IWidget and WidgetType enum
import Display from "../models/Display"; // Assuming Display.ts exports IDisplay
import Slideshow from "../models/Slideshow"; // For validating slideshow_id in widget data
import mongoose from "mongoose";
import { Request, Response } from "express"; // For typing req/res
import { sendEventToDisplay } from "../sse_manager"; // Added import

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
// Define union type for all widget data structures
type WidgetData = 
  | { text: string; title?: string } // Announcement, Congrats
  | { text: string; recipient?: string } // Congrats specific
  | { url: string | null } // Image, Web
  | { list: Array<{ text: string }>; title?: string | null } // List
  | { // Media Player
      url?: string | null;
      mediaType?: 'video' | 'audio';
      volume?: number;
      fit?: 'contain' | 'cover' | 'fill';
      schedule?: {
        daysOfWeek?: number[];
        timeSlots?: Array<{ startTime: string; endTime: string }>;
      };
    }
  | { // Meeting Room
      buildingId?: string;
      refreshInterval?: number;
      showUpcoming?: boolean;
      maxReservations?: number;
      title?: string;
    }
  | { slideshow_id: string | null } // Slideshow
  | { zip: string; unit?: 'metric' | 'imperial' } // Weather
  | { video_id: string } // YouTube
  | Record<string, unknown>; // Generic fallback

export const validateWidgetData = async (
  type: WidgetType,
  data: WidgetData
): Promise<boolean> => {
  if (!data) {
    /*
     * Some widgets might not require data, handle accordingly.
     * For now, let's assume if data is provided, it should be validated.
     * If a widget type explicitly needs no data, this function might not be called for it,
     * or this check needs to be more nuanced.
     */
    return true; // Or false if data is always expected for types that use this validator.
  }

  switch (type) {
    case WidgetType.ANNOUNCEMENT:
      if (typeof data.text !== "string") {
        throw new Error(
          "Invalid data for Announcement widget: text must be a string."
        );
      }
      // title is optional, but if provided should be a string
      if (data.title !== undefined && typeof data.title !== "string") {
        throw new Error(
          "Invalid data for Announcement widget: title, if provided, must be a string."
        );
      }
      break;
    case WidgetType.CONGRATS:
      if (typeof data.text !== "string") {
        throw new Error(
          "Invalid data for Congrats widget: text must be a string."
        );
      }
      // recipient is optional, but if provided should be a string
      if (data.recipient !== undefined && typeof data.recipient !== "string") {
        throw new Error(
          "Invalid data for Congrats widget: recipient, if provided, must be a string."
        );
      }
      break;
    case WidgetType.IMAGE:
      // Image widget allows null URL (for new widgets), so only validate if URL is provided
      if (
        data.url !== null &&
        data.url !== undefined &&
        typeof data.url !== "string"
      ) {
        throw new Error(
          "Invalid data for Image widget: URL must be a string or null."
        );
      }
      // Optional validation for URL format if provided
      if (
        data.url &&
        typeof data.url === "string" &&
        !data.url.match(/^https?:\/\/.+/)
      ) {
        throw new Error(
          "Invalid data for Image widget: URL must be a valid HTTP/HTTPS URL."
        );
      }
      break;
    case WidgetType.LIST:
      if (
        !Array.isArray(data.list) ||
        !data.list.every(
          (item: unknown) =>
            typeof item === "object" && 
            item !== null &&
            'text' in item &&
            typeof (item as { text: unknown }).text === "string"
        )
      ) {
        throw new Error(
          "Invalid data for List widget: list must be an array of objects with text property."
        );
      }
      if (
        data.title !== null &&
        data.title !== undefined &&
        typeof data.title !== "string"
      ) {
        throw new Error(
          "Invalid data for List widget: title, if provided, must be a string or null."
        );
      }
      break;
    case WidgetType.MEDIA_PLAYER:
      // Media player widget validation - all fields are optional
      if (
        data.url !== undefined &&
        data.url !== null &&
        typeof data.url !== "string"
      ) {
        throw new Error(
          "Invalid data for Media Player widget: url, if provided, must be a string."
        );
      }
      if (
        data.mediaType !== undefined &&
        !["video", "audio"].includes(data.mediaType)
      ) {
        throw new Error(
          'Invalid data for Media Player widget: mediaType must be "video" or "audio".'
        );
      }
      if (
        data.volume !== undefined &&
        (typeof data.volume !== "number" || data.volume < 0 || data.volume > 1)
      ) {
        throw new Error(
          "Invalid data for Media Player widget: volume must be a number between 0 and 1."
        );
      }
      if (
        data.fit !== undefined &&
        !["contain", "cover", "fill"].includes(data.fit)
      ) {
        throw new Error(
          'Invalid data for Media Player widget: fit must be "contain", "cover", or "fill".'
        );
      }
      if (data.schedule !== undefined) {
        if (data.schedule.daysOfWeek !== undefined) {
          if (
            !Array.isArray(data.schedule.daysOfWeek) ||
            !data.schedule.daysOfWeek.every(
              (day: unknown) => typeof day === "number" && day >= 0 && day <= 6
            )
          ) {
            throw new Error(
              "Invalid data for Media Player widget: schedule.daysOfWeek must be an array of numbers 0-6."
            );
          }
        }
        if (data.schedule.timeSlots !== undefined) {
          if (
            !Array.isArray(data.schedule.timeSlots) ||
            !data.schedule.timeSlots.every(
              (slot: unknown) => {
                if (!slot || typeof slot !== 'object') return false;
                const s = slot as { startTime?: unknown; endTime?: unknown };
                return (
                  typeof s.startTime === "string" &&
                  typeof s.endTime === "string" &&
                  /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(s.startTime) &&
                  /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(s.endTime)
                );
              }
            )
          ) {
            throw new Error(
              "Invalid data for Media Player widget: schedule.timeSlots must be an array of objects with startTime and endTime in HH:MM format."
            );
          }
        }
      }
      break;
    case WidgetType.MEETING_ROOM:
      // Meeting room widget validation - all fields are optional
      if (
        data.buildingId !== undefined &&
        typeof data.buildingId !== "string"
      ) {
        throw new Error(
          "Invalid data for Meeting Room widget: buildingId, if provided, must be a string."
        );
      }
      if (
        data.refreshInterval !== undefined &&
        typeof data.refreshInterval !== "number"
      ) {
        throw new Error(
          "Invalid data for Meeting Room widget: refreshInterval, if provided, must be a number."
        );
      }
      if (
        data.showUpcoming !== undefined &&
        typeof data.showUpcoming !== "boolean"
      ) {
        throw new Error(
          "Invalid data for Meeting Room widget: showUpcoming, if provided, must be a boolean."
        );
      }
      if (
        data.maxReservations !== undefined &&
        typeof data.maxReservations !== "number"
      ) {
        throw new Error(
          "Invalid data for Meeting Room widget: maxReservations, if provided, must be a number."
        );
      }
      if (data.title !== undefined && typeof data.title !== "string") {
        throw new Error(
          "Invalid data for Meeting Room widget: title, if provided, must be a string."
        );
      }
      break;
    case WidgetType.SLIDESHOW:
      // Allow null slideshow_id for new widgets, but validate if provided
      if (data.slideshow_id !== null && data.slideshow_id !== undefined) {
        if (
          typeof data.slideshow_id !== "string" ||
          !mongoose.Types.ObjectId.isValid(data.slideshow_id)
        ) {
          throw new Error(
            "Invalid data for Slideshow widget: slideshow_id must be a valid ObjectId string or null."
          );
        }
        // Check if the slideshow actually exists (only if slideshow_id is provided)
        const slideshowExists = await Slideshow.findById(data.slideshow_id);
        if (!slideshowExists) {
          throw new Error(`Slideshow with id ${data.slideshow_id} not found.`);
        }
      }
      break;
    case WidgetType.WEATHER:
      // Weather widget uses zip code and unit
      if (typeof data.zip !== "string") {
        throw new Error(
          "Invalid data for Weather widget: zip must be a string."
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
          "Invalid data for Web widget: URL must be a valid web URL starting with http."
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
