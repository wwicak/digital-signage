import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Slide, { SlideSchemaZod, SlideTypeZod } from "@/lib/models/Slide";
import Slideshow from "@/lib/models/Slideshow";
import {
  handleSlideInSlideshows,
  getDisplayIdsForSlide,
  deleteSlideAndCleanReferences,
} from "@/lib/helpers/slide_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import { requireAuth } from "@/lib/helpers/auth_helper";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    const slide = await Slide.findOne({
      _id: params.id,
      creator_id: user._id,
    });

    if (!slide) {
      return NextResponse.json(
        { message: "Slide not found or not authorized." },
        { status: 404 }
      );
    }

    return NextResponse.json(slide);
  } catch (error: any) {
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Error fetching slide.", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const body = await request.json();

    const { slideshow_ids, ...slideData } = body;

    // Validate type if present
    if (slideData.type && !SlideTypeZod.safeParse(slideData.type).success) {
      return NextResponse.json(
        { message: "Invalid slide type." },
        { status: 400 }
      );
    }

    const slideToUpdate = await Slide.findOne({
      _id: params.id,
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
      originalSlideshowIds = slideshowsContainingSlide.map((s: any) =>
        s._id.toString()
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
        `Error notifying displays after slide update ${params.id}:`,
        notifyError
      );
    }

    return NextResponse.json(savedSlide);
  } catch (error: any) {
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { message: "Validation Error", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Error updating slide", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    const slide = await Slide.findOne({
      _id: params.id,
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
      displayIds = await getDisplayIdsForSlide(params.id);
    } catch (notifyError) {
      console.error(
        `Error getting display IDs for slide ${params.id}:`,
        notifyError
      );
    }

    const deletedSlide = await deleteSlideAndCleanReferences(params.id);

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
          slideId: params.id,
        });
      }
    } catch (notifyError) {
      console.error(
        `Error notifying displays after slide deletion ${params.id}:`,
        notifyError
      );
    }

    return NextResponse.json({ message: "Slide deleted successfully" });
  } catch (error: any) {
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Error deleting slide", error: error.message },
      { status: 500 }
    );
  }
}
