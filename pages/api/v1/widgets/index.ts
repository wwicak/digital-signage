import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
// mongoose import might not be needed here if not used directly
import authMiddleware, { ensureAuthenticated } from '../../../../../lib/auth/session'; // Adjusted path
import Widget, { WidgetType } from '../../../../../api/models/Widget'; // Adjusted path
import { IUser } from '../../../../../api/models/User'; // Adjusted path
import { validateWidgetData } from '../../../../../api/helpers/widget_helper'; // Adjusted path
// sse_manager and getDisplayIdsForWidget might not be needed for POST/GET all.

interface CreateWidgetBody {
  name: string;
  type: WidgetType;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  data?: any;
}

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (widgets/index):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => {
    res.status(404).json({ message: 'Not Found for this method' });
  },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);

// GET all widgets for the logged-in user
handler.get(async (req, res) => {
  const user = req.user as IUser;
  // No specific ID handling here, that moves to [id].ts
  try {
    const widgets = await Widget.find({ creator_id: user._id });
    return res.json(widgets);
  } catch (error: any) {
    console.error('Error fetching all widgets:', error);
    return res.status(500).json({ message: 'Error fetching widgets.', error: error.message });
  }
});

// POST (create) a new widget
handler.post(async (req, res) => {
  const user = req.user as IUser;
  const { name, type, x, y, w, h, data } = req.body as CreateWidgetBody;

  if (!name || !type) {
    return res.status(400).json({ message: 'Widget name and type are required.' });
  }

  try {
    await validateWidgetData(type, data); // From widget_helper

    const newWidgetDoc = new Widget({
      name, type,
      x: x === undefined ? 0 : x,
      y: y === undefined ? 0 : y,
      w: w === undefined ? 1 : w,
      h: h === undefined ? 1 : h,
      data, creator_id: user._id,
    });

    const savedWidget = await newWidgetDoc.save();
    return res.status(201).json(savedWidget);
  } catch (error: any) {
    console.error('Error creating widget:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    if (error.message.startsWith('Invalid data for') || error.message.includes('not found')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error creating widget', error: error.message });
  }
});

export default handler;
