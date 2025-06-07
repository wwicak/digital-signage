// Next.js API route for /api/slides/[id] (GET one, PUT update, DELETE)
import { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import Slide, { SlideSchemaZod, SlideTypeZod } from "../../../api/models/Slide";
import Slideshow from "../../../api/models/Slideshow";
import {
  handleSlideInSlideshows,
  getDisplayIdsForSlide,
  deleteSlideAndCleanReferences,
} from "../../../api/helpers/slide_helper";

// Placeholder for authentication/session check
async function getAuthenticatedUser(req: NextApiRequest): Promise<any> {
  // TODO: Replace with next-auth session logic
  // const session = await getServerSession(req, res, authOptions);
  // if (!session || !session.user) return null;
  // return session.user;

  // Temporary implementation for slideshow refactoring - return a mock user
  return {
    _id: "temp_user_id_for_testing",
    email: "temp@example.com",
    name: "Temp User",
  };
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

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid slide ID" });
  }

  if (req.method === "GET") {
    // Get a specific slide by ID
    try {
      const slide = await Slide.findOne({
        _id: id,
        creator_id: user._id,
      });
      if (!slide) {
        return res
          .status(404)
          .json({ message: "Slide not found or not authorized." });
      }
      return res.status(200).json(slide);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error fetching slide.", error: error.message });
    }
  }

  if (req.method === "PUT") {
    // Update a slide by ID
    const { slideshow_ids, ...slideData } = req.body;

    // Validate type if present
    if (slideData.type && !SlideTypeZod.safeParse(slideData.type).success) {
      return res.status(400).json({ message: "Invalid slide type." });
    }

    try {
      const slideToUpdate = await Slide.findOne({
        _id: id,
        creator_id: user._id,
      });

      if (!slideToUpdate) {
        return res
          .status(404)
          .json({ message: "Slide not found or not authorized" });
      }

      let originalSlideshowIds: string[] = [];
      if (slideshow_ids !== undefined) {
        const slideshowsContainingSlide = await Slideshow.find({
          slides: slideToUpdate._id,
        }).select("_id");
        originalSlideshowIds = slideshowsContainingSlide.map((s: any) =>
          s._id.toString()
        );
      }

      Object.assign(slideToUpdate, slideData);

      // Validate updated slide
      const parseResult = SlideSchemaZod.safeParse(slideToUpdate.toObject());
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Validation Error",
          errors: parseResult.error.flatten(),
        });
      }

      const savedSlide = await slideToUpdate.save();

      if (slideshow_ids !== undefined) {
        await handleSlideInSlideshows(
          savedSlide,
          slideshow_ids,
          originalSlideshowIds
        );
      }

      // Notify relevant displays (SSE logic to be migrated for serverless)
      // TODO: Replace with serverless-friendly SSE or WebSocket logic
      try {
        const displayIds = await getDisplayIdsForSlide(savedSlide._id);
        // for (const displayId of displayIds) {
        //   sendEventToDisplay(displayId, 'display_updated', {
        //     displayId,
        //     action: 'update',
        //     reason: 'slide_change',
        //     slideId: savedSlide._id.toString(),
        //   });
        // }
      } catch (notifyError) {
        // Log error but don't let it fail the main operation
        // console.error(`Error notifying displays after slide update ${id}:`, notifyError);
      }

      return res.status(200).json(savedSlide);
    } catch (error: any) {
      if (error.name === "ValidationError") {
        return res
          .status(400)
          .json({ message: "Validation Error", errors: error.errors });
      }
      return res
        .status(500)
        .json({ message: "Error updating slide", error: error.message });
    }
  }

  if (req.method === "DELETE") {
    // Delete a slide by ID
    try {
      const slide = await Slide.findOne({
        _id: id,
        creator_id: user._id,
      });
      if (!slide) {
        return res
          .status(404)
          .json({ message: "Slide not found or not authorized" });
      }

      const deletedSlide = await deleteSlideAndCleanReferences(id);

      if (!deletedSlide) {
        return res
          .status(404)
          .json({ message: "Slide not found during deletion process." });
      }

      return res.status(200).json({ message: "Slide deleted successfully" });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error deleting slide", error: error.message });
    }
  }

  // Method not allowed
  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
