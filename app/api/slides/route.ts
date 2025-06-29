import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Slide, { SlideSchemaZod, SlideTypeZod } from "@/lib/models/Slide";
import {
  handleSlideInSlideshows,
  getDisplayIdsForSlide,
} from "@/lib/helpers/slide_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const slides = await Slide.find({ creator_id: user._id });
    return NextResponse.json(slides);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Error fetching slides.", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const body = await request.json();

    const {
      name,
      description,
      type,
      data,
      duration,
      is_enabled,
      slideshow_ids,
    } = body;

    // Validate required fields
    if (!name || !type || data === undefined) {
      return NextResponse.json(
        { message: "Slide name, type, and data are required." },
        { status: 400 }
      );
    }

    // Validate type
    const typeParse = SlideTypeZod.safeParse(type);
    if (!typeParse.success) {
      return NextResponse.json(
        { message: "Invalid slide type." },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          message: "Validation Error",
          errors: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

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

      // Notify relevant displays via SSE after adding to slideshows
      try {
        const displayIds = await getDisplayIdsForSlide(
          String(savedSlide._id)
        );
        for (const displayId of displayIds) {
          sendEventToDisplay(displayId, "display_updated", {
            displayId,
            action: "update",
            reason: "slide_added",
            slideId: String(savedSlide._id),
          });
        }
      } catch (notifyError) {
        console.error(
          `Error notifying displays after slide creation ${savedSlide._id}:`,
          notifyError
        );
      }
    }

    return NextResponse.json(savedSlide, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json(
        { message: "Validation Error", errors: (error as any).errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Error creating slide", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
