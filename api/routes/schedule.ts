import express, { Request, Response, Router } from "express";
import mongoose from "mongoose";
import * as z from "zod";

import Reservation from "../models/Reservation";
import Room from "../models/Room";

/**
 * @swagger
 * tags:
 *   name: Schedule
 *   description: Public schedule and room availability endpoints
 */

const router: Router = express.Router();

// Query parameters schema for schedule endpoint
const ScheduleQuerySchema = z.object({
  room_id: z
    .string()
    .optional()
    .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid room ID",
    }),
  building_id: z
    .string()
    .optional()
    .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid building ID",
    }),
  date: z
    .string()
    .optional()
    .transform((str) => {
      if (!str) return undefined;
      const date = new Date(str);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
      }
      return date;
    }),
});

/**
 * @swagger
 * /schedule:
 *   get:
 *     summary: Get public schedule
 *     description: Retrieve the public schedule of reservations. No authentication required. Can be filtered by room, building, or date.
 *     tags: [Schedule]
 *     parameters:
 *       - in: query
 *         name: room_id
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter schedule by specific room ID
 *         example: "507f1f77bcf86cd799439012"
 *       - in: query
 *         name: building_id
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter schedule by building ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter schedule for a specific date (YYYY-MM-DD)
 *         example: "2024-01-15"
 *     responses:
 *       200:
 *         description: Successfully retrieved schedule
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleResponse'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /schedule/availability:
 *   get:
 *     summary: Check room availability
 *     description: Check which rooms are available for a specific time range. No authentication required.
 *     tags: [Schedule]
 *     parameters:
 *       - in: query
 *         name: building_id
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter availability by building ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: start_time
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start time for availability check
 *         example: "2024-01-15T09:00:00.000Z"
 *       - in: query
 *         name: end_time
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End time for availability check
 *         example: "2024-01-15T10:00:00.000Z"
 *       - in: query
 *         name: capacity_min
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Minimum capacity requirement
 *         example: 10
 *     responses:
 *       200:
 *         description: Successfully retrieved room availability
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailabilityResponse'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// GET public schedule endpoint - no authentication required
router.get("/", async (req: Request, res: Response) => {
  try {
    const queryResult = ScheduleQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json({
        message: "Invalid query parameters",
        errors: queryResult.error.formErrors.fieldErrors,
      });
      return;
    }

    const { room_id, building_id, date } = queryResult.data;
    let filter: any = {};

    // Filter by room_id
    if (room_id) {
      filter.room_id = room_id;
    }

    // Filter by building_id (requires join with rooms)
    if (building_id) {
      const rooms = await Room.find({ building_id }).select("_id");
      if (rooms.length === 0) {
        res.json({
          message: "No rooms found for the specified building",
          schedule: [],
        });
        return;
      }
      const roomIds = rooms.map((room) => room._id);
      filter.room_id = { $in: roomIds };
    }

    // Filter by specific date - reservations for that day
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.$or = [
        // Reservation starts on this day
        {
          start_time: { $gte: startOfDay, $lte: endOfDay },
        },
        // Reservation ends on this day
        {
          end_time: { $gte: startOfDay, $lte: endOfDay },
        },
        // Reservation spans across this day
        {
          start_time: { $lt: startOfDay },
          end_time: { $gt: endOfDay },
        },
      ];
    }

    const reservations = await Reservation.find(filter)
      .populate({
        path: "room_id",
        select: "name capacity facilities",
        populate: {
          path: "building_id",
          select: "name address",
        },
      })
      .select("title start_time end_time organizer attendees agenda_meeting")
      .sort({ start_time: 1 });

    // Group reservations by room for better organization
    const scheduleByRoom: { [key: string]: any } = {};

    reservations.forEach((reservation) => {
      const room = reservation.room_id as any;
      const roomKey = room._id.toString();

      if (!scheduleByRoom[roomKey]) {
        scheduleByRoom[roomKey] = {
          room: {
            id: room._id,
            name: room.name,
            capacity: room.capacity,
            facilities: room.facilities,
            building: room.building_id,
          },
          reservations: [],
        };
      }

      scheduleByRoom[roomKey].reservations.push({
        id: reservation._id,
        title: reservation.title,
        start_time: reservation.start_time,
        end_time: reservation.end_time,
        organizer: reservation.organizer,
        attendees: reservation.attendees,
        agenda_meeting: reservation.agenda_meeting,
      });
    });

    const schedule = Object.values(scheduleByRoom);

    res.json({
      message: "Schedule retrieved successfully",
      filters: {
        room_id: room_id || null,
        building_id: building_id || null,
        date: date || null,
      },
      total_rooms: schedule.length,
      total_reservations: reservations.length,
      schedule,
    });
  } catch (error: any) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({
      message: "Error fetching schedule",
      error: error.message,
    });
  }
});

// GET room availability for a specific date and time range
router.get("/availability", async (req: Request, res: Response) => {
  try {
    const querySchema = z
      .object({
        building_id: z
          .string()
          .optional()
          .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid building ID",
          }),
        start_time: z.string().transform((str) => new Date(str)),
        end_time: z.string().transform((str) => new Date(str)),
        capacity_min: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val) : undefined)),
      })
      .refine((data) => data.end_time > data.start_time, {
        message: "End time must be after start time",
        path: ["end_time"],
      });

    const queryResult = querySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json({
        message: "Invalid query parameters",
        errors: queryResult.error.formErrors.fieldErrors,
      });
      return;
    }

    const { building_id, start_time, end_time, capacity_min } =
      queryResult.data;

    // Find all rooms (optionally filtered by building and capacity)
    let roomFilter: any = {};
    if (building_id) {
      roomFilter.building_id = building_id;
    }
    if (capacity_min) {
      roomFilter.capacity = { $gte: capacity_min };
    }

    const allRooms = await Room.find(roomFilter)
      .populate("building_id", "name address")
      .sort({ name: 1 });

    // Find conflicting reservations
    const conflictingReservations = await Reservation.find({
      room_id: { $in: allRooms.map((room) => room._id) },
      $or: [
        {
          start_time: { $lt: end_time },
          end_time: { $gt: start_time },
        },
      ],
    }).select("room_id title start_time end_time organizer");

    // Create a map of conflicting room IDs
    const conflictingRoomIds = new Set(
      conflictingReservations.map((res) => res.room_id.toString())
    );

    // Separate available and unavailable rooms
    const availableRooms = allRooms.filter(
      (room) =>
        !conflictingRoomIds.has(
          (room._id as mongoose.Types.ObjectId).toString()
        )
    );

    const unavailableRooms = allRooms
      .filter((room) =>
        conflictingRoomIds.has((room._id as mongoose.Types.ObjectId).toString())
      )
      .map((room) => {
        const conflicts = conflictingReservations.filter(
          (res) =>
            res.room_id.toString() ===
            (room._id as mongoose.Types.ObjectId).toString()
        );
        return {
          ...room.toObject(),
          conflicting_reservations: conflicts,
        };
      });

    res.json({
      message: "Room availability retrieved successfully",
      query: {
        building_id: building_id || null,
        start_time,
        end_time,
        capacity_min: capacity_min || null,
      },
      total_rooms: allRooms.length,
      available_rooms: availableRooms,
      unavailable_rooms: unavailableRooms,
      availability_summary: {
        available: availableRooms.length,
        unavailable: unavailableRooms.length,
      },
    });
  } catch (error: any) {
    console.error("Error checking room availability:", error);
    res.status(500).json({
      message: "Error checking room availability",
      error: error.message,
    });
  }
});

export default router;
