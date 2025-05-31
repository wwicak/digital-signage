import express, { Request, Response, NextFunction, Router } from 'express'
import mongoose from 'mongoose'

import Slide, { ISlide } from '../models/Slide'
import { IUser } from '../models/User' // Assuming IUser is the correct interface for req.user
import Slideshow from '../models/Slideshow' // Required for querying slideshows

import {
  // findByIdAndSend, // Custom logic
  findAllAndSend,
  /*
   * createAndSend, // Custom logic for slide creation
   * findByIdAndUpdateAndSend, // Custom logic for slide update
   * findByIdAndDeleteAndSend // Custom logic for slide deletion
   */
} from '../helpers/common_helper'

import {
  handleSlideInSlideshows,
  deleteSlideAndCleanReferences,
} from '../helpers/slide_helper'

const router: Router = express.Router()

// Define interfaces for request bodies
interface CreateSlideBody {
  name: string;
  description?: string;
  type: string; // Consider enum: SlideType
  data: any;
  duration?: number;
  is_enabled?: boolean;
  slideshow_ids?: string[] | mongoose.Types.ObjectId[]; // For associating with slideshows at creation
}

interface UpdateSlideBody extends Partial<CreateSlideBody> {
  // No new fields, just making all fields from CreateSlideBody optional
}

// Middleware to ensure user is authenticated (assuming it's defined elsewhere and types req.user)
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

// GET all slides for the logged-in user
router.get('/', ensureAuthenticated, (req: Request, res: Response) => {
  const user = req.user as IUser
  if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' })
    return
  }
  // findAllAndSend handles the response
  findAllAndSend(Slide, res, undefined, { creator_id: user._id })
})

// GET a specific slide by ID
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
      const slide = await Slide.findOne({
        _id: req.params.id,
        creator_id: user._id,
      })
      if (!slide) {
        res.status(404).json({ message: 'Slide not found or not authorized.' })
        return
      }
      res.json(slide)
    } catch (err: any) {
      res
        .status(500)
        .json({ message: 'Error fetching slide.', error: err.message })
    }
  }
)

// POST (create) a new slide
router.post(
  '/',
  ensureAuthenticated,
  async (req: Request<{}, any, CreateSlideBody>, res: Response) => {
    const user = req.user as IUser
    if (!user || !user._id) {
      res.status(400).json({ message: 'User information not found.' })
      return
    }

    const {
      name,
      description,
      type,
      data,
      duration,
      is_enabled,
      slideshow_ids,
    } = req.body

    if (!name || !type || data === undefined) {
      res
        .status(400)
        .json({ message: 'Slide name, type, and data are required.' })
      return
    }

    const newSlideDoc = new Slide({
      name,
      description,
      type,
      data,
      duration,
      is_enabled,
      creator_id: user._id,
    })

    try {
      const savedSlide = await newSlideDoc.save()
      if (slideshow_ids && slideshow_ids.length > 0) {
        await handleSlideInSlideshows(savedSlide, slideshow_ids, [])
      }
      res.status(201).json(savedSlide)
    } catch (error: any) {
      console.error('Error creating slide:', error)
      if (error.name === 'ValidationError') {
        res
          .status(400)
          .json({ message: 'Validation Error', errors: error.errors })
        return
      }
      res
        .status(500)
        .json({ message: 'Error creating slide', error: error.message })
    }
  }
)

// PUT (update) a slide by ID
router.put(
  '/:id',
  ensureAuthenticated,
  async (req: Request<{ id: string }, any, UpdateSlideBody>, res: Response) => {
    const user = req.user as IUser
    if (!user || !user._id) {
      res.status(400).json({ message: 'User information not found.' })
      return
    }

    const slideId = req.params.id
    const { slideshow_ids, ...slideData } = req.body

    try {
      const slideToUpdate = await Slide.findOne({
        _id: slideId,
        creator_id: user._id,
      })

      if (!slideToUpdate) {
        res.status(404).json({ message: 'Slide not found or not authorized' })
        return
      }

      let originalSlideshowIds: mongoose.Types.ObjectId[] = []
      if (slideshow_ids !== undefined) {
        const slideshowsContainingSlide = await Slideshow.find({
          slides: slideToUpdate._id,
        }).select('_id')
        originalSlideshowIds = slideshowsContainingSlide.map(
          (s) => s._id as mongoose.Types.ObjectId
        )
      }

      Object.assign(slideToUpdate, slideData)
      // slideToUpdate.last_update = new Date(); // Schema timestamps should handle this

      const savedSlide = await slideToUpdate.save()

      if (slideshow_ids !== undefined) {
        await handleSlideInSlideshows(
          savedSlide,
          slideshow_ids,
          originalSlideshowIds
        )
      }

      res.json(savedSlide)
    } catch (error: any) {
      console.error(`Error updating slide ${slideId}:`, error)
      if (error.name === 'ValidationError') {
        res
          .status(400)
          .json({ message: 'Validation Error', errors: error.errors })
        return
      }
      res
        .status(500)
        .json({ message: 'Error updating slide', error: error.message })
    }
  }
)

// DELETE a slide by ID
router.delete(
  '/:id',
  ensureAuthenticated,
  async (req: Request<{ id: string }>, res: Response) => {
    const user = req.user as IUser
    if (!user || !user._id) {
      res.status(400).json({ message: 'User information not found.' })
      return
    }
    const slideId = req.params.id

    try {
      const slide = await Slide.findOne({ _id: slideId, creator_id: user._id })
      if (!slide) {
        res.status(404).json({ message: 'Slide not found or not authorized' })
        return
      }

      const deletedSlide = await deleteSlideAndCleanReferences(slideId)

      if (!deletedSlide) {
        res
          .status(404)
          .json({ message: 'Slide not found during deletion process.' })
        return
      }

      res.json({ message: 'Slide deleted successfully' })
    } catch (error: any) {
      console.error(`Error deleting slide ${slideId}:`, error)
      res
        .status(500)
        .json({ message: 'Error deleting slide', error: error.message })
    }
  }
)

export default router
