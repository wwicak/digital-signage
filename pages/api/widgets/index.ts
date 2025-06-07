// Next.js API route for /api/widgets (GET all, POST create)
import { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import Widget, { WidgetType } from "../../../api/models/Widget";
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

  // Authentication: Replace with actual logic
  let user: any;
  try {
    user = await getAuthenticatedUser(req);
  } catch (e) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  if (!user || !user._id) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (req.method === "GET") {
    // Get all widgets for the logged-in user
    try {
      const widgets = await Widget.find({ creator_id: user._id });
      return res.status(200).json(widgets);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error fetching widgets.", error: error.message });
    }
  } else if (req.method === "POST") {
    // Create a new widget
    const { name, type, x, y, w, h, data } = req.body;

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
