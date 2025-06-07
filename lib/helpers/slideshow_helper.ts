/**
 * @fileoverview Slideshow helper functions for the API
 */

import Slideshow, { ISlideshow } from "../models/Slideshow"; // Assuming Slideshow.ts exports ISlideshow
import Slide from "../models/Slide"; // Assuming Slide.ts exports ISlide
import mongoose from "mongoose";

/**
 * Validates if all provided slide IDs exist.
 * @param {(string | mongoose.Types.ObjectId)[]} slideIds - An array of slide IDs to validate.
 * @returns {Promise<boolean>} True if all slides exist, false otherwise.
 */
export const validateSlidesExist = async (
  slideIds: (string | mongoose.Types.ObjectId)[]
): Promise<string[]> => {
  if (!slideIds || slideIds.length === 0) {
    return []; // No slides to validate, return empty array
  }
  try {
    const objectIdSlideIds = slideIds.map((id) =>
      typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
    );
    const foundSlides = await Slide.find({
      _id: { $in: objectIdSlideIds },
    }).select("_id");
    return foundSlides.map((slide) =>
      (slide._id as mongoose.Types.ObjectId).toString()
    );
  } catch (error) {
    console.error("Error validating slides:", error);
    return []; // Error during validation, return empty array
  }
};

/**
 * Reorders slides within a slideshow.
 * @param {ISlideshow} slideshow - The slideshow document to update.
 * @param {number} oldIndex - The original index of the slide.
 * @param {number} newIndex - The new index for the slide.
 * @returns {Promise<ISlideshow>} The updated slideshow document.
 * @throws {Error} If reordering fails or indices are out of bounds.
 */
export const reorderSlidesInSlideshow = async (
  slideshow: ISlideshow,
  oldIndex: number,
  newIndex: number
): Promise<ISlideshow> => {
  const slides = slideshow.slides as mongoose.Types.ObjectId[]; // Assuming slides are ObjectIds

  if (
    oldIndex < 0 ||
    oldIndex >= slides.length ||
    newIndex < 0 ||
    newIndex >= slides.length
  ) {
    throw new Error("Invalid slide indices for reordering.");
  }

  const [movedSlide] = slides.splice(oldIndex, 1);
  slides.splice(newIndex, 0, movedSlide);

  slideshow.slides = slides;
  // Save the slideshow document
  await slideshow.save();
  return slideshow;
};

/**
 * Populates the slides for a given slideshow.
 * @param {ISlideshow | null} slideshow - The slideshow document.
 * @returns {Promise<ISlideshow | null>} The slideshow with populated slides, or null.
 */
export const populateSlideshowSlides = async (
  slideshow: ISlideshow | null
): Promise<ISlideshow | null> => {
  if (!slideshow) {
    return null;
  }
  try {
    // Check if slideshow.populate is a function before calling it
    if (typeof slideshow.populate === "function") {
      // Remove explicit generic type argument from populate
      const populatedSlideshow = await slideshow.populate("slides");
      return populatedSlideshow as ISlideshow; // Cast if necessary, ensure ISlideshow expects populated slides
    } else {
      /*
       * If not a full Mongoose document with populate, fetch and populate
       * Remove explicit generic type argument from populate
       */
      const foundSlideshow = await Slideshow.findById(slideshow._id).populate(
        "slides"
      );
      return foundSlideshow;
    }
  } catch (error) {
    console.error(`Error populating slideshow ${slideshow._id}:`, error);
    return slideshow; // Return original if population fails
  }
};

// Example of another helper if needed:
/**
 * Get all slideshows with their slides populated.
 * @returns {Promise<ISlideshow[]>}
 */
export const getAllSlideshowsWithPopulatedSlides = async (): Promise<
  ISlideshow[]
> => {
  try {
    // Remove explicit generic type argument from populate
    const slideshows = await Slideshow.find().populate("slides");
    return slideshows as ISlideshow[]; // Cast if necessary
  } catch (error) {
    console.error(
      "Error fetching all slideshows with populated slides:",
      error
    );
    return [];
  }
};

import Widget from "../models/Widget"; // Assuming path to Widget model
import Display from "../models/Display"; // Assuming path to Display model
import { WidgetType } from "../models/Widget"; // Assuming WidgetType is in Widget model file

/**
 * Finds all Display IDs that are currently showing a given slideshow.
 * @param {string | mongoose.Types.ObjectId} slideshowId - The ID of the slideshow.
 * @returns {Promise<string[]>} A promise that resolves to an array of unique display IDs (as strings).
 * @throws {Error} If there's an issue with database queries.
 */
export async function getDisplayIdsForSlideshow(
  slideshowId: string | mongoose.Types.ObjectId
): Promise<string[]> {
  try {
    // Ensure slideshowId is an ObjectId if it's a string
    const sId =
      typeof slideshowId === "string"
        ? new mongoose.Types.ObjectId(slideshowId)
        : slideshowId;

    const widgets = await Widget.find({
      type: WidgetType.SLIDESHOW,
      "data.slideshow_id": sId,
    })
      .select("_id")
      .lean();

    if (!widgets || widgets.length === 0) {
      return [];
    }

    const widgetIds = widgets.map((widget) => widget._id);

    const displays = await Display.find({
      widgets: { $in: widgetIds },
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
    console.error("Error fetching display IDs for slideshow:", error);
    // Rethrow the error to be handled by the caller
    throw error;
  }
}
