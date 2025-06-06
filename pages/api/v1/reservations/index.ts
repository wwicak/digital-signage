import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import * as z from 'zod';
import authMiddleware, { ensureAuthenticated, ensureAdmin } from '../../../../../lib/auth/session';
import Reservation from '../../../../../api/models/Reservation';
import Room from '../../../../../api/models/Room'; // For validation and filtering

// Zod schemas
const CreateReservationSchema = z.object({
  title: z.string().min(1), room_id: z.string().refine(mongoose.Types.ObjectId.isValid),
  start_time: z.string().transform(str => new Date(str)), end_time: z.string().transform(str => new Date(str)),
  organizer: z.string().min(1), attendees: z.array(z.string()).optional(), agenda_meeting: z.string().optional(),
}).refine(data => data.end_time > data.start_time, { message: 'End time must be after start time', path: ['end_time'] });

const ReservationQuerySchema = z.object({
  room_id: z.string().optional().refine(val => !val || mongoose.Types.ObjectId.isValid(val)),
  building_id: z.string().optional().refine(val => !val || mongoose.Types.ObjectId.isValid(val)),
  start_date: z.string().optional().transform(str => str ? new Date(str) : undefined),
  end_date: z.string().optional().transform(str => str ? new Date(str) : undefined),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1).refine(v => v > 0),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10).refine(v => v > 0),
}).refine(data => !data.start_date || !data.end_date || data.end_date >= data.start_date, { message: 'End date must be on or after start date', path: ['end_date'] });

// Copied from original reservations.ts - needs to be in scope for POST
async function checkReservationConflict(
  roomId: string | mongoose.Types.ObjectId, startTime: Date, endTime: Date, excludeReservationId?: string | mongoose.Types.ObjectId
): Promise<{ hasConflict: boolean; conflictingReservations?: any[] }> {
  const filter: any = { room_id: roomId, $or: [ { start_time: { $lt: endTime }, end_time: { $gt: startTime } } ]};
  if (excludeReservationId) filter._id = { $ne: excludeReservationId };
  const conflicting = await Reservation.find(filter).populate('room_id', 'name').select('title start_time end_time organizer');
  return { hasConflict: conflicting.length > 0, conflictingReservations: conflicting.length > 0 ? conflicting : undefined };
}

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => { console.error('Error (reservations/index):', err); res.status(500).json({ message: 'Internal Server Error', error: err.message }); },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Not Found for this method' }); },
});

handler.use(authMiddleware); handler.use(ensureAuthenticated); handler.use(ensureAdmin);

// GET all reservations
handler.get(async (req, res) => {
  try {
    const queryResult = ReservationQuerySchema.safeParse(req.query);
    if (!queryResult.success) return res.status(400).json({ message: 'Invalid query params', errors: queryResult.error.formErrors.fieldErrors });
    const { room_id, building_id, start_date, end_date, page, limit } = queryResult.data;
    const skip = (page - 1) * limit;
    let filter: any = {};
    if (room_id) filter.room_id = new mongoose.Types.ObjectId(room_id);
    if (building_id) {
      const roomsInBuilding = await Room.find({ building_id: new mongoose.Types.ObjectId(building_id) }).select('_id');
      const currentRoomFilter = filter.room_id || {}; // Preserve existing room_id if any
      filter.room_id = { ...currentRoomFilter, $in: roomsInBuilding.map(r => r._id) };
    }
    if (start_date || end_date) {
      const dateFilter: any = {};
      if (start_date && end_date) dateFilter.$or = [ { start_time: { $gte: start_date, $lte: end_date } }, { end_time: { $gte: start_date, $lte: end_date } }, { start_time: { $lte: start_date }, end_time: { $gte: end_date } }];
      else if (start_date) dateFilter.end_time = { $gte: start_date };
      else if (end_date) dateFilter.start_time = { $lte: end_date };
      Object.assign(filter, dateFilter);
    }
    const reservations = await Reservation.find(filter).populate({ path: 'room_id', select: 'name capacity facilities', populate: { path: 'building_id', select: 'name address' } }).sort({ start_time: 1 }).skip(skip).limit(limit);
    const total = await Reservation.countDocuments(filter);
    return res.json({ reservations, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e:any) { console.error(e); return res.status(500).json({ message: 'Error fetching reservations', error: e.message }); }
});

// POST create new reservation
handler.post(async (req, res) => {
  try {
    const result = CreateReservationSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: 'Validation failed', errors: result.error.formErrors.fieldErrors });
    const { title, room_id, start_time, end_time, organizer, attendees, agenda_meeting } = result.data;
    const room = await Room.findById(room_id);
    if (!room) return res.status(400).json({ message: 'Room not found' });
    const conflictCheck = await checkReservationConflict(new mongoose.Types.ObjectId(room_id), start_time, end_time);
    if (conflictCheck.hasConflict) return res.status(409).json({ message: 'Room is already booked', conflictingReservations: conflictCheck.conflictingReservations });
    const newReservation = new Reservation({ title, room_id: new mongoose.Types.ObjectId(room_id), start_time, end_time, organizer, attendees: attendees || [], agenda_meeting });
    const saved = await newReservation.save();
    const populated = await Reservation.findById(saved._id).populate({ path: 'room_id', select: 'name capacity facilities', populate: { path: 'building_id', select: 'name address' } });
    return res.status(201).json(populated);
  } catch (e:any) { console.error(e); return res.status(500).json({ message: 'Error creating reservation', error: e.message }); }
});
export default handler;
