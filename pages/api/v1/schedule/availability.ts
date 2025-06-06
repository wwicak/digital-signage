import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import * as z from 'zod';
import dbConnect from '../../../../../lib/dbConnect'; // Added
import Reservation from '../../../../../api/models/Reservation';
import Room from '../../../../../api/models/Room';

// Zod schema (existing)
const AvailabilityQuerySchema = z.object({
  building_id: z.string().optional().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), { message: 'Invalid building ID' }),
  start_time: z.string().transform((str) => new Date(str)),
  end_time: z.string().transform((str) => new Date(str)),
  capacity_min: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)).refine(v => v === undefined || v > 0, 'Capacity must be > 0 if provided'),
}).refine((data) => data.end_time > data.start_time, {
  message: 'End time must be after start time',
  path: ['end_time'],
});

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (schedule/availability):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
    res.status(404).json({ message: 'Not Found' });
  },
});

handler.get(async (req, res) => {
  try {
    await dbConnect(); // Ensure DB connection

    const queryResult = AvailabilityQuerySchema.safeParse(req.query);
    // ... (rest of the original handler.get logic) ...
    if (!queryResult.success) {
      return res.status(400).json({ message: 'Invalid query parameters', errors: queryResult.error.formErrors.fieldErrors });
    }

    const { building_id, start_time, end_time, capacity_min } = queryResult.data;

    let roomFilter: any = {};
    if (building_id) roomFilter.building_id = new mongoose.Types.ObjectId(building_id);
    if (capacity_min) roomFilter.capacity = { $gte: capacity_min };

    const allRooms = await Room.find(roomFilter).populate('building_id', 'name address').sort({ name: 1 });

    const conflictingReservations = await Reservation.find({
      room_id: { $in: allRooms.map(room => room._id) },
      $or: [ { start_time: { $lt: end_time }, end_time: { $gt: start_time } } ],
    }).select('room_id title start_time end_time organizer');

    const conflictingRoomIds = new Set(conflictingReservations.map(r => r.room_id.toString()));

    const availableRooms = allRooms.filter(room => !conflictingRoomIds.has(room._id.toString()));
    const unavailableRooms = allRooms
      .filter(room => conflictingRoomIds.has(room._id.toString()))
      .map(room => {
        const conflicts = conflictingReservations.filter(r => r.room_id.toString() === room._id.toString());
        const roomObject = room.toObject();
        return { ...roomObject, conflicting_reservations: conflicts };
      });

    return res.json({
      message: 'Room availability retrieved successfully',
      query: { building_id: building_id || null, start_time, end_time, capacity_min: capacity_min || null },
      total_rooms_queried: allRooms.length,
      available_rooms: availableRooms,
      unavailable_rooms: unavailableRooms,
      availability_summary: { available: availableRooms.length, unavailable: unavailableRooms.length },
    });

  } catch (error: any) {
    console.error('Error checking room availability:', error);
     if (error.message.includes('Invalid date format')) {
        return res.status(400).json({ message: 'Invalid query parameters', errors: { date: ['Invalid date format for start_time or end_time'] } });
    }
    if (error.message.includes('Database connection error')) {
        return res.status(500).json({ message: 'Database service unavailable', error: error.message });
    }
    return res.status(500).json({ message: 'Error checking room availability', error: error.message });
  }
});

export default handler;
