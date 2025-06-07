// Next.js API route for /api/widgets (GET all, POST create)
import { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import Widget from "../../../api/models/Widget";
import { validateWidgetData } from "../../../api/helpers/widget_helper";

// Placeholder for authentication/session check
async function getAuthenticatedUser(req: NextApiRequest): Promise<any> {
  // TODO: Replace with next-auth session logic
  // const session = await getServerSession(req, res, authOptions);
  // if (!session || !session.user) return null;
  // return session.user;
  throw new Error("Authentication/session check not implemented");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  // Authentication: Temporarily disabled for refactoring
  // TODO: Re-enable authentication after frontend refactoring is complete
  const user = { _id: "temp_user_id" }; // Temporary mock user

  if (req.method === "GET") {
    // Get widgets for the logged-in user, optionally filtered by display
    try {
      const { display_id } = req.query;

      if (display_id) {
        // Get widgets for a specific display
        const Display = (await import("../../../api/models/Display")).default;
        const display = await Display.findById(display_id).populate("widgets");

        if (!display) {
          return res.status(404).json({ message: "Display not found" });
        }

        // Filter widgets to only include those owned by the current user
        const userWidgets = display.widgets.filter(
          (widget: any) =>
            widget.creator_id && widget.creator_id.toString() === user._id
        );

        return res.status(200).json(userWidgets);
      } else {
        // Get all widgets for the logged-in user
        const widgets = await Widget.find({ creator_id: user._id });
        return res.status(200).json(widgets);
      }
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error fetching widgets.", error: error.message });
    }
  } else if (req.method === "POST") {
    // Create a new widget
    const { name, type, x, y, w, h, data, display_id } = req.body;

    if (!name || !type) {
      return res
        .status(400)
        .json({ message: "Widget name and type are required." });
    }

    try {
      await validateWidgetData(type, data);

      const newWidgetDoc = new Widget({
        name,
        type,
        x: x === undefined ? 0 : x,
        y: y === undefined ? 0 : y,
        w: w === undefined ? 1 : w,
        h: h === undefined ? 1 : h,
        data,
        creator_id: user._id,
      });

      const savedWidget = await newWidgetDoc.save();

      // If display_id is provided, add widget to display's widgets array
      if (display_id) {
        const Display = (await import("../../../api/models/Display")).default;
        await Display.findByIdAndUpdate(
          display_id,
          { $addToSet: { widgets: savedWidget._id } },
          { new: true }
        );
      }

      return res.status(201).json(savedWidget);
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
        .json({ message: "Error creating widget", error: error.message });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
