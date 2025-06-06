import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose'; // Needed for ObjectId validation and types
import authMiddleware, { ensureAuthenticated } from '../../../../../../lib/auth/session'; // Note one more '../'
import Widget from '../../../../../../api/models/Widget'; // Note one more '../'
import { IUser } from '../../../../../../api/models/User'; // Note one more '../'
import {
  validateWidgetData,
  deleteWidgetAndCleanReferences,
  getDisplayIdsForWidget,
} from '../../../../../../api/helpers/widget_helper'; // Note one more '../'
import { sendEventToDisplay } from '../../../../../../api/sse_manager'; // Note one more '../'

interface UpdateWidgetBody extends Partial<any> { // Should import CreateWidgetBody or define relevant fields
    name?: string;
    type?: any; // Should be WidgetType
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    data?: any;
}


const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (widgets/[id]):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => {
    res.status(404).json({ message: 'Method not supported for this ID route or not found.' });
  },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);

// Middleware to check for valid ObjectId in 'id' parameter
const checkValidId = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const { id } = req.query;
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Valid Widget ID is required.' });
  }
  next();
};

handler.use(checkValidId); // Apply to all methods in this file

// GET a specific widget by ID
handler.get(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string }; // id is now string from path

  try {
    const widget = await Widget.findOne({ _id: id, creator_id: user._id });
    if (!widget) {
      return res.status(404).json({ message: 'Widget not found or not authorized.' });
    }
    return res.json(widget);
  } catch (error: any) {
    console.error(`Error fetching widget ${id}:`, error);
    return res.status(500).json({ message: 'Error fetching widget.', error: error.message });
  }
});

// PUT (update) a widget by ID
handler.put(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string };
  const { type, data, ...widgetUpdateData } = req.body as UpdateWidgetBody;

  try {
    const widgetToUpdate = await Widget.findOne({ _id: id, creator_id: user._id });
    if (!widgetToUpdate) {
      return res.status(404).json({ message: 'Widget not found or not authorized' });
    }

    const typeToValidate = type || widgetToUpdate.type;
    const dataToValidate = data === undefined ? widgetToUpdate.data : data;

    if (type || data !== undefined) {
      await validateWidgetData(typeToValidate, dataToValidate);
    }

    Object.assign(widgetToUpdate, widgetUpdateData);
    if (type) widgetToUpdate.type = type;
    if (data !== undefined) widgetToUpdate.data = dataToValidate;

    const savedWidget = await widgetToUpdate.save();

    try {
      const displayIds = await getDisplayIdsForWidget(savedWidget._id as mongoose.Types.ObjectId);
      for (const displayId of displayIds) {
        sendEventToDisplay(displayId.toString(), 'display_updated', { // Ensure displayId is string
          displayId: displayId.toString(), action: 'update', reason: 'widget_change',
          widgetId: savedWidget._id.toString(),
        });
      }
    } catch (notifyError: any) {
      console.error(`Error notifying displays after widget update ${id}:`, notifyError);
    }
    return res.json(savedWidget);
  } catch (error: any) {
    console.error(`Error updating widget ${id}:`, error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    if (error.message.startsWith('Invalid data for') || error.message.includes('not found')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Error updating widget', error: error.message });
  }
});

// DELETE a widget by ID
handler.delete(async (req, res) => {
  const user = req.user as IUser;
  const { id } = req.query as { id: string };

  try {
    const widget = await Widget.findOne({ _id: id, creator_id: user._id });
    if (!widget) {
      return res.status(404).json({ message: 'Widget not found or not authorized' });
    }
    await deleteWidgetAndCleanReferences(id as string | mongoose.Types.ObjectId);
    return res.json({ message: 'Widget deleted successfully and removed from displays' });
  } catch (error: any) {
    console.error(`Error deleting widget ${id}:`, error);
    return res.status(500).json({ message: 'Error deleting widget', error: error.message });
  }
});

export default handler;
