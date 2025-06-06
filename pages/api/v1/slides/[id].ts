import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import authMiddleware, { ensureAuthenticated } from '../../../../../../lib/auth/session';
import Slide from '../../../../../../api/models/Slide';
import Slideshow from '../../../../../../api/models/Slideshow'; // For slide_helper
import { IUser } from '../../../../../../api/models/User';
import {
  handleSlideInSlideshows,
  deleteSlideAndCleanReferences,
  getDisplayIdsForSlide,
} from '../../../../../../api/helpers/slide_helper';
import { sendEventToDisplay } from '../../../../../../api/sse_manager';

// Define a more specific UpdateSlideBody, mirroring CreateSlideBody but all optional
interface UpdateSlideBody {
  name?: string;
  description?: string;
  type?: string; // Ideally, this would be a SlideType enum if defined
  data?: any;
  duration?: number;
  is_enabled?: boolean;
  slideshow_ids?: string[] | mongoose.Types.ObjectId[];
}

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (slides/[id]):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Method not supported for this ID route or not found.' }); },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);

const checkValidSlideId = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const { id } = req.query;
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Valid Slide ID is required.' });
  }
  next();
};
handler.use(checkValidSlideId);

// GET a specific slide by ID
handler.get(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string };
  try {
    const slide = await Slide.findOne({ _id: id, creator_id: user._id });
    if (!slide) return res.status(404).json({ message: 'Slide not found or not authorized.' });
    return res.json(slide);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error fetching slide.', error: err.message });
  }
});

// PUT (update) a slide by ID
handler.put(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string };
  // Body is now validated against the more specific UpdateSlideBody
  const { slideshow_ids, ...slideData } = req.body as UpdateSlideBody;
  try {
    const slideToUpdate = await Slide.findOne({ _id: id, creator_id: user._id });
    if (!slideToUpdate) return res.status(404).json({ message: 'Slide not found or not authorized' });

    let originalSlideshowIds: mongoose.Types.ObjectId[] = [];
    if (slideshow_ids !== undefined) {
      const slideshowsContainingSlide = await Slideshow.find({ slides: slideToUpdate._id }).select('_id');
      originalSlideshowIds = slideshowsContainingSlide.map(s => s._id as mongoose.Types.ObjectId);
    }

    Object.assign(slideToUpdate, slideData);
    const savedSlide = await slideToUpdate.save();

    if (slideshow_ids !== undefined) {
      const objectIdSlideshowIds = slideshow_ids.map(sid => typeof sid === 'string' ? new mongoose.Types.ObjectId(sid) : sid);
      await handleSlideInSlideshows(savedSlide, objectIdSlideshowIds, originalSlideshowIds);
    }
    try {
      const displayIds = await getDisplayIdsForSlide(savedSlide._id as mongoose.Types.ObjectId);
      for (const displayId of displayIds) {
        sendEventToDisplay(displayId.toString(), 'display_updated', {
          displayId: displayId.toString(), action: 'update', reason: 'slide_change', slideId: savedSlide._id.toString(),
        });
      }
    } catch (notifyError: any) { console.error(`Error notifying displays after slide update ${id}:`, notifyError); }
    return res.json(savedSlide);
  } catch (error: any) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    return res.status(500).json({ message: 'Error updating slide', error: error.message });
  }
});

// DELETE a slide by ID
handler.delete(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string };
  try {
    const slide = await Slide.findOne({ _id: id, creator_id: user._id });
    if (!slide) return res.status(404).json({ message: 'Slide not found or not authorized' });
    await deleteSlideAndCleanReferences(id as string | mongoose.Types.ObjectId);
    return res.json({ message: 'Slide deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting slide', error: error.message });
  }
});

export default handler;
