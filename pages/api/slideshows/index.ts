import type { NextApiRequest, NextApiResponse } from "next/types";
import dbConnect from "../../../lib/mongodb";
import Slideshow from "../../../api/models/Slideshow";
import { CreateSlideshowSchema } from "../../../api/schemas/slideshow";
import {
  validateSlidesExist,
  populateSlideshowSlides,
} from "../../../api/helpers/slideshow_helper";
// import { getServerSession } from "next-auth/next"; // Uncomment and configure as needed

// Placeholder for authentication/session check
async function getAuthenticatedUser(req: NextApiRequest) {
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
  let user;
  try {
    user = await getAuthenticatedUser(req);
  } catch (e) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  if (!user || !user._id) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (req.method === "GET") {
    // Get all slideshows for the user
    try {
      const slideshows = await Slideshow.find({
        creator_id: user._id,
      }).populate("slides");
      return res.status(200).json(slideshows);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error fetching slideshows.", error: error.message });
    }
  }

  if (req.method === "POST") {
    // Create a new slideshow
    const result = CreateSlideshowSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.formErrors.fieldErrors,
      });
    }

    const { name, description, slide_ids, is_enabled } = result.data;

    if (slide_ids && slide_ids.length > 0) {
      const validSlideIds = await validateSlidesExist(slide_ids);
      if (validSlideIds.length !== slide_ids.length) {
        return res.status(400).json({
          message:
            "One or more provided slide IDs are invalid or do not exist.",
        });
      }
    }

    const newSlideshowDoc = new Slideshow({
      name,
      description,
      slides: slide_ids || [],
      is_enabled,
      creator_id: user._id,
    });

    try {
      const savedSlideshow = await newSlideshowDoc.save();
      const populatedSlideshow = await populateSlideshowSlides(savedSlideshow);
      return res.status(201).json(populatedSlideshow);
    } catch (error: any) {
      if (error.name === "ValidationError") {
        return res
          .status(400)
          .json({ message: "Validation Error", errors: error.errors });
      }
      return res
        .status(500)
        .json({ message: "Error creating slideshow", error: error.message });
    }
  }

  // Method not allowed
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
