import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import * as z from 'zod';
import authMiddleware, { ensureAuthenticated } from '../../../../../lib/auth/session';
import Slideshow from '../../../../../api/models/Slideshow';
import { IUser } from '../../../../../api/models/User';
import { validateSlidesExist, populateSlideshowSlides } from '../../../../../api/helpers/slideshow_helper';

const CreateSlideshowSchema = z.object({
  name: z.string().min(1, { message: 'Slideshow name is required.' }),
  description: z.string().optional(),
  slide_ids: z.array(z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'Invalid ObjectId in slide_ids' })).optional(),
  is_enabled: z.boolean().optional(),
});

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (slideshows/index):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Not Found for this method' }); },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);

// GET all slideshows
handler.get(async (req, res) => {
  const user = req.user as IUser;
  try {
    const slideshows = await Slideshow.find({ creator_id: user._id }).populate('slides');
    return res.json(slideshows);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching slideshows.', error: error.message });
  }
});

// POST (create) a new slideshow
handler.post(async (req, res) => {
  const user = req.user as IUser;
  const result = CreateSlideshowSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: 'Validation failed', errors: result.error.formErrors.fieldErrors });
  }
  const { name, description, slide_ids, is_enabled } = result.data;
  try {
    if (slide_ids && slide_ids.length > 0) {
      if (!(await validateSlidesExist(slide_ids))) { // validateSlidesExist expects string[]
        return res.status(400).json({ message: 'One or more provided slide IDs are invalid or do not exist.' });
      }
    }
    const newSlideshowDoc = new Slideshow({
      name, description, creator_id: user._id,
      slides: slide_ids ? slide_ids.map(id => new mongoose.Types.ObjectId(id)) : [],
      is_enabled,
    });
    const savedSlideshow = await newSlideshowDoc.save();
    const populatedSlideshow = await populateSlideshowSlides(savedSlideshow);
    return res.status(201).json(populatedSlideshow);
  } catch (error: any) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    return res.status(500).json({ message: 'Error creating slideshow', error: error.message });
  }
});

export default handler;
