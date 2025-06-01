/**
 * @fileoverview Slide helper functions for the API
 */

import Slide, { ISlide } from "../models/Slide"; // Assuming Slide.ts exports ISlide
import Slideshow, { ISlideshow } from "../models/Slideshow"; // Assuming Slideshow.ts exports ISlideshow
import mongoose from "mongoose";
import { getDisplayIdsForSlideshow } from "../helpers/slideshow_helper";
import { sendEventToDisplay } from "../sse_manager"; // Added import

/**
 * Adds a slide to one or more slideshows.
 * @param {ISlide} slide - The slide document to add.
 * @param {string | string[] | mongoose.Types.ObjectId | mongoose.Types.ObjectId[]} slideshowIds - ID or array of IDs of slideshows.
 * @returns {Promise<void>}
 * @throws {Error} If updating slideshows fails.
 */
export const addSlideToSlideshows = async (
  slide: ISlide,
  slideshowIds:
    | string
    | string[]
    | mongoose.Types.ObjectId
    | mongoose.Types.ObjectId[]
): Promise<void> => {
  if (!slideshowIds) {
    return;
  }

  const idsToAdd: mongoose.Types.ObjectId[] = (
    Array.isArray(slideshowIds) ? slideshowIds : [slideshowIds]
  ).map((id) =>
    typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
  );

  if (idsToAdd.length === 0) {
    return;
  }

  try {
    await Slideshow.updateMany(
      { _id: { $in: idsToAdd } },
      { $addToSet: { slides: slide._id } } // Use $addToSet to avoid duplicate slides
    );
  } catch (error: any) {
    console.error("Error adding slide to slideshows:", error);
    throw new Error("Failed to add slide to slideshows.");
  }
};

/**
 * Removes a slide from one or more slideshows.
 * @param {ISlide | mongoose.Types.ObjectId | string} slideOrSlideId - The slide document or its ID.
 * @param {string | string[] | mongoose.Types.ObjectId | mongoose.Types.ObjectId[]} slideshowIds - ID or array of IDs of slideshows.
 * @returns {Promise<void>}
 * @throws {Error} If updating slideshows fails.
 */
export const removeSlideFromSlideshows = async (
  slideOrSlideId: ISlide | mongoose.Types.ObjectId | string,
  slideshowIds:
    | string
    | string[]
    | mongoose.Types.ObjectId
    | mongoose.Types.ObjectId[]
): Promise<void> => {
  if (!slideshowIds) {
    return;
  }

  const slideId =
    typeof slideOrSlideId === "string"
      ? new mongoose.Types.ObjectId(slideOrSlideId)
      : (slideOrSlideId as ISlide)._id || slideOrSlideId; // Handles both ISlide and ObjectId

  const idsToRemoveFrom: mongoose.Types.ObjectId[] = (
    Array.isArray(slideshowIds) ? slideshowIds : [slideshowIds]
  ).map((id) =>
    typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
  );

  if (idsToRemoveFrom.length === 0) {
    return;
  }

  try {
    await Slideshow.updateMany(
      { _id: { $in: idsToRemoveFrom } },
      { $pull: { slides: slideId } }
    );
  } catch (error: any) {
    console.error("Error removing slide from slideshows:", error);
    throw new Error("Failed to remove slide from slideshows.");
  }
};

/**
 * Handles changes in slideshow assignments for a slide.
 * If a slide is updated, this function can synchronize its presence in slideshows
 * based on a new list of slideshow IDs.
 * @param {ISlide} slide - The slide document that was updated.
 * @param {string[] | mongoose.Types.ObjectId[]} newSlideshowIds - Array of new slideshow ObjectIds or string IDs.
 * @param {string[] | mongoose.Types.ObjectId[]} [originalSlideshowIds=[]] - Array of original slideshow ObjectIds or string IDs.
 * @returns {Promise<void>}
 * @throws {Error} If synchronization fails.
 */
export const handleSlideInSlideshows = async (
  slide: ISlide,
  newSlideshowIds: (string | mongoose.Types.ObjectId)[],
  originalSlideshowIds: (string | mongoose.Types.ObjectId)[] = []
): Promise<void> => {
  const newIds = new Set(newSlideshowIds.map((id) => id.toString()));
  const oldIds = new Set(originalSlideshowIds.map((id) => id.toString()));

  const toAdd: string[] = [];
  const toRemove: string[] = [];

  newIds.forEach((id) => {
    if (!oldIds.has(id)) {
      toAdd.push(id);
    }
  });

  oldIds.forEach((id) => {
    if (!newIds.has(id)) {
      toRemove.push(id);
    }
  });

  try {
    if (toAdd.length > 0) {
      await addSlideToSlideshows(
        slide,
        toAdd.map((id) => new mongoose.Types.ObjectId(id))
      );
    }
    if (toRemove.length > 0) {
      await removeSlideFromSlideshows(
        slide._id as mongoose.Types.ObjectId,
        toRemove.map((id) => new mongoose.Types.ObjectId(id))
      );
    }
  } catch (error: any) {
    console.error("Error handling slide in slideshows:", error);
    throw new Error("Failed to update slide presence in slideshows.");
  }
};

/**
 * Finds all Display IDs that are currently showing a given slide (via slideshows).
 * @param {string | mongoose.Types.ObjectId} slideId - The ID of the slide.
 * @returns {Promise<string[]>} A promise that resolves to an array of unique display IDs (as strings).
 * @throws {Error} If there's an issue with database queries.
 */
export async function getDisplayIdsForSlide(
  slideId: string | mongoose.Types.ObjectId
): Promise<string[]> {
  try {
    const sId =
      typeof slideId === "string"
        ? new mongoose.Types.ObjectId(slideId)
        : slideId;

    // a. Find all Slideshow documents where the 'slides' array contains the given slideId.
    const slideshows = await Slideshow.find({ slides: sId })
      .select("_id")
      .lean();

    if (!slideshows || slideshows.length === 0) {
      return [];
    }

    const allDisplayIds = new Set<string>();

    // b. For each slideshowId found, call getDisplayIdsForSlideshow.
    for (const slideshow of slideshows) {
      const displayIds = await getDisplayIdsForSlideshow(slideshow._id);
      displayIds.forEach((id) => allDisplayIds.add(id));
    }

    // c. Collect all unique display IDs and return them.
    return Array.from(allDisplayIds);
  } catch (error) {
    console.error("Error fetching display IDs for slide:", error);
    throw error; // Rethrow to be handled by the caller
  }
}

/**
 * Deletes a slide and removes it from all associated slideshows.
 * @param {string | mongoose.Types.ObjectId} slideId - The ID of the slide to delete.
 * @returns {Promise<ISlide | null>} The deleted slide document or null if not found.
 * @throws {Error} If deletion or removal from slideshows fails.
 */
export const deleteSlideAndCleanReferences = async (
  slideId: string | mongoose.Types.ObjectId
): Promise<ISlide | null> => {
  const idToDelete =
    typeof slideId === "string"
      ? new mongoose.Types.ObjectId(slideId)
      : slideId;

  let affectedDisplayIds: string[] = [];

  try {
    // Get affected display IDs before any deletion logic
    try {
      affectedDisplayIds = await getDisplayIdsForSlide(idToDelete);
    } catch (e) {
      console.error(
        `Error fetching display IDs for slide ${idToDelete} before deletion:`,
        e
      );
      // Log error, but continue with deletion logic
    }

    // Find the slide to be deleted
    const slide = await Slide.findById(idToDelete);
    if (!slide) {
      // console.log(`Slide with ID ${idToDelete} not found for deletion.`);
      return null; // Or throw an error if preferred
    }

    // Remove the slide from all slideshows that contain it
    await Slideshow.updateMany(
      { slides: idToDelete },
      { $pull: { slides: idToDelete } }
    );

    // Delete the slide itself
    await Slide.findByIdAndDelete(idToDelete);

    // Notify affected displays after successful deletion and reference cleaning
    for (const displayId of affectedDisplayIds) {
      sendEventToDisplay(displayId, "display_updated", {
        displayId: displayId,
        action: "update",
        reason: "slide_deleted",
        slideId: idToDelete.toString(),
      });
    }

    return slide; // Return the (now deleted) slide document
  } catch (error: any) {
    console.error("Error deleting slide and cleaning references:", error);
    throw new Error("Failed to delete slide and update slideshows.");
  }
};
