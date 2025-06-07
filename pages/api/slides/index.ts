// Next.js API route for /api/slides (GET all, POST create)
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import Slide, { SlideSchemaZod, SlideTypeZod } from "../../../api/models/Slide";
import { handleSlideInSlideshows } from "../../../api/helpers/slide_helper";

// Placeholder for authentication/session check
async function getAuthenticatedUser(req: any): Promise<any> {
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

export default async function handler(req: any, res: any) {
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
    // Get all slides for the logged-in user
    try {
      const slides = await Slide.find({ creator_id: user._id });
      return res.status(200).json(slides);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error fetching slides.", error: error.message });
    }
  }

  if (req.method === "POST") {
    // Create a new slide
    const {
      name,
      description,
      type,
      data,
      duration,
      is_enabled,
      slideshow_ids,
    } = req.body;

    // Validate required fields
    if (!name || !type || data === undefined) {
      return res
        .status(400)
        .json({ message: "Slide name, type, and data are required." });
    }

    // Validate type
    const typeParse = SlideTypeZod.safeParse(type);
    if (!typeParse.success) {
      return res.status(400).json({ message: "Invalid slide type." });
    }

    // Validate data using SlideSchemaZod (discriminated union)
    const slideCandidate = {
      name,
      description,
      type,
      data,
      creator_id: user._id,
      duration,
      is_enabled,
    };
    const parseResult = SlideSchemaZod.safeParse(slideCandidate);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation Error",
        errors: parseResult.error.flatten(),
      });
    }

    try {
      const newSlideDoc = new Slide({
        name,
        description,
        type,
        data,
        duration,
        is_enabled,
        creator_id: user._id,
      });
      const savedSlide = await newSlideDoc.save();
      if (
        slideshow_ids &&
        Array.isArray(slideshow_ids) &&
        slideshow_ids.length > 0
      ) {
        await handleSlideInSlideshows(savedSlide, slideshow_ids, []);
      }
      return res.status(201).json(savedSlide);
    } catch (error: any) {
      if (error.name === "ValidationError") {
        return res
          .status(400)
          .json({ message: "Validation Error", errors: error.errors });
      }
      return res
        .status(500)
        .json({ message: "Error creating slide", error: error.message });
    }
  }

  // Method not allowed
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
