import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import authMiddleware, { ensureAuthenticated } from '../../../../../lib/auth/session';
import Slide from '../../../../../api/models/Slide';
import { IUser } from '../../../../../api/models/User';
import { handleSlideInSlideshows } from '../../../../../api/helpers/slide_helper';
// findAllAndSend was used in original for GET all, but direct find is fine.

interface CreateSlideBody {
  name: string; description?: string; type: string; data: any; duration?: number;
  is_enabled?: boolean; slideshow_ids?: string[] | mongoose.Types.ObjectId[];
}

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (slides/index):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Not Found for this method' }); },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);

// GET all slides for the logged-in user
handler.get(async (req, res) => {
  const user = req.user as IUser;
  try {
    const slides = await Slide.find({ creator_id: user._id });
    return res.json(slides);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching slides', error: error.message });
  }
});

// POST (create) a new slide
handler.post(async (req, res) => {
  const user = req.user as IUser;
  const { name, description, type, data, duration, is_enabled, slideshow_ids } = req.body as CreateSlideBody;
  if (!name || !type || data === undefined) {
    return res.status(400).json({ message: 'Slide name, type, and data are required.' });
  }
  const newSlideDoc = new Slide({
    name, description, type, data, duration, is_enabled, creator_id: user._id,
  });
  try {
    const savedSlide = await newSlideDoc.save();
    if (slideshow_ids && slideshow_ids.length > 0) {
      const objectIdSlideshowIds = slideshow_ids.map(sid => typeof sid === 'string' ? new mongoose.Types.ObjectId(sid) : sid);
      await handleSlideInSlideshows(savedSlide, objectIdSlideshowIds, []);
    }
    return res.status(201).json(savedSlide);
  } catch (error: any) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    return res.status(500).json({ message: 'Error creating slide', error: error.message });
  }
});

export default handler;
