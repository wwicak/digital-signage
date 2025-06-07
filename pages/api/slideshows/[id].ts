import type { NextApiRequest, NextApiResponse } from "next/types";
import mongoose from "mongoose";
import dbConnect from "../../../lib/mongodb";
import Slideshow from "../../../api/models/Slideshow";
import { UpdateSlideshowSchema } from "../../../api/schemas/slideshow";
import {
  validateSlidesExist,
  reorderSlidesInSlideshow,
  populateSlideshowSlides,
  getDisplayIdsForSlideshow,
} from "../../../api/helpers/slideshow_helper";
// import { sendEventToDisplay } from "../../../api/sse_manager"; // SSE logic to be migrated for serverless

// Placeholder for authentication/session check
async function getAuthenticatedUser(req: NextApiRequest): Promise<any> {
  // TODO: Replace with actual session logic using next-auth
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
    return res.status(400).json({ message: "Invalid slideshow ID" });
  }

  if (req.method === "GET") {
    // Get a specific slideshow by ID
    try {
      const slideshow = await Slideshow.findOne({
        _id: id,
        creator_id: user._id,
      }).populate("slides");
      if (!slideshow) {
        return res
          .status(404)
          .json({ message: "Slideshow not found or not authorized." });
      }
      return res.status(200).json(slideshow);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error fetching slideshow.", error: error.message });
    }
  }

  if (req.method === "PUT") {
    // Update a slideshow by ID
    const result = UpdateSlideshowSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.formErrors.fieldErrors,
      });
    }

    const { slide_ids, oldIndex, newIndex, ...slideshowData } = result.data;

    try {
      const slideshowToUpdate = await Slideshow.findOne({
        _id: id,
        creator_id: user._id,
      });

      if (!slideshowToUpdate) {
        return res
          .status(404)
          .json({ message: "Slideshow not found or not authorized" });
      }

      if (typeof oldIndex === "number" && typeof newIndex === "number") {
        await reorderSlidesInSlideshow(slideshowToUpdate, oldIndex, newIndex);
      }

      Object.assign(slideshowToUpdate, slideshowData);
      if (slide_ids) {
        if (slide_ids.length > 0) {
          const validSlideIds = await validateSlidesExist(slide_ids);
          if (validSlideIds.length !== slide_ids.length) {
            return res.status(400).json({
              message:
                "One or more provided slide IDs are invalid or do not exist.",
            });
          }
        }
        slideshowToUpdate.slides = slide_ids.map(
          (id) => new mongoose.Types.ObjectId(id)
        );
      }

      const savedSlideshow = await slideshowToUpdate.save();
      const populatedSlideshow = await populateSlideshowSlides(savedSlideshow);

      // Notify relevant displays (SSE logic to be migrated for serverless)
      // try {
      //   const displayIds = await getDisplayIdsForSlideshow(savedSlideshow._id);
      //   for (const displayId of displayIds) {
      //     sendEventToDisplay(displayId, "display_updated", {
      //       displayId,
      //       action: "update",
      //       reason: "slideshow_change",
      //       slideshowId: savedSlideshow._id.toString(),
      //     });
      //   }
      // } catch (notifyError) {
      //   // Log and continue
      // }

      return res.status(200).json(populatedSlideshow);
    } catch (error: any) {
      if (error.name === "ValidationError") {
        return res
          .status(400)
          .json({ message: "Validation Error", errors: error.errors });
      }
      if (error.message === "Invalid slide indices for reordering.") {
        return res.status(400).json({ message: error.message });
      }
      return res
        .status(500)
        .json({ message: "Error updating slideshow", error: error.message });
    }
  }

  if (req.method === "DELETE") {
    // Delete a slideshow by ID
    let displayIdsToDeleteNotifications: string[] = [];
    try {
      const slideshow = await Slideshow.findOne({
        _id: id,
        creator_id: user._id,
      });
      if (!slideshow) {
        return res
          .status(404)
          .json({ message: "Slideshow not found or not authorized" });
      }

      // Get display IDs before deleting the slideshow
      try {
        displayIdsToDeleteNotifications = await getDisplayIdsForSlideshow(id);
      } catch (notifyError) {
        // Log and continue
      }

      await Slideshow.findByIdAndDelete(id);

      // Notify relevant displays after successful deletion (SSE logic to be migrated)
      // for (const displayId of displayIdsToDeleteNotifications) {
      //   sendEventToDisplay(displayId, "display_updated", {
      //     displayId,
      //     action: "update",
      //     reason: "slideshow_deleted",
      //     slideshowId: id,
      //   });
      // }

      return res
        .status(200)
        .json({ message: "Slideshow deleted successfully" });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error deleting slideshow", error: error.message });
    }
  }

  // Method not allowed
  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
