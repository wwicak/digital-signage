import express, { Request, Response, NextFunction, Router } from 'express'
import mongoose from 'mongoose'

import Widget, { IWidget, WidgetType } from '../models/Widget'
import { IUser } from '../models/User'

/*
 * import {
 *   findByIdAndSend, // Custom logic
 *   findAllAndSend,  // Custom logic
 * } from '../helpers/common_helper';
 */

import {
  validateWidgetData,
  deleteWidgetAndCleanReferences,
  getDisplayIdsForWidget, // Added import
} from '../helpers/widget_helper'
import { sendEventToDisplay } from '../../sse_manager' // Added import

const router: Router = express.Router()

// Define interfaces for request bodies
interface CreateWidgetBody {
  name: string;
  type: WidgetType;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  data?: any;
}

interface UpdateWidgetBody extends Partial<CreateWidgetBody> {}

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next()
  }
  res.status(401).json({ message: 'User not authenticated' })
}

// GET all widgets for the logged-in user
router.get('/', ensureAuthenticated, async (req: Request, res: Response) => {
  const user = req.user as IUser
  if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' })
    return
  }
  try {
    const widgets = await Widget.find({ creator_id: user._id })
    res.json(widgets)
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching widgets.', error: error.message })
  }
})

// GET a specific widget by ID
router.get('/:id', ensureAuthenticated, async (req: Request<{ id: string }>, res: Response) => {
  const user = req.user as IUser
  if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' })
    return
  }
  try {
    const widget = await Widget.findOne({ _id: req.params.id, creator_id: user._id })
    if (!widget) {
      res.status(404).json({ message: 'Widget not found or not authorized.' })
      return
    }
    res.json(widget)
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching widget.', error: error.message })
  }
})

// POST (create) a new widget
router.post('/', ensureAuthenticated, async (req: Request<{}, any, CreateWidgetBody>, res: Response) => {
  const user = req.user as IUser
  if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' })
    return
  }

  const { name, type, x, y, w, h, data } = req.body

  if (!name || !type) {
    res.status(400).json({ message: 'Widget name and type are required.' })
    return
  }

  try {
    await validateWidgetData(type, data)

    const newWidgetDoc = new Widget({
      name,
      type,
      x: x === undefined ? 0 : x,
      y: y === undefined ? 0 : y,
      w: w === undefined ? 1 : w,
      h: h === undefined ? 1 : h,
      data,
      creator_id: user._id,
    })

    const savedWidget = await newWidgetDoc.save()
    res.status(201).json(savedWidget)
  } catch (error: any) {
    console.error('Error creating widget:', error)
    if (error.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation Error', errors: error.errors })
      return
    }
    if (error.message.startsWith('Invalid data for') || error.message.includes('not found')) {
        res.status(400).json({ message: error.message })
        return
    }
    res.status(500).json({ message: 'Error creating widget', error: error.message })
  }
})

// PUT (update) a widget by ID
router.put('/:id', ensureAuthenticated, async (req: Request<{ id: string }, any, UpdateWidgetBody>, res: Response) => {
  const user = req.user as IUser
  if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' })
    return
  }

  const widgetId = req.params.id
  const { type, data, ...widgetUpdateData } = req.body

  try {
    const widgetToUpdate = await Widget.findOne({ _id: widgetId, creator_id: user._id })

    if (!widgetToUpdate) {
      res.status(404).json({ message: 'Widget not found or not authorized' })
      return
    }

    const typeToValidate = type || widgetToUpdate.type
    const dataToValidate = data === undefined ? widgetToUpdate.data : data

    if (type || data !== undefined) {
        await validateWidgetData(typeToValidate, dataToValidate)
    }
    
    Object.assign(widgetToUpdate, widgetUpdateData)
    if (type) widgetToUpdate.type = type
    if (data !== undefined) widgetToUpdate.data = dataToValidate
    // widgetToUpdate.last_update = new Date(); // Schema timestamps should handle this

    const savedWidget = await widgetToUpdate.save()

    // Notify relevant displays
    try {
      const displayIds = await getDisplayIdsForWidget(savedWidget._id);
      for (const displayId of displayIds) {
        sendEventToDisplay(displayId, 'display_updated', {
          displayId: displayId,
          action: 'update',
          reason: 'widget_change',
          widgetId: savedWidget._id.toString()
        });
      }
    } catch (notifyError) {
      console.error(`Error notifying displays after widget update ${widgetId}:`, notifyError);
      // Log error but don't let it fail the main operation
    }

    res.json(savedWidget)

  } catch (error: any) {
    console.error(`Error updating widget ${widgetId}:`, error)
    if (error.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation Error', errors: error.errors })
      return
    }
    if (error.message.startsWith('Invalid data for') || error.message.includes('not found')) {
        res.status(400).json({ message: error.message })
        return
    }
    res.status(500).json({ message: 'Error updating widget', error: error.message })
  }
})

// DELETE a widget by ID
router.delete('/:id', ensureAuthenticated, async (req: Request<{ id: string }>, res: Response) => {
  const user = req.user as IUser
   if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' })
    return
  }
  const widgetId = req.params.id

  try {
    const widget = await Widget.findOne({ _id: widgetId, creator_id: user._id })
    if (!widget) {
      res.status(404).json({ message: 'Widget not found or not authorized' })
      return
    }

    const deletedWidget = await deleteWidgetAndCleanReferences(widgetId)
    
    if (!deletedWidget) {
        res.status(404).json({ message: 'Widget not found during deletion process.' })
        return
    }

    res.json({ message: 'Widget deleted successfully and removed from displays' })

  } catch (error: any) {
    console.error(`Error deleting widget ${widgetId}:`, error)
    res.status(500).json({ message: 'Error deleting widget', error: error.message })
  }
})

export default router
