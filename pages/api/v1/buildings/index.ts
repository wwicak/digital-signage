import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import * as z from 'zod';
import authMiddleware, { ensureAuthenticated, ensureAdmin } from '../../../../../lib/auth/session';
import Building from '../../../../../api/models/Building';
// IUser import is implicitly handled by ensureAdmin from session.ts

const CreateBuildingSchema = z.object({
  name: z.string().min(1, { message: 'Building name is required' }),
  address: z.string().min(1, { message: 'Building address is required' }),
});
const BuildingQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)).refine(v => v > 0, 'Page must be > 0'),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)).refine(v => v > 0, 'Limit must be > 0'),
});

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (buildings/index):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => { res.status(404).json({ message: 'Not Found for this method' }); },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);
handler.use(ensureAdmin);

// GET all buildings (paginated)
handler.get(async (req, res) => {
  try {
    const queryResult = BuildingQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({ message: 'Invalid query parameters', errors: queryResult.error.formErrors.fieldErrors });
    }
    const { page, limit } = queryResult.data;
    const skip = (page - 1) * limit;
    const buildings = await Building.find().sort({ creation_date: -1 }).skip(skip).limit(limit);
    const total = await Building.countDocuments();
    return res.json({ buildings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching buildings', error: error.message });
  }
});

// POST create new building
handler.post(async (req, res) => {
  try {
    const result = CreateBuildingSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: 'Validation failed', errors: result.error.formErrors.fieldErrors });
    }
    const { name, address } = result.data;
    const newBuilding = new Building({ name, address });
    const savedBuilding = await newBuilding.save();
    return res.status(201).json(savedBuilding);
  } catch (error: any) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    return res.status(500).json({ message: 'Error creating building', error: error.message });
  }
});

export default handler;
