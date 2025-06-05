import express, { Request, Response, NextFunction, Router } from "express";
import mongoose from "mongoose";
import * as z from "zod";

import Room, { RoomSchemaZod } from "../models/Room";
import Building from "../models/Building";
import { IUser } from "../models/User";

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Room management endpoints
 */

const router: Router = express.Router();

// Zod schemas for request validation
const CreateRoomSchema = z.object({
  name: z.string().min(1, { message: "Room name is required" }),
  building_id: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid building ID",
    }),
  capacity: z.number().min(1, { message: "Capacity must be at least 1" }),
  facilities: z.array(z.string()).optional(),
});

const UpdateRoomSchema = CreateRoomSchema.partial();

// Query parameters schema for filtering
const RoomQuerySchema = z.object({
  building_id: z
    .string()
    .optional()
    .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid building ID",
    }),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
});

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

/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: Get all rooms
 *     description: Retrieve a paginated list of all rooms with optional building filter. Requires admin authentication.
 *     tags: [Rooms]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: building_id
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter rooms by building ID
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
 *         description: Successfully retrieved rooms
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomsResponse'
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
 *     summary: Create a new room
 *     description: Create a new room with the provided information. Requires admin authentication.
 *     tags: [Rooms]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - building_id
 *               - capacity
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 description: Name of the room
 *                 example: "Conference Room A"
 *               building_id:
 *                 type: string
 *                 format: objectId
 *                 description: ID of the building this room belongs to
 *                 example: "507f1f77bcf86cd799439011"
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Maximum capacity of the room
 *                 example: 12
 *               facilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of facilities available in the room
 *                 example: ["Projector", "Whiteboard", "Video Conference"]
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Validation failed or building not found
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
 */

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: Get room by ID
 *     description: Retrieve a specific room by its ID. Requires admin authentication.
 *     tags: [Rooms]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The room ID
 *     responses:
 *       200:
 *         description: Successfully retrieved room
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid room ID
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
 *         description: Room not found
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
 *     summary: Update room by ID
 *     description: Update a specific room's information. Requires admin authentication.
 *     tags: [Rooms]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 description: Name of the room
 *                 example: "Updated Conference Room A"
 *               building_id:
 *                 type: string
 *                 format: objectId
 *                 description: ID of the building this room belongs to
 *                 example: "507f1f77bcf86cd799439011"
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Maximum capacity of the room
 *                 example: 15
 *               facilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of facilities available in the room
 *                 example: ["Projector", "Smart Board", "Video Conference", "Audio System"]
 *     responses:
 *       200:
 *         description: Room updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *       400:
 *         description: Invalid room ID, validation failed, or building not found
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
 *         description: Room not found
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
 *   delete:
 *     summary: Delete room by ID
 *     description: Delete a specific room. Cannot delete if room has existing reservations. Requires admin authentication.
 *     tags: [Rooms]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The room ID
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Room deleted successfully"
 *       400:
 *         description: Invalid room ID
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
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Cannot delete room with existing reservations
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

// GET all rooms (with optional building_id filter)
router.get(
  "/",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request, res: Response) => {
    try {
      const queryResult = RoomQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        res.status(400).json({
          message: "Invalid query parameters",
          errors: queryResult.error.formErrors.fieldErrors,
        });
        return;
      }

      const { building_id, page, limit } = queryResult.data;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (building_id) {
        filter.building_id = building_id;
      }

      const rooms = await Room.find(filter)
        .populate("building_id", "name address")
        .sort({ creation_date: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Room.countDocuments(filter);

      res.json({
        rooms,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Error fetching rooms",
        error: error.message,
      });
    }
  }
);

// GET room by ID
router.get(
  "/:id",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: "Invalid room ID" });
        return;
      }

      const room = await Room.findById(req.params.id).populate(
        "building_id",
        "name address"
      );
      if (!room) {
        res.status(404).json({ message: "Room not found" });
        return;
      }

      res.json(room);
    } catch (error: any) {
      res.status(500).json({
        message: "Error fetching room",
        error: error.message,
      });
    }
  }
);

// POST create new room
router.post(
  "/",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request, res: Response) => {
    try {
      const result = CreateRoomSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          message: "Validation failed",
          errors: result.error.formErrors.fieldErrors,
        });
        return;
      }

      const { name, building_id, capacity, facilities } = result.data;

      // Verify building exists
      const building = await Building.findById(building_id);
      if (!building) {
        res.status(400).json({ message: "Building not found" });
        return;
      }

      const newRoom = new Room({
        name,
        building_id: new mongoose.Types.ObjectId(building_id),
        capacity,
        facilities: facilities || [],
      });

      const savedRoom = await newRoom.save();
      const populatedRoom = await Room.findById(savedRoom._id).populate(
        "building_id",
        "name address"
      );

      res.status(201).json(populatedRoom);
    } catch (error: any) {
      console.error("Error creating room:", error);
      if (error.name === "ValidationError") {
        res.status(400).json({
          message: "Validation Error",
          errors: error.errors,
        });
        return;
      }
      res.status(500).json({
        message: "Error creating room",
        error: error.message,
      });
    }
  }
);

// PUT update room by ID
router.put(
  "/:id",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: "Invalid room ID" });
        return;
      }

      const result = UpdateRoomSchema.safeParse(req.body);
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

      // If building_id is being updated, verify the building exists
      if (updateData.building_id) {
        const building = await Building.findById(updateData.building_id);
        if (!building) {
          res.status(400).json({ message: "Building not found" });
          return;
        }
        updateData.building_id = new mongoose.Types.ObjectId(
          updateData.building_id
        ) as any;
      }

      const updatedRoom = await Room.findByIdAndUpdate(
        req.params.id,
        { ...updateData, last_update: new Date() },
        { new: true, runValidators: true }
      ).populate("building_id", "name address");

      if (!updatedRoom) {
        res.status(404).json({ message: "Room not found" });
        return;
      }

      res.json(updatedRoom);
    } catch (error: any) {
      console.error("Error updating room:", error);
      if (error.name === "ValidationError") {
        res.status(400).json({
          message: "Validation Error",
          errors: error.errors,
        });
        return;
      }
      res.status(500).json({
        message: "Error updating room",
        error: error.message,
      });
    }
  }
);

// DELETE room by ID
router.delete(
  "/:id",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: "Invalid room ID" });
        return;
      }

      // Check if room has reservations before deletion
      const Reservation = mongoose.model("Reservation");
      const reservationsCount = await Reservation.countDocuments({
        room_id: req.params.id,
      });

      if (reservationsCount > 0) {
        res.status(409).json({
          message: "Cannot delete room with existing reservations",
          conflictingReservations: reservationsCount,
        });
        return;
      }

      const deletedRoom = await Room.findByIdAndDelete(req.params.id);
      if (!deletedRoom) {
        res.status(404).json({ message: "Room not found" });
        return;
      }

      res.json({ message: "Room deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting room:", error);
      res.status(500).json({
        message: "Error deleting room",
        error: error.message,
      });
    }
  }
);

export default router;
