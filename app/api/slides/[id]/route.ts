import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Slide, { SlideSchemaZod, SlideTypeZod } from "@/lib/models/Slide";
import Slideshow from "@/lib/models/Slideshow";
import { Error as MongooseError } from "mongoose";
import {
  handleSlideInSlideshows,
  getDisplayIdsForSlide,
  deleteSlideAndCleanReferences,
} from "@/lib/helpers/slide_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const { id } = await context.params;

    const slide = await Slide.findOne({
      _id: id,
      creator_id: user._id,
    });

    if (!slide) {
      return NextResponse.json(
        { message: "Slide not found or not authorized." },
        { status: 404 }
      );
    }

    return NextResponse.json(slide);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Error fetching slide.", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const body = await request.json();
    const { id } = await context.params;

    const { slideshow_ids, ...slideData } = body;

    // Validate type if present
    if (slideData.type && !SlideTypeZod.safeParse(slideData.type).success) {
      return NextResponse.json(
        { message: "Invalid slide type." },
        { status: 400 }
      );
    }

    const slideToUpdate = await Slide.findOne({
      _id: id,
      creator_id: user._id,
    });

    if (!slideToUpdate) {
      return NextResponse.json(
        { message: "Slide not found or not authorized" },
        { status: 404 }
      );
    }

    let originalSlideshowIds: string[] = [];
    if (slideshow_ids !== undefined) {
      const slideshowsContainingSlide = await Slideshow.find({
        slides: slideToUpdate._id,
      }).select("_id");
      originalSlideshowIds = slideshowsContainingSlide.map((s) =>
        String(s._id)
      );
    }

    Object.assign(slideToUpdate, slideData);

    // Validate updated slide
    const parseResult = SlideSchemaZod.safeParse(slideToUpdate.toObject());
    if (!parseResult.success) {
      return NextResponse.json(
        {
          message: "Validation Error",
          errors: parseResult.error.flatten(),
        },
        { status: 400 }
      );
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
        String(savedSlide._id)
      );
      for (const displayId of displayIds) {
        sendEventToDisplay(displayId, "display_updated", {
          displayId,
          action: "update",
          reason: "slide_change",
          slideId: String(savedSlide._id),
        });
      }
    } catch (notifyError) {
      // Log error but don't let it fail the main operation
      console.error(
        `Error notifying displays after slide update ${id}:`,
        notifyError
      );
    }

    return NextResponse.json(savedSlide);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    if (error instanceof MongooseError.ValidationError) {
      return NextResponse.json(
        { message: "Validation Error", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Error updating slide", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const { id } = await context.params;

    const slide = await Slide.findOne({
      _id: id,
      creator_id: user._id,
    });

    if (!slide) {
      return NextResponse.json(
        { message: "Slide not found or not authorized" },
        { status: 404 }
      );
    }

    // Get display IDs before deleting the slide
    let displayIds: string[] = [];
    try {
      displayIds = await getDisplayIdsForSlide(id);
    } catch (notifyError) {
      console.error(`Error getting display IDs for slide ${id}:`, notifyError);
    }

    const deletedSlide = await deleteSlideAndCleanReferences(id);

    if (!deletedSlide) {
      return NextResponse.json(
        { message: "Slide not found during deletion process." },
        { status: 404 }
      );
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

    return NextResponse.json({ message: "Slide deleted successfully" });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Error deleting slide", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
