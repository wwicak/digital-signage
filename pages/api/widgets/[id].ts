// Next.js API route for /api/widgets/[id] (GET one, PUT update, DELETE)
import type { NextApiRequest, NextApiResponse } from "next/types";
import dbConnect from "../../../lib/mongodb";
import Widget from "../../../api/models/Widget";
import Display, { IDisplay } from "../../../api/models/Display";
import { validateWidgetData } from "../../../api/helpers/widget_helper";
import { sendEventToDisplay } from "../../../api/sse_manager";
import { requireAuth } from "../../../api/helpers/auth_helper";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  // Authentication: Use proper auth helper
  let user;
  try {
    user = await requireAuth(req);
  } catch (error: any) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid widget ID" });
  }

  if (req.method === "GET") {
    // Get a specific widget by ID
    try {
      const widget = await Widget.findOne({
        _id: id,
        creator_id: user._id,
      });
      if (!widget) {
        return res
          .status(404)
          .json({ message: "Widget not found or not authorized." });
      }
      return res.status(200).json(widget);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error fetching widget.", error: error.message });
    }
  } else if (req.method === "PUT") {
    // Update a widget by ID
    const { type, data, ...widgetUpdateData } = req.body;
    try {
      const widgetToUpdate = await Widget.findOne({
        _id: id,
        creator_id: user._id,
      });

      if (!widgetToUpdate) {
        return res
          .status(404)
          .json({ message: "Widget not found or not authorized" });
      }

      const typeToValidate = type || widgetToUpdate.type;
      const dataToValidate = data === undefined ? widgetToUpdate.data : data;

      if (type || data !== undefined) {
        await validateWidgetData(typeToValidate, dataToValidate);
      }

      Object.assign(widgetToUpdate, widgetUpdateData);
      if (type) widgetToUpdate.type = type;
      if (data !== undefined) widgetToUpdate.data = dataToValidate;

      const savedWidget = await widgetToUpdate.save();

      // Notify relevant displays via SSE
      try {
        const displays = (await Display.find({
          widgets: savedWidget._id,
          creator_id: user._id, // Ensure user owns the display
        })) as IDisplay[];

        for (const display of displays) {
          sendEventToDisplay(
            (display._id as any).toString(),
            "display_updated",
            {
              displayId: (display._id as any).toString(),
              action: "update",
              reason: "widget_change",
              widgetId: (savedWidget._id as any).toString(),
            }
          );
        }
      } catch (notifyError) {
        console.error("SSE notification failed:", notifyError);
      }

      return res.status(200).json(savedWidget);
    } catch (error: any) {
      if (error.name === "ValidationError") {
        return res
          .status(400)
          .json({ message: "Validation Error", errors: error.errors });
      }
      if (
        error.message.startsWith("Invalid data for") ||
        error.message.includes("not found")
      ) {
        return res.status(400).json({ message: error.message });
      }
      return res
        .status(500)
        .json({ message: "Error updating widget", error: error.message });
    }
  } else if (req.method === "DELETE") {
    // Delete a widget by ID
    try {
      const widget = await Widget.findOne({
        _id: id,
        creator_id: user._id,
      });
      if (!widget) {
        return res
          .status(404)
          .json({ message: "Widget not found or not authorized" });
      }

      // Remove widget from all displays that reference it
      await Display.updateMany({ widgets: id }, { $pull: { widgets: id } });

      // Delete the widget
      const deletedWidget = await Widget.findByIdAndDelete(id);

      if (!deletedWidget) {
        return res
          .status(404)
          .json({ message: "Widget not found during deletion process." });
      }

      // Notify relevant displays via SSE
      try {
        const displays = (await Display.find({
          widgets: id,
          creator_id: user._id, // Ensure user owns the display
        })) as IDisplay[];

        for (const display of displays) {
          sendEventToDisplay(
            (display._id as any).toString(),
            "display_updated",
            {
              displayId: (display._id as any).toString(),
              action: "update",
              reason: "widget_deleted",
              widgetId: id,
            }
          );
        }
      } catch (notifyError) {
        console.error("SSE notification failed:", notifyError);
      }

      return res.status(200).json({
        message: "Widget deleted successfully and removed from displays",
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error deleting widget", error: error.message });
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
