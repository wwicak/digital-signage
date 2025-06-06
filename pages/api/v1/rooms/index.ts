import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import * as z from 'zod';
import authMiddleware, { ensureAuthenticated, ensureAdmin } from '../../../../../lib/auth/session';
import Room from '../../../../../api/models/Room';
import Building from '../../../../../api/models/Building'; // For validation

const CreateRoomSchema = z.object({
  name: z.string().min(1, { message: 'Room name is required' }),
  building_id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'Invalid building ID' }),
  capacity: z.number().min(1, { message: 'Capacity must be at least 1' }),
  facilities: z.array(z.string()).optional(),
});
const RoomQuerySchema = z.object({
  building_id: z.string().optional().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), { message: 'Invalid building ID' }),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)).refine(v => v > 0, 'Page must be > 0'),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)).refine(v => v > 0, 'Limit must be > 0'),
});

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (rooms/index):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Not Found for this method' }); },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);
handler.use(ensureAdmin);

// GET all rooms (paginated and filtered)
handler.get(async (req, res) => {
  try {
    const queryResult = RoomQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({ message: 'Invalid query parameters', errors: queryResult.error.formErrors.fieldErrors });
    }
    const { building_id, page, limit } = queryResult.data;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (building_id) filter.building_id = new mongoose.Types.ObjectId(building_id);

    const rooms = await Room.find(filter).populate('building_id', 'name address').sort({ creation_date: -1 }).skip(skip).limit(limit);
    const total = await Room.countDocuments(filter);
    return res.json({ rooms, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching rooms', error: error.message });
  }
});

// POST create new room
handler.post(async (req, res) => {
  try {
    const result = CreateRoomSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Validation failed', errors: result.error.formErrors.fieldErrors });
    }
    const { name, building_id, capacity, facilities } = result.data;
    const building = await Building.findById(building_id);
    if (!building) return res.status(400).json({ message: 'Building not found' });

    const newRoom = new Room({ name, building_id: new mongoose.Types.ObjectId(building_id), capacity, facilities: facilities || [] });
    const savedRoom = await newRoom.save();
    const populatedRoom = await Room.findById(savedRoom._id).populate('building_id', 'name address');
    return res.status(201).json(populatedRoom);
  } catch (error: any) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    return res.status(500).json({ message: 'Error creating room', error: error.message });
  }
});

export default handler;
