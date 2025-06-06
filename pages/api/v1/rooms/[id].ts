import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import * as z from 'zod';
import authMiddleware, { ensureAuthenticated, ensureAdmin } from '../../../../../../lib/auth/session';
import Room from '../../../../../../api/models/Room';
import Building from '../../../../../../api/models/Building'; // For validation
import Reservation from '../../../../../../api/models/Reservation'; // For deletion check

// Define CreateRoomSchema again or import if it was in a shared types file
const CreateRoomSchemaForUpdate = z.object({
  name: z.string().min(1, { message: 'Room name is required' }),
  building_id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'Invalid building ID' }),
  capacity: z.number().min(1, { message: 'Capacity must be at least 1' }),
  facilities: z.array(z.string()).optional(),
});
const UpdateRoomSchema = CreateRoomSchemaForUpdate.partial();


const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (rooms/[id]):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Method not supported for this ID route or not found.' }); },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);
handler.use(ensureAdmin);

const checkValidRoomId = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const { id } = req.query;
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Valid Room ID is required.' });
  }
  next();
};
handler.use(checkValidRoomId);

// GET room by ID
handler.get(async (req, res) => {
  const { id } = req.query as { id: string };
  try {
    const room = await Room.findById(id).populate('building_id', 'name address');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    return res.json(room);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching room', error: error.message });
  }
});

// PUT update room by ID
handler.put(async (req, res) => {
  const { id } = req.query as { id: string };
  try {
    const result = UpdateRoomSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Validation failed', errors: result.error.formErrors.fieldErrors });
    }
    const updateData = result.data;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    if (updateData.building_id) {
      const building = await Building.findById(updateData.building_id);
      if (!building) return res.status(400).json({ message: 'Building not found for update' });
      updateData.building_id = new mongoose.Types.ObjectId(updateData.building_id);
    }
    const updatedRoom = await Room.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('building_id', 'name address');
    if (!updatedRoom) return res.status(404).json({ message: 'Room not found' });
    return res.json(updatedRoom);
  } catch (error: any) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    return res.status(500).json({ message: 'Error updating room', error: error.message });
  }
});

// DELETE room by ID
handler.delete(async (req, res) => {
  const { id } = req.query as { id: string };
  try {
    const reservationsCount = await Reservation.countDocuments({ room_id: id });
    if (reservationsCount > 0) {
      return res.status(409).json({ message: 'Cannot delete room with existing reservations', conflictingReservations: reservationsCount });
    }
    const deletedRoom = await Room.findByIdAndDelete(id);
    if (!deletedRoom) return res.status(404).json({ message: 'Room not found' });
    return res.json({ message: 'Room deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error deleting room', error: error.message });
  }
});

export default handler;
