import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import * as z from 'zod';
import authMiddleware, { ensureAuthenticated, ensureAdmin } from '../../../../../../lib/auth/session';
import Building from '../../../../../../api/models/Building';
import Room from '../../../../../../api/models/Room'; // For deletion check

// Re-define or import CreateBuildingSchema if UpdateBuildingSchema depends on it.
const CreateBuildingSchemaForUpdate = z.object({
  name: z.string().min(1, { message: 'Building name is required' }),
  address: z.string().min(1, { message: 'Building address is required' }),
});
const UpdateBuildingSchema = CreateBuildingSchemaForUpdate.partial();

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (buildings/[id]):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Method not supported for this ID route or not found.' }); },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);
handler.use(ensureAdmin);

const checkValidBuildingId = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const { id } = req.query;
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Valid Building ID is required.' });
  }
  next();
};
handler.use(checkValidBuildingId);

// GET building by ID
handler.get(async (req, res) => {
  const { id } = req.query as { id: string };
  try {
    const building = await Building.findById(id);
    if (!building) return res.status(404).json({ message: 'Building not found' });
    return res.json(building);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching building', error: error.message });
  }
});

// PUT update building by ID
handler.put(async (req, res) => {
  const { id } = req.query as { id: string };
  try {
    const result = UpdateBuildingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Validation failed', errors: result.error.formErrors.fieldErrors });
    }
    const updateData = result.data;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    const updatedBuilding = await Building.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updatedBuilding) return res.status(404).json({ message: 'Building not found' });
    return res.json(updatedBuilding);
  } catch (error: any) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    return res.status(500).json({ message: 'Error updating building', error: error.message });
  }
});

// DELETE building by ID
handler.delete(async (req, res) => {
  const { id } = req.query as { id: string };
  try {
    const roomsCount = await Room.countDocuments({ building_id: id });
    if (roomsCount > 0) {
      return res.status(409).json({ message: 'Cannot delete building with existing rooms', conflictingRooms: roomsCount });
    }
    const deletedBuilding = await Building.findByIdAndDelete(id);
    if (!deletedBuilding) return res.status(404).json({ message: 'Building not found' });
    return res.json({ message: 'Building deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting building', error: error.message });
  }
});

export default handler;
