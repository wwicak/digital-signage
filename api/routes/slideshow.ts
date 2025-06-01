import express, { Request, Response, NextFunction, Router } from 'express'
import mongoose from 'mongoose'
import * as z from 'zod'

import Slideshow from '../models/Slideshow'
// import { ISlide } from '../models/Slide'; // No longer needed if populate doesn't use explicit generic
import { IUser } from '../models/User' // For req.user

/*
 * import {
 *   findByIdAndSend, // Custom logic
 *   findAllAndSend,  // Custom logic
 * } from '../helpers/common_helper';
 */

import {
  validateSlidesExist,
  reorderSlidesInSlideshow,
  populateSlideshowSlides,
  getDisplayIdsForSlideshow, // Added import
} from '../helpers/slideshow_helper'
import { sendEventToDisplay } from '../../sse_manager' // Added import

const router: Router = express.Router()

// Zod Schemas for request body validation
export const CreateSlideshowSchema = z.object({
  name: z.string().min(1, { message: 'Slideshow name is required.' }),
  description: z.string().optional(),
  slide_ids: z
    .array(
      z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: 'Invalid ObjectId in slide_ids',
      })
    )
    .optional(),
  is_enabled: z.boolean().optional(),
})

const UpdateSlideshowSchema = CreateSlideshowSchema.partial().extend({
  oldIndex: z.number().optional(),
  newIndex: z.number().optional(),
})
export { UpdateSlideshowSchema } // Explicit export
/*
 * Export the type as well if needed elsewhere, though for tests, schema is enough
 * export type CreateSlideshowPayload = z.infer<typeof CreateSlideshowSchema>;
 * export type UpdateSlideshowPayload = z.infer<typeof UpdateSlideshowSchema>;
 */

// Middleware to ensure user is authenticated
const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next()
  }
  res.status(401).json({ message: 'User not authenticated' })
}

// GET all slideshows for the logged-in user
router.get('/', ensureAuthenticated, async (req: Request, res: Response) => {
  const user = req.user as IUser
  if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' })
    return
  }
  try {
    const slideshows = await Slideshow.find({ creator_id: user._id }).populate(
      'slides'
    )
    res.json(slideshows)
  } catch (error: any) {
    res
      .status(500)
      .json({ message: 'Error fetching slideshows.', error: error.message })
  }
})

// GET a specific slideshow by ID, populated with slides
router.get(
  '/:id',
  ensureAuthenticated,
  async (req: Request<{ id: string }>, res: Response) => {
    const user = req.user as IUser
    if (!user || !user._id) {
      res.status(400).json({ message: 'User information not found.' })
      return
    }
    try {
      const slideshow = await Slideshow.findOne({
        _id: req.params.id,
        creator_id: user._id,
      }).populate('slides')
      if (!slideshow) {
        res
          .status(404)
          .json({ message: 'Slideshow not found or not authorized.' })
        return
      }
      res.json(slideshow)
    } catch (error: any) {
      res
        .status(500)
        .json({ message: 'Error fetching slideshow.', error: error.message })
    }
  }
)

// POST (create) a new slideshow
router.post(
  '/',
  ensureAuthenticated,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUser
    if (!user || !user._id) {
      res.status(400).json({ message: 'User information not found.' })
      return
    }

    const result = CreateSlideshowSchema.safeParse(req.body)

    if (!result.success) {
      res.status(400).json({
        message: 'Validation failed',
        errors: result.error.formErrors.fieldErrors,
      })
      return
    }

    const { name, description, slide_ids, is_enabled } = result.data

    if (slide_ids && slide_ids.length > 0) {
      const slidesValid = await validateSlidesExist(slide_ids)
      if (!slidesValid) {
        res.status(400).json({
          message:
            'One or more provided slide IDs are invalid or do not exist.',
        })
        return
      }
    }

    const newSlideshowDoc = new Slideshow({
      name,
      description,
      slides: slide_ids || [],
      is_enabled,
      creator_id: user._id,
    })

    try {
      const savedSlideshow = await newSlideshowDoc.save()
      const populatedSlideshow = await populateSlideshowSlides(savedSlideshow)
      res.status(201).json(populatedSlideshow)
    } catch (error: any) {
      console.error('Error creating slideshow:', error)
      if (error.name === 'ValidationError') {
        res
          .status(400)
          .json({ message: 'Validation Error', errors: error.errors })
        return
      }
      res
        .status(500)
        .json({ message: 'Error creating slideshow', error: error.message })
    }
  }
)

// PUT (update) a slideshow by ID
router.put(
  '/:id',
  ensureAuthenticated,
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const user = req.user as IUser
    if (!user || !user._id) {
      res.status(400).json({ message: 'User information not found.' })
      return
    }

    const slideshowId = req.params.id
    const result = UpdateSlideshowSchema.safeParse(req.body)

    if (!result.success) {
      res.status(400).json({
        message: 'Validation failed',
        errors: result.error.formErrors.fieldErrors,
      })
      return
    }

    const { slide_ids, oldIndex, newIndex, ...slideshowData } = result.data

    try {
      const slideshowToUpdate = await Slideshow.findOne({
        _id: slideshowId,
        creator_id: user._id,
      })

      if (!slideshowToUpdate) {
        res
          .status(404)
          .json({ message: 'Slideshow not found or not authorized' })
        return
      }

      if (typeof oldIndex === 'number' && typeof newIndex === 'number') {
        await reorderSlidesInSlideshow(slideshowToUpdate, oldIndex, newIndex)
      }

      Object.assign(slideshowToUpdate, slideshowData)
      if (slide_ids) {
        if (slide_ids.length > 0) {
          // Allow empty array to clear slides
          const slidesValid = await validateSlidesExist(slide_ids)
          if (!slidesValid) {
            res.status(400).json({
              message:
                'One or more provided slide IDs are invalid or do not exist.',
            })
            return
          }
        }
        slideshowToUpdate.slides = slide_ids.map(
          (id) => new mongoose.Types.ObjectId(id as string)
        ) // Cast id to string
      }
      // slideshowToUpdate.last_update = new Date(); // Schema timestamps should handle this

      const savedSlideshow = await slideshowToUpdate.save()
      const populatedSlideshow = await populateSlideshowSlides(savedSlideshow)

      // Notify relevant displays
      try {
        const displayIds = await getDisplayIdsForSlideshow(savedSlideshow._id);
        for (const displayId of displayIds) {
          sendEventToDisplay(displayId, 'display_updated', {
            displayId: displayId,
            action: 'update',
            reason: 'slideshow_change',
            slideshowId: savedSlideshow._id.toString()
          });
        }
      } catch (notifyError) {
        console.error(`Error notifying displays after slideshow update ${slideshowId}:`, notifyError);
        // Decide if this error should affect the response to the client
        // For now, we'll just log it and not send a different response
      }

      res.json(populatedSlideshow)
    } catch (error: any) {
      console.error(`Error updating slideshow ${slideshowId}:`, error)
      if (error.name === 'ValidationError') {
        res
          .status(400)
          .json({ message: 'Validation Error', errors: error.errors })
        return
      }
      if (error.message === 'Invalid slide indices for reordering.') {
        res.status(400).json({ message: error.message })
        return
      }
      res
        .status(500)
        .json({ message: 'Error updating slideshow', error: error.message })
    }
  }
)

// DELETE a slideshow by ID
router.delete(
  '/:id',
  ensureAuthenticated,
  async (req: Request<{ id: string }>, res: Response) => {
    const user = req.user as IUser
    if (!user || !user._id) {
      res.status(400).json({ message: 'User information not found.' })
      return
    }
    const slideshowId = req.params.id
    let displayIdsToDeleteNotifications: string[] = [];

    try {
      const slideshow = await Slideshow.findOne({
        _id: slideshowId,
        creator_id: user._id,
      })
      if (!slideshow) {
        res
          .status(404)
          .json({ message: 'Slideshow not found or not authorized' })
        return
      }

      // Get display IDs before deleting the slideshow
      try {
        displayIdsToDeleteNotifications = await getDisplayIdsForSlideshow(slideshowId);
      } catch (notifyError) {
        console.error(`Error fetching display IDs before slideshow delete ${slideshowId}:`, notifyError);
        // Log the error, but proceed with deletion
      }

      await Slideshow.findByIdAndDelete(slideshowId)

      // Notify relevant displays after successful deletion
      for (const displayId of displayIdsToDeleteNotifications) {
        sendEventToDisplay(displayId, 'display_updated', {
          displayId: displayId,
          action: 'update',
          reason: 'slideshow_deleted',
          slideshowId: slideshowId.toString() // slideshowId is already a string here
        });
      }

      res.json({ message: 'Slideshow deleted successfully' })
    } catch (error: any) {
      console.error(`Error deleting slideshow ${slideshowId}:`, error)
      res
        .status(500)
        .json({ message: 'Error deleting slideshow', error: error.message })
    }
  }
)

export default router
