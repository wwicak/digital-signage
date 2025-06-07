// Next.js API route for /api/slides/[id] (GET one, PUT update, DELETE)
import type { NextApiRequest, NextApiResponse } from "next/types";
import dbConnect from "../../../lib/mongodb";
import Slide, { SlideSchemaZod, SlideTypeZod } from "../../../api/models/Slide";
import Slideshow from "../../../api/models/Slideshow";
import {
  handleSlideInSlideshows,
  getDisplayIdsForSlide,
  deleteSlideAndCleanReferences,
} from "../../../api/helpers/slide_helper";
import { sendEventToDisplay } from "../../../api/sse_manager";
import { requireAuth } from "../../../api/helpers/auth_helper";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  // Authentication: Use proper auth helper
  let user: any;
  try {
    user = await requireAuth(req);
  } catch (error: any) {
    return res.status(401).json({ message: "Authentication required" });
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

      // Notify relevant displays via SSE
      try {
        const displayIds = await getDisplayIdsForSlide(
          (savedSlide._id as any).toString()
        );
        for (const displayId of displayIds) {
          sendEventToDisplay(displayId, "display_updated", {
            displayId,
            action: "update",
            reason: "slide_change",
            slideId: (savedSlide._id as any).toString(),
          });
        }
      } catch (notifyError) {
        // Log error but don't let it fail the main operation
        console.error(
          `Error notifying displays after slide update ${id}:`,
          notifyError
        );
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

      // Get display IDs before deleting the slide
      let displayIds: string[] = [];
      try {
        displayIds = await getDisplayIdsForSlide(id);
      } catch (notifyError) {
        console.error(
          `Error getting display IDs for slide ${id}:`,
          notifyError
        );
      }

      const deletedSlide = await deleteSlideAndCleanReferences(id);

      if (!deletedSlide) {
        return res
          .status(404)
          .json({ message: "Slide not found during deletion process." });
      }

      // Notify relevant displays via SSE
      try {
        for (const displayId of displayIds) {
          sendEventToDisplay(displayId, "display_updated", {
            displayId,
            action: "update",
            reason: "slide_deleted",
            slideId: id,
          });
        }
      } catch (notifyError) {
        console.error(
          `Error notifying displays after slide deletion ${id}:`,
          notifyError
        );
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
