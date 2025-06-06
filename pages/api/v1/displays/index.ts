import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import authMiddleware, { ensureAuthenticated } from '../../../../../lib/auth/session';
import Display from '../../../../../api/models/Display';
import { WidgetType } from '../../../../../api/models/Widget'; // For CreateDisplayBody
import { IUser } from '../../../../../api/models/User';
import { createWidgetsForDisplay } from '../../../../../api/helpers/display_helper';
import { augmentDisplaysWithClientInfo } from '../../../../../api/helpers/common_helper';
import { sendEventToDisplay, getConnectedClientCount } from '../../../../../api/sse_manager';

interface CreateDisplayBody {
  name: string;
  description?: string;
  layout?: string;
  orientation?: string;
  statusBar?: { enabled?: boolean; color?: string; elements?: string[]; };
  widgets?: Array<{ name: string; type: WidgetType; x: number; y: number; w: number; h: number; data: any; }>;
}

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (displays/index):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Not Found for this method' }); },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);

// GET all displays for the logged-in user
handler.get(async (req, res) => {
  const user = req.user as IUser;
  try {
    const displays = await Display.find({ creator_id: user._id }).populate('widgets');
    const augmentedDisplays = augmentDisplaysWithClientInfo(displays, getConnectedClientCount);
    return res.json(augmentedDisplays);
  } catch (error: any) {
    console.error('Error fetching all displays:', error);
    return res.status(500).json({ message: 'Error fetching displays.', error: error.message });
  }
});

// POST (create) a new display
handler.post(async (req, res) => {
  const user = req.user as IUser;
  const { name, description, widgets: widgetsData, layout, orientation, statusBar } = req.body as CreateDisplayBody;
  if (!name) return res.status(400).json({ message: 'Display name is required.' });

  const newDisplayDoc = new Display({
    name, description, creator_id: user._id, layout, orientation, statusBar, widgets: [],
  });

  try {
    if (widgetsData && widgetsData.length > 0) {
      const typedWidgetsData = widgetsData.map(w => ({ ...w, type: w.type as WidgetType }));
      await createWidgetsForDisplay(newDisplayDoc, typedWidgetsData, user._id as mongoose.Types.ObjectId);
    }
    const savedDisplay = await newDisplayDoc.save();
    const populatedDisplay = await Display.findById(savedDisplay._id).populate('widgets');
    sendEventToDisplay(savedDisplay._id.toString(), 'display_updated', { displayId: savedDisplay._id.toString(), action: 'create' });
    return res.status(201).json(populatedDisplay);
  } catch (error: any) {
    console.error('Error creating display:', error);
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    return res.status(500).json({ message: 'Error creating display', error: error.message });
  }
});

export default handler;
