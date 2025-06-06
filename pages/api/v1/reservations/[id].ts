import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import * as z from 'zod';
import authMiddleware, { ensureAuthenticated, ensureAdmin } from '../../../../../../lib/auth/session';
import Reservation from '../../../../../../api/models/Reservation';
import Room from '../../../../../../api/models/Room'; // For validation

// Schemas
const UpdateReservationSchema = z.object({
  title: z.string().min(1).optional(), room_id: z.string().refine(mongoose.Types.ObjectId.isValid).optional(),
  start_time: z.string().transform(str => new Date(str)).optional(), end_time: z.string().transform(str => new Date(str)).optional(),
  organizer: z.string().min(1).optional(), attendees: z.array(z.string()).optional(), agenda_meeting: z.string().optional(),
}).refine(data => !data.start_time || !data.end_time || data.end_time > data.start_time, { message: 'End time must be after start time if both provided', path: ['end_time'] });

// Copied from original reservations.ts - needs to be in scope for PUT
async function checkReservationConflict(
  roomId: string | mongoose.Types.ObjectId, startTime: Date, endTime: Date, excludeReservationId?: string | mongoose.Types.ObjectId
): Promise<{ hasConflict: boolean; conflictingReservations?: any[] }> {
  const filter: any = { room_id: roomId, $or: [ { start_time: { $lt: endTime }, end_time: { $gt: startTime } } ]};
  if (excludeReservationId) filter._id = { $ne: excludeReservationId };
  const conflicting = await Reservation.find(filter).populate('room_id', 'name').select('title start_time end_time organizer');
  return { hasConflict: conflicting.length > 0, conflictingReservations: conflicting.length > 0 ? conflicting : undefined };
}

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => { console.error('Error (reservations/[id]):', err); res.status(500).json({ message: 'Internal Server Error', error: err.message }); },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Method not supported for this ID route or not found.' }); },
});

handler.use(authMiddleware); handler.use(ensureAuthenticated); handler.use(ensureAdmin);

const checkValidReservationId = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const { id } = req.query;
  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Valid Reservation ID is required.' });
  next();
};
handler.use(checkValidReservationId);

// GET reservation by ID
handler.get(async (req, res) => {
  const { id } = req.query as { id: string };
  try {
    const reservation = await Reservation.findById(id).populate({ path: 'room_id', select: 'name capacity facilities', populate: { path: 'building_id', select: 'name address' } });
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    return res.json(reservation);
  } catch (e:any) { console.error(e); return res.status(500).json({ message: 'Error fetching reservation', error: e.message }); }
});

// PUT update reservation by ID
handler.put(async (req, res) => {
  const { id } = req.query as { id: string };
  try {
    const result = UpdateReservationSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: 'Validation failed', errors: result.error.formErrors.fieldErrors });
    const updateData = result.data;
    if (Object.keys(updateData).length === 0) return res.status(400).json({ message: 'No valid fields to update' });
    const current = await Reservation.findById(id);
    if (!current) return res.status(404).json({ message: 'Reservation not found' });
    const finalRoomId = updateData.room_id ? new mongoose.Types.ObjectId(updateData.room_id) : current.room_id;
    const finalStartTime = updateData.start_time || current.start_time;
    const finalEndTime = updateData.end_time || current.end_time;
    if (finalEndTime <= finalStartTime) return res.status(400).json({ message: 'End time must be after start time.', path: ['end_time'] });
    if (updateData.room_id) {
      if (!(await Room.findById(finalRoomId))) return res.status(400).json({ message: 'Room not found for update' });
    }
    const conflictCheck = await checkReservationConflict(finalRoomId, finalStartTime, finalEndTime, new mongoose.Types.ObjectId(id));
    if (conflictCheck.hasConflict) return res.status(409).json({ message: 'Room is already booked', conflictingReservations: conflictCheck.conflictingReservations });
    if(updateData.room_id) updateData.room_id = new mongoose.Types.ObjectId(updateData.room_id) as any; // Ensure it's ObjectId for update
    const updated = await Reservation.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate({ path: 'room_id', select: 'name capacity facilities', populate: { path: 'building_id', select: 'name address' } });
    return res.json(updated);
  } catch (e:any) { console.error(e); return res.status(500).json({ message: 'Error updating reservation', error: e.message }); }
});

// DELETE reservation by ID
handler.delete(async (req, res) => {
  const { id } = req.query as { id: string };
  try {
    const deleted = await Reservation.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Reservation not found' });
    return res.json({ message: 'Reservation cancelled successfully' });
  } catch (e:any) { console.error(e); return res.status(500).json({ message: 'Error cancelling reservation', error: e.message }); }
});
export default handler;
