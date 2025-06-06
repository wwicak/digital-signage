import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import * as z from 'zod';
import authMiddleware, { ensureAuthenticated } from '../../../../../../lib/auth/session';
import Slideshow from '../../../../../../api/models/Slideshow';
import { IUser } from '../../../../../../api/models/User';
import {
  validateSlidesExist,
  reorderSlidesInSlideshow,
  populateSlideshowSlides,
  getDisplayIdsForSlideshow,
} from '../../../../../../api/helpers/slideshow_helper';
import { sendEventToDisplay } from '../../../../../../api/sse_manager';

// Copied from original route file, ensure CreateSlideshowSchema is defined or imported if used by Update
const CreateSlideshowSchemaForUpdate = z.object({ // Renamed to avoid conflict if this file also had Create
  name: z.string().min(1, { message: 'Slideshow name is required.' }),
  description: z.string().optional(),
  slide_ids: z.array(z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'Invalid ObjectId in slide_ids' })).optional(),
  is_enabled: z.boolean().optional(),
});
const UpdateSlideshowSchema = CreateSlideshowSchemaForUpdate.partial().extend({
  oldIndex: z.number().optional(), newIndex: z.number().optional(),
});


const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (slideshows/[id]):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Method not supported for this ID route or not found.' }); },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);

const checkValidSlideshowId = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const { id } = req.query;
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Valid Slideshow ID is required.' });
  }
  next();
};
handler.use(checkValidSlideshowId);

// GET a specific slideshow by ID
handler.get(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string };
  try {
    const slideshow = await Slideshow.findOne({ _id: id, creator_id: user._id }).populate('slides');
    if (!slideshow) return res.status(404).json({ message: 'Slideshow not found or not authorized.' });
    return res.json(slideshow);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error fetching slideshow.', error: err.message });
  }
});

// PUT (update) a slideshow by ID
handler.put(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string };
  const result = UpdateSlideshowSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Validation failed', errors: result.error.formErrors.fieldErrors });
  }
  const { slide_ids, oldIndex, newIndex, ...slideshowData } = result.data;
  try {
    const slideshowToUpdate = await Slideshow.findOne({ _id: id, creator_id: user._id });
    if (!slideshowToUpdate) return res.status(404).json({ message: 'Slideshow not found or not authorized' });

    if (typeof oldIndex === 'number' && typeof newIndex === 'number') {
      await reorderSlidesInSlideshow(slideshowToUpdate, oldIndex, newIndex);
    }
    Object.assign(slideshowToUpdate, slideshowData);
    if (slide_ids) {
      if (slide_ids.length > 0 && !(await validateSlidesExist(slide_ids))) { // validateSlidesExist expects string[]
        return res.status(400).json({ message: 'One or more provided slide IDs are invalid or do not exist.' });
      }
      slideshowToUpdate.slides = slide_ids.map(sid => new mongoose.Types.ObjectId(sid));
    }
    const savedSlideshow = await slideshowToUpdate.save();
    const populatedSlideshow = await populateSlideshowSlides(savedSlideshow);
    try {
      const displayIds = await getDisplayIdsForSlideshow(savedSlideshow._id as mongoose.Types.ObjectId);
      for (const displayId of displayIds) {
        sendEventToDisplay(displayId.toString(), 'display_updated', {
          displayId: displayId.toString(), action: 'update', reason: 'slideshow_change', slideshowId: savedSlideshow._id.toString(),
        });
      }
    } catch (notifyError: any) { console.error(`Error notifying displays after slideshow update ${id}:`, notifyError); }
    return res.json(populatedSlideshow);
  } catch (error: any) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    if (error.message === 'Invalid slide indices for reordering.') return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: 'Error updating slideshow', error: error.message });
  }
});

// DELETE a slideshow by ID
handler.delete(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string };
  let displayIdsToDeleteNotifications: mongoose.Types.ObjectId[] = [];
  try {
    const slideshow = await Slideshow.findOne({ _id: id, creator_id: user._id });
    if (!slideshow) return res.status(404).json({ message: 'Slideshow not found or not authorized' });
    try {
      displayIdsToDeleteNotifications = await getDisplayIdsForSlideshow(new mongoose.Types.ObjectId(id));
    } catch (notifyError: any) { console.error(`Error fetching display IDs before slideshow delete ${id}:`, notifyError); }

    await Slideshow.findByIdAndDelete(id);
    for (const displayId of displayIdsToDeleteNotifications) {
      sendEventToDisplay(displayId.toString(), 'display_updated', {
        displayId: displayId.toString(), action: 'update', reason: 'slideshow_deleted', slideshowId: id,
      });
    }
    return res.json({ message: 'Slideshow deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting slideshow', error: error.message });
  }
});

export default handler;
