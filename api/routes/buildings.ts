import express, { Request, Response, NextFunction, Router } from "express";
import mongoose from "mongoose";
import * as z from "zod";

import Building, { BuildingSchemaZod } from "../models/Building";
import { IUser } from "../models/User";

/**
 * @swagger
 * tags:
 *   name: Buildings
 *   description: Building management endpoints
 */

const router: Router = express.Router();

// Zod schemas for request validation
const CreateBuildingSchema = z.object({
  name: z.string().min(1, { message: "Building name is required" }),
  address: z.string().min(1, { message: "Building address is required" }),
});

const UpdateBuildingSchema = CreateBuildingSchema.partial();

// Query parameters schema for filtering
const BuildingQuerySchema = z.object({
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
 * /buildings:
 *   get:
 *     summary: Get all buildings
 *     description: Retrieve a paginated list of all buildings. Requires admin authentication.
 *     tags: [Buildings]
 *     security:
 *       - sessionAuth: []
 *     parameters:
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
 *         description: Successfully retrieved buildings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BuildingsResponse'
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
 */
// GET all buildings
router.get(
  "/",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request, res: Response) => {
    try {
      const queryResult = BuildingQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        res.status(400).json({
          message: "Invalid query parameters",
          errors: queryResult.error.formErrors.fieldErrors,
        });
        return;
      }

      const { page, limit } = queryResult.data;
      const skip = (page - 1) * limit;

      const buildings = await Building.find()
        .sort({ creation_date: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Building.countDocuments();

      res.json({
        buildings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Error fetching buildings",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /buildings/{id}:
 *   get:
 *     summary: Get building by ID
 *     description: Retrieve a specific building by its ID. Requires admin authentication.
 *     tags: [Buildings]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The building ID
 *     responses:
 *       200:
 *         description: Successfully retrieved building
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Building'
 *       400:
 *         description: Invalid building ID
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
 *         description: Building not found
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
// GET building by ID
router.get(
  "/:id",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: "Invalid building ID" });
        return;
      }

      const building = await Building.findById(req.params.id);
      if (!building) {
        res.status(404).json({ message: "Building not found" });
        return;
      }

      res.json(building);
    } catch (error: any) {
      res.status(500).json({
        message: "Error fetching building",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /buildings:
 *   post:
 *     summary: Create a new building
 *     description: Create a new building with the provided information. Requires admin authentication.
 *     tags: [Buildings]
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
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 description: Name of the building
 *                 example: "Main Office Building"
 *               address:
 *                 type: string
 *                 minLength: 1
 *                 description: Physical address of the building
 *                 example: "123 Business Street, City, State 12345"
 *     responses:
 *       201:
 *         description: Building created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Building'
 *       400:
 *         description: Validation failed
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
// POST create new building
router.post(
  "/",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request, res: Response) => {
    try {
      const result = CreateBuildingSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          message: "Validation failed",
          errors: result.error.formErrors.fieldErrors,
        });
        return;
      }

      const { name, address } = result.data;

      const newBuilding = new Building({
        name,
        address,
      });

      const savedBuilding = await newBuilding.save();
      res.status(201).json(savedBuilding);
    } catch (error: any) {
      console.error("Error creating building:", error);
      if (error.name === "ValidationError") {
        res.status(400).json({
          message: "Validation Error",
          errors: error.errors,
        });
        return;
      }
      res.status(500).json({
        message: "Error creating building",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /buildings/{id}:
 *   put:
 *     summary: Update building by ID
 *     description: Update a specific building's information. Requires admin authentication.
 *     tags: [Buildings]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The building ID
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
 *                 description: Name of the building
 *                 example: "Updated Office Building"
 *               address:
 *                 type: string
 *                 minLength: 1
 *                 description: Physical address of the building
 *                 example: "456 New Business Street, City, State 12345"
 *     responses:
 *       200:
 *         description: Building updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Building'
 *       400:
 *         description: Invalid building ID or validation failed
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
 *         description: Building not found
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
// PUT update building by ID
router.put(
  "/:id",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: "Invalid building ID" });
        return;
      }

      const result = UpdateBuildingSchema.safeParse(req.body);
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

      const updatedBuilding = await Building.findByIdAndUpdate(
        req.params.id,
        { ...updateData, last_update: new Date() },
        { new: true, runValidators: true }
      );

      if (!updatedBuilding) {
        res.status(404).json({ message: "Building not found" });
        return;
      }

      res.json(updatedBuilding);
    } catch (error: any) {
      console.error("Error updating building:", error);
      if (error.name === "ValidationError") {
        res.status(400).json({
          message: "Validation Error",
          errors: error.errors,
        });
        return;
      }
      res.status(500).json({
        message: "Error updating building",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /buildings/{id}:
 *   delete:
 *     summary: Delete building by ID
 *     description: Delete a specific building. Cannot delete if building has existing rooms. Requires admin authentication.
 *     tags: [Buildings]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The building ID
 *     responses:
 *       200:
 *         description: Building deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Building deleted successfully"
 *       400:
 *         description: Invalid building ID
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
 *         description: Building not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Cannot delete building with existing rooms
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
// DELETE building by ID
router.delete(
  "/:id",
  ensureAuthenticated,
  ensureAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ message: "Invalid building ID" });
        return;
      }

      // Check if building has rooms before deletion
      const Room = mongoose.model("Room");
      const roomsCount = await Room.countDocuments({
        building_id: req.params.id,
      });

      if (roomsCount > 0) {
        res.status(409).json({
          message: "Cannot delete building with existing rooms",
          conflictingRooms: roomsCount,
        });
        return;
      }

      const deletedBuilding = await Building.findByIdAndDelete(req.params.id);
      if (!deletedBuilding) {
        res.status(404).json({ message: "Building not found" });
        return;
      }

      res.json({ message: "Building deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting building:", error);
      res.status(500).json({
        message: "Error deleting building",
        error: error.message,
      });
    }
  }
);

export default router;
