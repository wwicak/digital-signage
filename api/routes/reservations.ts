import express, { Request, Response, NextFunction, Router } from "express";
import mongoose from "mongoose";
import * as z from "zod";

import Reservation, { ReservationSchemaZod } from "../models/Reservation";
import Room from "../models/Room";
import { IUser } from "../models/User";

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Reservation management endpoints
 */

const router: Router = express.Router();

// Zod schemas for request validation
const CreateReservationSchema = z
  .object({
    title: z.string().min(1, { message: "Reservation title is required" }),
    room_id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid room ID",
    }),
    start_time: z.string().transform((str) => new Date(str)),
    end_time: z.string().transform((str) => new Date(str)),
    organizer: z.string().min(1, { message: "Organizer is required" }),
    attendees: z.array(z.string()).optional(),
    agenda_meeting: z.string().optional(),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  });

const UpdateReservationSchema = z
  .object({
    title: z
      .string()
      .min(1, { message: "Reservation title is required" })
      .optional(),
    room_id: z
      .string()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid room ID",
      })
      .optional(),
    start_time: z
      .string()
      .transform((str) => new Date(str))
      .optional(),
    end_time: z
      .string()
      .transform((str) => new Date(str))
      .optional(),
    organizer: z
      .string()
      .min(1, { message: "Organizer is required" })
      .optional(),
    attendees: z.array(z.string()).optional(),
    agenda_meeting: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return data.end_time > data.start_time;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["end_time"],
    }
  );

// Query parameters schema for filtering
const ReservationQuerySchema = z
  .object({
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
    start_date: z
      .string()
      .optional()
      .transform((str) => (str ? new Date(str) : undefined)),
    end_date: z
      .string()
      .optional()
      .transform((str) => (str ? new Date(str) : undefined)),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val) : 10)),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return data.end_date >= data.start_date;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["end_date"],
    }
  );

// Middleware to ensure user is authenticated
const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "User not authenticated" });
};

// Middleware to ensure user is admin
const ensureAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as IUser;
  if (!user || user.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
};

// Helper function to check for reservation conflicts
async function checkReservationConflict(
  roomId: string,
  startTime: Date,
  endTime: Date,
  excludeReservationId?: string
): Promise<{ hasConflict: boolean; conflictingReservations?: any[] }> {
  try {
    const filter: any = {
      room_id: roomId,
      $or: [
        // Reservation starts during an existing reservation
        {
          start_time: { $lt: endTime },
          end_time: { $gt: startTime },
        },
      ],
    };

    // Exclude current reservation when updating
    if (excludeReservationId) {
      filter._id = { $ne: excludeReservationId };
    }

    const conflictingReservations = await Reservation.find(filter)
      .populate("room_id", "name")
      .select("title start_time end_time organizer");

    return {
      hasConflict: conflictingReservations.length > 0,
      conflictingReservations:
        conflictingReservations.length > 0
          ? conflictingReservations
          : undefined,
    };
  } catch (error) {
    console.error("Error checking reservation conflict:", error);
    throw new Error("Failed to check reservation conflicts");
  }
}

/**
 * @swagger
 * /reservations:
 *   get:
 *     summary: Get all reservations
 *     description: Retrieve a paginated list of all reservations with filtering options. Requires admin authentication.
 *     tags: [Reservations]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: room_id
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter reservations by room ID
 *       - in: query
 *         name: building_id
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter reservations by building ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter reservations from this start date
 *         example: "2024-01-15T00:00:00.000Z"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter reservations until this end date
 *         example: "2024-01-20T23:59:59.999Z"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved reservations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReservationsResponse'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a new reservation
 *     description: Create a new reservation with conflict checking. Requires admin authentication.
 *     tags: [Reservations]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - room_id
 *               - start_time
 *               - end_time
 *               - organizer
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 description: Title of the meeting/reservation
 *                 example: "Weekly Team Meeting"
 *               room_id:
 *                 type: string
 *                 format: objectId
 *                 description: ID of the room to reserve
 *                 example: "507f1f77bcf86cd799439012"
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 description: Start date and time of the reservation
 *                 example: "2024-01-15T09:00:00.000Z"
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 description: End date and time of the reservation
 *                 example: "2024-01-15T10:00:00.000Z"
 *               organizer:
 *                 type: string
 *                 minLength: 1
 *                 description: Name of the meeting organizer
 *                 example: "John Doe"
 *               attendees:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of meeting attendees
 *                 example: ["Jane Smith", "Bob Johnson", "Alice Wilson"]
 *               agenda_meeting:
 *                 type: string
 *                 description: Meeting agenda or description
 *                 example: "Discuss quarterly goals and project updates"
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Validation failed or room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Room is already booked for the requested time slot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConflictError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     summary: Get reservation by ID
 *     description: Retrieve a specific reservation by its ID. Requires admin authentication.
 *     tags: [Reservations]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The reservation ID
 *     responses:
 *       200:
 *         description: Successfully retrieved reservation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Invalid reservation ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reservation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Update reservation by ID
 *     description: Update a specific reservation with conflict checking. Requires admin authentication.
 *     tags: [Reservations]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The reservation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 description: Title of the meeting/reservation
 *                 example: "Updated Team Meeting"
 *               room_id:
 *                 type: string
 *                 format: objectId
 *                 description: ID of the room to reserve
 *                 example: "507f1f77bcf86cd799439012"
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 description: Start date and time of the reservation
 *                 example: "2024-01-15T10:00:00.000Z"
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 description: End date and time of the reservation
 *                 example: "2024-01-15T11:00:00.000Z"
 *               organizer:
 *                 type: string
 *                 minLength: 1
 *                 description: Name of the meeting organizer
 *                 example: "Jane Doe"
 *               attendees:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of meeting attendees
 *                 example: ["John Smith", "Alice Johnson", "Bob Wilson"]
 *               agenda_meeting:
 *                 type: string
 *                 description: Meeting agenda or description
 *                 example: "Updated agenda: Discuss Q2 goals and budget planning"
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Invalid reservation ID, validation failed, or room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reservation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Room is already booked for the requested time slot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConflictError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Cancel reservation by ID
 *     description: Cancel (delete) a specific reservation. Requires admin authentication.
 *     tags: [Reservations]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The reservation ID
 *     responses:
 *       200:
 *         description: Reservation cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reservation cancelled successfully"
 *       400:
 *         description: Invalid reservation ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reservation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// GET all reservations (with filtering options)
router.get(
  "/",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request, res: Response) => {
    try {
      const queryResult = ReservationQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        res.status(400).json({
          message: "Invalid query parameters",
          errors: queryResult.error.formErrors.fieldErrors,
        });
        return;
      }

      const { room_id, building_id, start_date, end_date, page, limit } =
        queryResult.data;
      const skip = (page - 1) * limit;

      let filter: any = {};

      // Filter by room_id
      if (room_id) {
        filter.room_id = room_id;
      }

      // Filter by building_id (requires join with rooms)
      if (building_id) {
        const rooms = await Room.find({ building_id }).select("_id");
        const roomIds = rooms.map((room) => room._id);
        filter.room_id = { $in: roomIds };
      }

      // Filter by date range - reservations that overlap with the given range
      if (start_date || end_date) {
        const dateFilter: any = {};
        if (start_date && end_date) {
          // Find reservations that overlap with the date range
          dateFilter.$or = [
            {
              start_time: { $gte: start_date, $lte: end_date },
            },
            {
              end_time: { $gte: start_date, $lte: end_date },
            },
            {
              start_time: { $lte: start_date },
              end_time: { $gte: end_date },
            },
          ];
        } else if (start_date) {
          dateFilter.end_time = { $gte: start_date };
        } else if (end_date) {
          dateFilter.start_time = { $lte: end_date };
        }
        Object.assign(filter, dateFilter);
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
        .sort({ start_time: 1 })
        .skip(skip)
        .limit(limit);

      const total = await Reservation.countDocuments(filter);

      res.json({
        reservations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Error fetching reservations",
        error: error.message,
      });
    }
  }
);

// GET reservation by ID
router.get(
  "/:id",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: "Invalid reservation ID" });
        return;
      }

      const reservation = await Reservation.findById(req.params.id).populate({
        path: "room_id",
        select: "name capacity facilities",
        populate: {
          path: "building_id",
          select: "name address",
        },
      });

      if (!reservation) {
        res.status(404).json({ message: "Reservation not found" });
        return;
      }

      res.json(reservation);
    } catch (error: any) {
      res.status(500).json({
        message: "Error fetching reservation",
        error: error.message,
      });
    }
  }
);

// POST create new reservation
router.post(
  "/",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request, res: Response) => {
    try {
      const result = CreateReservationSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          message: "Validation failed",
          errors: result.error.formErrors.fieldErrors,
        });
        return;
      }

      const {
        title,
        room_id,
        start_time,
        end_time,
        organizer,
        attendees,
        agenda_meeting,
      } = result.data;

      // Verify room exists
      const room = await Room.findById(room_id);
      if (!room) {
        res.status(400).json({ message: "Room not found" });
        return;
      }

      // Check for booking conflicts
      const conflictCheck = await checkReservationConflict(
        room_id,
        start_time,
        end_time
      );
      if (conflictCheck.hasConflict) {
        res.status(409).json({
          message: "Room is already booked for the requested time slot",
          conflictingReservations: conflictCheck.conflictingReservations,
        });
        return;
      }

      const newReservation = new Reservation({
        title,
        room_id: new mongoose.Types.ObjectId(room_id),
        start_time,
        end_time,
        organizer,
        attendees: attendees || [],
        agenda_meeting,
      });

      const savedReservation = await newReservation.save();
      const populatedReservation = await Reservation.findById(
        savedReservation._id
      ).populate({
        path: "room_id",
        select: "name capacity facilities",
        populate: {
          path: "building_id",
          select: "name address",
        },
      });

      res.status(201).json(populatedReservation);
    } catch (error: any) {
      console.error("Error creating reservation:", error);
      if (error.name === "ValidationError") {
        res.status(400).json({
          message: "Validation Error",
          errors: error.errors,
        });
        return;
      }
      res.status(500).json({
        message: "Error creating reservation",
        error: error.message,
      });
    }
  }
);

// PUT update reservation by ID
router.put(
  "/:id",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: "Invalid reservation ID" });
        return;
      }

      const result = UpdateReservationSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          message: "Validation failed",
          errors: result.error.formErrors.fieldErrors,
        });
        return;
      }

      const updateData = result.data;
      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ message: "No valid fields to update" });
        return;
      }

      // Get current reservation
      const currentReservation = await Reservation.findById(req.params.id);
      if (!currentReservation) {
        res.status(404).json({ message: "Reservation not found" });
        return;
      }

      // Determine the final room_id, start_time, and end_time after update
      const finalRoomId =
        updateData.room_id || currentReservation.room_id.toString();
      const finalStartTime =
        updateData.start_time || currentReservation.start_time;
      const finalEndTime = updateData.end_time || currentReservation.end_time;

      // If room_id is being updated, verify the room exists
      if (updateData.room_id) {
        const room = await Room.findById(updateData.room_id);
        if (!room) {
          res.status(400).json({ message: "Room not found" });
          return;
        }
        updateData.room_id = new mongoose.Types.ObjectId(
          updateData.room_id
        ) as any;
      }

      // Check for booking conflicts (exclude current reservation)
      const conflictCheck = await checkReservationConflict(
        finalRoomId,
        finalStartTime,
        finalEndTime,
        req.params.id
      );

      if (conflictCheck.hasConflict) {
        res.status(409).json({
          message: "Room is already booked for the requested time slot",
          conflictingReservations: conflictCheck.conflictingReservations,
        });
        return;
      }

      const updatedReservation = await Reservation.findByIdAndUpdate(
        req.params.id,
        { ...updateData, last_update: new Date() },
        { new: true, runValidators: true }
      ).populate({
        path: "room_id",
        select: "name capacity facilities",
        populate: {
          path: "building_id",
          select: "name address",
        },
      });

      if (!updatedReservation) {
        res.status(404).json({ message: "Reservation not found" });
        return;
      }

      res.json(updatedReservation);
    } catch (error: any) {
      console.error("Error updating reservation:", error);
      if (error.name === "ValidationError") {
        res.status(400).json({
          message: "Validation Error",
          errors: error.errors,
        });
        return;
      }
      res.status(500).json({
        message: "Error updating reservation",
        error: error.message,
      });
    }
  }
);

// DELETE reservation by ID
router.delete(
  "/:id",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: "Invalid reservation ID" });
        return;
      }

      const deletedReservation = await Reservation.findByIdAndDelete(
        req.params.id
      );
      if (!deletedReservation) {
        res.status(404).json({ message: "Reservation not found" });
        return;
      }

      res.json({ message: "Reservation cancelled successfully" });
    } catch (error: any) {
      console.error("Error deleting reservation:", error);
      res.status(500).json({
        message: "Error cancelling reservation",
        error: error.message,
      });
    }
  }
);

export default router;
