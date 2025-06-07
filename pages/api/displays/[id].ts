// Next.js API route for /api/displays/[id] (GET, PUT, DELETE)
//import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import Display from "../../../api/models/Display";
import { WidgetType } from "../../../api/models/Widget";
import {
  updateWidgetsForDisplay,
  deleteWidgetsForDisplay,
} from "../../../api/helpers/display_helper";
import { z } from "zod";

import { requireAuth } from "../../../api/helpers/auth_helper";
import { sendEventToDisplay } from "../../../api/sse_manager";

// --- Zod schemas ---
const DisplayUpdateSchema = z.object({
  name: z.string().optional(),
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
        _id: z.string().optional(),
        name: z.string().optional(),
        type: z.nativeEnum(WidgetType).optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        w: z.number().optional(),
        h: z.number().optional(),
        data: z.any().optional(),
      })
    )
    .optional(),
});

export default async function handler(req: any, res: any) {
  await dbConnect();

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid display id" });
  }

  if (req.method === "GET") {
    // Get a specific display by ID
    try {
      const user = await requireAuth(req);
      const display = await Display.findOne({
        _id: id,
        creator_id: user._id,
      }).populate("widgets");
      if (!display) {
        return res
          .status(404)
          .json({ message: "Display not found or not authorized." });
      }
      // Note: augmentDisplayWithClientInfo could be added here if needed
      res.status(200).json(display);
    } catch (err: any) {
      res
        .status(err.status || 500)
        .json({ message: err.message || "Error fetching display" });
    }
  } else if (req.method === "PUT") {
    // Update a display by ID
    try {
      const user = await requireAuth(req);
      const parseResult = DisplayUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: parseResult.error.errors });
      }
      const { widgets: newWidgetsData, ...displayData } = parseResult.data;
      const displayToUpdate = await Display.findOne({
        _id: id,
        creator_id: user._id,
      });
      if (!displayToUpdate) {
        return res
          .status(404)
          .json({ message: "Display not found or not authorized" });
      }
      Object.assign(displayToUpdate, displayData);
      if (newWidgetsData) {
        const updatedWidgetIds = await updateWidgetsForDisplay(
          displayToUpdate,
          newWidgetsData as any, // Type assertion for Partial<IWidget>[] compatibility
          user._id
        );
        displayToUpdate.widgets = updatedWidgetIds;
      }
      const savedDisplay = await displayToUpdate.save();
      const populatedDisplay = await savedDisplay.populate("widgets");
      // Send SSE event for display update
      try {
        sendEventToDisplay(id as string, "display_updated", {
          displayId: id,
          action: "update",
          display: populatedDisplay,
        });
        sendEventToDisplay("global", "display-updated", {
          displayId: id,
          action: "update",
          display: populatedDisplay,
        });
      } catch (error) {
        console.error("Failed to send SSE event:", error);
      }
      res.status(200).json(populatedDisplay);
    } catch (err: any) {
      res
        .status(err.status || 500)
        .json({ message: err.message || "Error updating display" });
    }
  } else if (req.method === "DELETE") {
    // Delete a display by ID
    try {
      const user = await requireAuth(req);
      const display = await Display.findOne({ _id: id, creator_id: user._id });
      if (!display) {
        return res
          .status(404)
          .json({ message: "Display not found or not authorized" });
      }
      await deleteWidgetsForDisplay(display);
      await Display.findByIdAndDelete(id);
      // Send SSE event for display deletion
      try {
        sendEventToDisplay(id as string, "display_updated", {
          displayId: id,
          action: "delete",
        });
        sendEventToDisplay("global", "display-updated", {
          displayId: id,
          action: "delete",
        });
      } catch (error) {
        console.error("Failed to send SSE event:", error);
      }
      res.status(200).json({
        message: "Display and associated widgets deleted successfully",
      });
    } catch (err: any) {
      res
        .status(err.status || 500)
        .json({ message: err.message || "Error deleting display" });
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
