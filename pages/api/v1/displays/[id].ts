import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import authMiddleware, { ensureAuthenticated } from '../../../../../../lib/auth/session';
import Display, { IDisplay } from '../../../../../../api/models/Display';
import { IWidget } from '../../../../../../api/models/Widget';
import { IUser } from '../../../../../../api/models/User';
import { updateWidgetsForDisplay, deleteWidgetsForDisplay } from '../../../../../../api/helpers/display_helper';
import { augmentDisplayWithClientInfo } from '../../../../../../api/helpers/common_helper';
import { sendEventToDisplay, getConnectedClientCount } from '../../../../../../api/sse_manager';

interface UpdateDisplayBody extends Partial<Omit<IDisplay, '_id' | 'creator_id' | 'creation_date' | 'last_update' | 'widgets'>> {
  widgets?: Array<Partial<IWidget> & { _id?: string }>;
}

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (displays/[id]):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Method not supported for this ID route or not found.' }); },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);

const checkValidDisplayId = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const { id } = req.query; // Changed from displayId to id to match file name [id].ts
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Valid Display ID is required.' });
  }
  next();
};
handler.use(checkValidDisplayId);

// GET a specific display by ID
handler.get(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string };
  try {
    const display = await Display.findOne({ _id: id, creator_id: user._id }).populate('widgets');
    if (!display) return res.status(404).json({ message: 'Display not found or not authorized.' });
    const augmentedDisplay = augmentDisplayWithClientInfo(display, getConnectedClientCount);
    return res.json(augmentedDisplay);
  } catch (err: any) {
    return res.status(500).json({ message: 'Error fetching display.', error: err.message });
  }
});

// PUT (update) a display by ID
handler.put(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string };
  const { widgets: newWidgetsData, ...displayData } = req.body as UpdateDisplayBody;

  try {
    const displayToUpdate = await Display.findOne({ _id: id, creator_id: user._id });
    if (!displayToUpdate) return res.status(404).json({ message: 'Display not found or not authorized' });

    Object.assign(displayToUpdate, displayData);
    if (newWidgetsData) {
      const updatedWidgetIds = await updateWidgetsForDisplay(displayToUpdate, newWidgetsData, user._id as mongoose.Types.ObjectId);
      displayToUpdate.widgets = updatedWidgetIds;
    }
    const savedDisplay = await displayToUpdate.save();
    const populatedDisplay = await Display.findById(savedDisplay._id).populate('widgets');
    sendEventToDisplay(id, 'display_updated', { displayId: id, action: 'update' });
    return res.json(populatedDisplay);
  } catch (error: any) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    return res.status(500).json({ message: 'Error updating display', error: error.message });
  }
});

// DELETE a display by ID
handler.delete(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string };
  try {
    const display = await Display.findOne({ _id: id, creator_id: user._id });
    if (!display) return res.status(404).json({ message: 'Display not found or not authorized' });

    await deleteWidgetsForDisplay(display);
    await Display.findByIdAndDelete(id);
    sendEventToDisplay(id, 'display_updated', { displayId: id, action: 'delete' });
    return res.json({ message: 'Display and associated widgets deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting display', error: error.message });
  }
});

export default handler;
