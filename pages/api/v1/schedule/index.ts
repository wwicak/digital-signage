import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import * as z from 'zod';
import dbConnect from '../../../../../lib/dbConnect'; // Added
import Reservation from '../../../../../api/models/Reservation';
import Room from '../../../../../api/models/Room';

// Zod schema (existing)
const ScheduleQuerySchema = z.object({
  room_id: z.string().optional().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), { message: 'Invalid room ID' }),
  building_id: z.string().optional().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), { message: 'Invalid building ID' }),
  date: z.string().optional().transform((str) => {
    if (!str) return undefined;
    const date = new Date(str);
    if (isNaN(date.getTime())) throw new Error('Invalid date format for date query parameter.');
    return date;
  }),
});

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (schedule/index):', err);
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

    const queryResult = ScheduleQuerySchema.safeParse(req.query);
    // ... (rest of the original handler.get logic) ...
    if (!queryResult.success) {
      return res.status(400).json({ message: 'Invalid query parameters', errors: queryResult.error.formErrors.fieldErrors });
    }

    const { room_id, building_id, date } = queryResult.data;
    let filter: any = {};

    if (room_id) filter.room_id = new mongoose.Types.ObjectId(room_id);

    if (building_id) {
      const rooms = await Room.find({ building_id: new mongoose.Types.ObjectId(building_id) }).select('_id');
      if (rooms.length === 0 && !room_id) {
        return res.json({ message: 'No rooms found for the specified building', schedule: [] });
      }
      if (!filter.room_id) {
          filter.room_id = { $in: rooms.map(room => room._id) };
      }
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.$or = [
        { start_time: { $gte: startOfDay, $lte: endOfDay } },
        { end_time: { $gte: startOfDay, $lte: endOfDay } },
        { start_time: { $lt: startOfDay }, end_time: { $gt: endOfDay } },
      ];
    }

    const reservations = await Reservation.find(filter)
      .populate({ path: 'room_id', select: 'name capacity facilities', populate: { path: 'building_id', select: 'name address' } })
      .select('title start_time end_time organizer attendees agenda_meeting')
      .sort({ start_time: 1 });

    const scheduleByRoom: { [key: string]: any } = {};
    reservations.forEach(reservation => {
      const room = reservation.room_id as any;
      if (!room || !room._id) return;
      const roomKey = room._id.toString();

      if (!scheduleByRoom[roomKey]) {
        scheduleByRoom[roomKey] = {
          room: { id: room._id, name: room.name, capacity: room.capacity, facilities: room.facilities, building: room.building_id },
          reservations: [],
        };
      }
      scheduleByRoom[roomKey].reservations.push({
        id: reservation._id, title: reservation.title, start_time: reservation.start_time, end_time: reservation.end_time,
        organizer: reservation.organizer, attendees: reservation.attendees, agenda_meeting: reservation.agenda_meeting,
      });
    });

    const scheduleData = Object.values(scheduleByRoom); // Renamed from 'schedule' to avoid conflict
    return res.json({
      message: 'Schedule retrieved successfully',
      filters: { room_id: room_id || null, building_id: building_id || null, date: date ? date.toISOString().split('T')[0] : null },
      total_rooms_in_schedule: scheduleData.length,
      total_reservations_in_schedule: reservations.length,
      schedule: scheduleData, // Use the renamed variable
    });

  } catch (error: any) {
    console.error('Error fetching schedule:', error);
    if (error.message.includes('Invalid date format')) {
        return res.status(400).json({ message: 'Invalid query parameters', errors: { date: [error.message] } });
    }
    // Handle DB connection error from dbConnect if it throws before caught by its own middleware (not the case here)
    if (error.message.includes('Database connection error')) { // Or check specific error type
        return res.status(500).json({ message: 'Database service unavailable', error: error.message });
    }
    return res.status(500).json({ message: 'Error fetching schedule', error: error.message });
  }
});

export default handler;
