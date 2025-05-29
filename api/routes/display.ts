import express, { Request, Response, NextFunction, Router } from 'express';
import mongoose from 'mongoose';

import Display, { IDisplay } from '../models/Display';
import Widget, { IWidget, WidgetType } from '../models/Widget'; // Import Widget model and WidgetType
import { IUser } from '../models/User'; 

import {
  // findByIdAndSend, // Using custom logic for creator_id check
  findAllAndSend,
  // createAndSend, // Custom logic for display creation
  // findByIdAndUpdateAndSend, // Custom logic for display update
  // findByIdAndDeleteAndSend // Custom logic for display deletion
} from '../helpers/common_helper';

import { 
  createWidgetsForDisplay, 
  updateWidgetsForDisplay, 
  deleteWidgetsForDisplay 
} from '../helpers/display_helper';
import { sendSseEvent } from '../helpers/common_helper';
import { addClient, removeClient, sendEventToDisplay } from '../sse_manager';


const router: Router = express.Router();

interface CreateDisplayBody {
  name: string;
  description?: string;
  layout?: string;
  statusBar?: {
    enabled?: boolean;
    color?: string;
    elements?: string[];
  };
  widgets?: Array<{
    name: string;
    type: WidgetType; // Use enum
    x: number; y: number; w: number; h: number;
    data: any;
  }>;
}

interface UpdateDisplayBody extends Partial<Omit<IDisplay, '_id' | 'creator_id' | 'creation_date' | 'last_update' | 'widgets'>> {
  // widgets array is handled separately for update
  widgets?: Array<Partial<IWidget> & { _id?: string }>; // For existing widgets, _id is string or ObjectId
}


const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) { 
    return next();
  }
  res.status(401).json({ message: 'User not authenticated' });
  // No explicit return needed after res.json() as it's the end of this path
};


// GET all displays for the logged-in user
router.get('/', ensureAuthenticated, (req: Request, res: Response) => {
  const user = req.user as IUser; 
  if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' });
    return;
  }
  // findAllAndSend will handle the response
  findAllAndSend(Display, res, 'widgets', { creator_id: user._id });
});

// GET a specific display by ID
router.get('/:id', ensureAuthenticated, async (req: Request<{ id: string }>, res: Response) => {
  const user = req.user as IUser;
  if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' });
    return;
  }
  try {
    const display = await Display.findOne({ _id: req.params.id, creator_id: user._id })
      .populate('widgets');
    if (!display) {
      res.status(404).json({ message: 'Display not found or not authorized.' });
      return;
    }
    res.json(display);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching display.', error: err.message });
  }
});

// POST (create) a new display
router.post('/', ensureAuthenticated, async (req: Request<{}, any, CreateDisplayBody>, res: Response) => {
  const user = req.user as IUser;
  if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' });
    return;
  }

  const { name, description, widgets: widgetsData, layout, statusBar } = req.body;

  if (!name) {
    res.status(400).json({ message: 'Display name is required.' });
    return;
  }

  const newDisplayDoc = new Display({
    name,
    description,
    creator_id: user._id, 
    layout, 
    statusBar, 
    widgets: [] 
  });

  try {
    if (widgetsData && widgetsData.length > 0) {
      // Ensure widgetsData here matches the expected structure for createWidgetsForDisplay, especially 'type'
      const typedWidgetsData = widgetsData.map(w => ({...w, type: w.type as WidgetType}));
      await createWidgetsForDisplay(newDisplayDoc, typedWidgetsData, user._id);
      // createWidgetsForDisplay pushes IDs to newDisplayDoc.widgets
    }
    const savedDisplay = await newDisplayDoc.save();
    const populatedDisplay = await savedDisplay.populate('widgets');
    // Send SSE event for display creation
    sendEventToDisplay(savedDisplay._id.toString(), 'display_updated', { displayId: savedDisplay._id.toString(), action: 'create' });
    res.status(201).json(populatedDisplay);
  } catch (error: any) {
    console.error('Error creating display:', error);
    if (error.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation Error', errors: error.errors });
      return;
    }
    res.status(500).json({ message: 'Error creating display', error: error.message });
  }
});

// PUT (update) a display by ID
router.put('/:id', ensureAuthenticated, async (req: Request<{ id: string }, any, UpdateDisplayBody>, res: Response) => {
  const user = req.user as IUser;
  if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' });
    return;
  }

  const displayId = req.params.id;
  const { widgets: newWidgetsData, ...displayData } = req.body;

  try {
    const displayToUpdate = await Display.findOne({ _id: displayId, creator_id: user._id });

    if (!displayToUpdate) {
      res.status(404).json({ message: 'Display not found or not authorized' });
      return;
    }

    Object.assign(displayToUpdate, displayData);
    // displayToUpdate.last_update = new Date(); // Schema timestamps should handle this

    if (newWidgetsData) { 
      const updatedWidgetIds = await updateWidgetsForDisplay(displayToUpdate, newWidgetsData, user._id);
      displayToUpdate.widgets = updatedWidgetIds; 
    }

    const savedDisplay = await displayToUpdate.save();
    const populatedDisplay = await savedDisplay.populate('widgets');
    // Send SSE event for display update
    sendEventToDisplay(displayId, 'display_updated', { displayId: displayId, action: 'update' });
    res.json(populatedDisplay);

  } catch (error: any) {
    console.error(`Error updating display ${displayId}:`, error);
    if (error.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation Error', errors: error.errors });
      return;
    }
    res.status(500).json({ message: 'Error updating display', error: error.message });
  }
});

// DELETE a display by ID
router.delete('/:id', ensureAuthenticated, async (req: Request<{ id: string }>, res: Response) => {
  const user = req.user as IUser;
   if (!user || !user._id) {
    res.status(400).json({ message: 'User information not found.' });
    return;
  }
  const displayId = req.params.id;

  try {
    const display = await Display.findOne({ _id: displayId, creator_id: user._id });
    if (!display) {
      res.status(404).json({ message: 'Display not found or not authorized' });
      return;
    }
    
    await deleteWidgetsForDisplay(display); 
    await Display.findByIdAndDelete(displayId);

    // Send SSE event for display deletion
    sendEventToDisplay(displayId, 'display_updated', { displayId: displayId, action: 'delete' });
    res.json({ message: 'Display and associated widgets deleted successfully' });

  } catch (error: any) {
    console.error(`Error deleting display ${displayId}:`, error);
    res.status(500).json({ message: 'Error deleting display', error: error.message });
  }
});

router.get('/:displayId/events', (req: Request, res: Response) => {
  const { displayId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  addClient(displayId, res);

  // Send a connected event
  sendSseEvent(res, 'connected', { message: 'SSE connection established' });

  req.on('close', () => {
    removeClient(displayId, res);
  });
});

export default router;
