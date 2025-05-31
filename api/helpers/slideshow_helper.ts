/**
 * @fileoverview Slideshow helper functions for the API
 */

import Slideshow, { ISlideshow } from '../models/Slideshow' // Assuming Slideshow.ts exports ISlideshow
import Slide, { ISlide } from '../models/Slide' // Assuming Slide.ts exports ISlide
import mongoose from 'mongoose'

/**
 * Validates if all provided slide IDs exist.
 * @param {(string | mongoose.Types.ObjectId)[]} slideIds - An array of slide IDs to validate.
 * @returns {Promise<boolean>} True if all slides exist, false otherwise.
 */
export const validateSlidesExist = async (
  slideIds: (string | mongoose.Types.ObjectId)[]
): Promise<boolean> => {
  if (!slideIds || slideIds.length === 0) {
    return true // No slides to validate, so considered valid
  }
  try {
    const objectIdSlideIds = slideIds.map(id =>
      typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
    )
    const foundSlides = await Slide.find({ _id: { $in: objectIdSlideIds } }).select('_id')
    return foundSlides.length === objectIdSlideIds.length
  } catch (error) {
    console.error('Error validating slides:', error)
    return false // Error during validation, assume invalid
  }
}

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
  const slides = slideshow.slides as mongoose.Types.ObjectId[] // Assuming slides are ObjectIds

  if (
    oldIndex < 0 || oldIndex >= slides.length ||
    newIndex < 0 || newIndex >= slides.length
  ) {
    throw new Error('Invalid slide indices for reordering.')
  }

  const [movedSlide] = slides.splice(oldIndex, 1)
  slides.splice(newIndex, 0, movedSlide)

  slideshow.slides = slides
  /*
   * Caller is responsible for saving the slideshow document
   * await slideshow.save();
   */
  return slideshow
}


/**
 * Populates the slides for a given slideshow.
 * @param {ISlideshow | null} slideshow - The slideshow document.
 * @returns {Promise<ISlideshow | null>} The slideshow with populated slides, or null.
 */
export const populateSlideshowSlides = async (slideshow: ISlideshow | null): Promise<ISlideshow | null> => {
  if (!slideshow) {
    return null
  }
  try {
    // Check if slideshow.populate is a function before calling it
    if (typeof slideshow.populate === 'function') {
      // Remove explicit generic type argument from populate
      const populatedSlideshow = await slideshow.populate('slides')
      return populatedSlideshow as ISlideshow // Cast if necessary, ensure ISlideshow expects populated slides
    } else {
      /*
       * If not a full Mongoose document with populate, fetch and populate
       * Remove explicit generic type argument from populate
       */
      const foundSlideshow = await Slideshow.findById(slideshow._id).populate('slides')
      return foundSlideshow
    }
  } catch (error) {
    console.error(`Error populating slideshow ${slideshow._id}:`, error)
    return slideshow // Return original if population fails
  }
}

// Example of another helper if needed:
/**
 * Get all slideshows with their slides populated.
 * @returns {Promise<ISlideshow[]>}
 */
export const getAllSlideshowsWithPopulatedSlides = async (): Promise<ISlideshow[]> => {
  try {
    // Remove explicit generic type argument from populate
    const slideshows = await Slideshow.find().populate('slides')
    return slideshows as ISlideshow[] // Cast if necessary
  } catch (error) {
    console.error('Error fetching all slideshows with populated slides:', error)
    return []
  }
}
