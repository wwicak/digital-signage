// Next.js API route for /api/displays (GET all, POST create)
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import Display from "../../../api/models/Display";
import { WidgetType } from "../../../api/models/Widget";
import { createWidgetsForDisplay } from "../../../api/helpers/display_helper";
import { z } from "zod";

// --- Placeholder authentication helper ---
// TODO: Replace with next-auth getServerSession integration
async function requireAuth(req: NextApiRequest) {
  // Example: Assume user is attached to req (for migration only)
  // In production, use next-auth and getServerSession
  const user = (req as any).user;
  if (!user || !user._id) {
    throw { status: 401, message: "User not authenticated" };
  }
  return user;
}

// --- Zod schemas ---
const DisplayCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  layout: z.string().optional(),
  orientation: z.string().optional(),
  statusBar: z
    .object({
      enabled: z.boolean().optional(),
      color: z.string().optional(),
      elements: z.array(z.string()).optional(),
    })
    .optional(),
  widgets: z
    .array(
      z.object({
        name: z.string(),
        type: z.nativeEnum(WidgetType),
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
        data: z.any().default({}), // Required for WidgetData interface, default to empty object
      })
    )
    .optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method === "GET") {
    // Get all displays for the authenticated user
    try {
      const user = await requireAuth(req);
      const displays = await Display.find({ creator_id: user._id }).populate(
        "widgets"
      );
      // TODO: augmentDisplaysWithClientInfo if needed
      res.status(200).json(displays);
    } catch (err: any) {
      res
        .status(err.status || 500)
        .json({ message: err.message || "Error fetching displays" });
    }
  } else if (req.method === "POST") {
    // Create a new display
    try {
      const user = await requireAuth(req);
      const parseResult = DisplayCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: parseResult.error.errors });
      }
      const { name, description, layout, orientation, statusBar, widgets } =
        parseResult.data;
      const newDisplayDoc = new Display({
        name,
        description,
        creator_id: user._id,
        layout,
        orientation,
        statusBar,
        widgets: [],
      });
      if (widgets && widgets.length > 0) {
        // Ensure widgets have required data property for WidgetData interface
        const widgetsWithData = widgets.map((w) => ({
          ...w,
          data: w.data || {},
        }));
        await createWidgetsForDisplay(newDisplayDoc, widgetsWithData, user._id);
      }
      const savedDisplay = await newDisplayDoc.save();
      const populatedDisplay = await savedDisplay.populate("widgets");
      // TODO: sendEventToDisplay for SSE
      res.status(201).json(populatedDisplay);
    } catch (err: any) {
      res
        .status(err.status || 500)
        .json({ message: err.message || "Error creating display" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
