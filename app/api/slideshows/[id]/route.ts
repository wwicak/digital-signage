import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getHttpStatusFromError, getErrorMessage } from "@/types/error";
import dbConnect from "@/lib/mongodb";
import Slideshow from "@/lib/models/Slideshow";
import { UpdateSlideshowSchema } from "@/lib/schemas/slideshow";
import {
  validateSlidesExist,
  reorderSlidesInSlideshow,
  populateSlideshowSlides,
  getDisplayIdsForSlideshow,
} from "@/lib/helpers/slideshow_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    // const user = await requireAuth(request);
    const { id } = await context.params;

    const slideshow = await Slideshow.findOne({
      _id: id,
    }).populate("slides");

    if (!slideshow) {
      return NextResponse.json(
        { message: "Slideshow not found or not authorized." },
        { status: 404 }
      );
    }

    return NextResponse.json(slideshow);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Error fetching slideshow.", error: error instanceof Error ? error.message : "Unknown error" },
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

    const result = UpdateSlideshowSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: result.error.formErrors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { slide_ids, oldIndex, newIndex, ...slideshowData } = result.data;

    const slideshowToUpdate = await Slideshow.findOne({
      _id: id,
      creator_id: user._id,
    });

    if (!slideshowToUpdate) {
      return NextResponse.json(
        { message: "Slideshow not found or not authorized" },
        { status: 404 }
      );
    }

    if (typeof oldIndex === "number" && typeof newIndex === "number") {
      await reorderSlidesInSlideshow(slideshowToUpdate, oldIndex, newIndex);
    }

    Object.assign(slideshowToUpdate, slideshowData);
    if (slide_ids) {
      if (slide_ids.length > 0) {
        const validSlideIds = await validateSlidesExist(slide_ids);
        if (validSlideIds.length !== slide_ids.length) {
          return NextResponse.json(
            {
              message:
                "One or more provided slide IDs are invalid or do not exist.",
            },
            { status: 400 }
          );
        }
      }
      slideshowToUpdate.slides = slide_ids.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }

    const savedSlideshow = await slideshowToUpdate.save();
    const populatedSlideshow = await populateSlideshowSlides(savedSlideshow);

    // Notify relevant displays via SSE
    try {
      const displayIds = await getDisplayIdsForSlideshow(
        String(savedSlideshow._id)
      );
      for (const displayId of displayIds) {
        sendEventToDisplay(displayId, "display_updated", {
          displayId,
          action: "update",
          reason: "slideshow_change",
          slideshowId: String(savedSlideshow._id),
        });
      }
    } catch (notifyError) {
      console.error(
        `Error notifying displays after slideshow update ${id}:`,
        notifyError
      );
    }

    return NextResponse.json(populatedSlideshow);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { message: "Validation Error", errors: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "Invalid slide indices for reordering.") {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Error updating slideshow", error: getErrorMessage(error) },
      { status: getHttpStatusFromError(error) }
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

    let displayIdsToDeleteNotifications: string[] = [];

    const slideshow = await Slideshow.findOne({
      _id: id,
      creator_id: user._id,
    });

    if (!slideshow) {
      return NextResponse.json(
        { message: "Slideshow not found or not authorized" },
        { status: 404 }
      );
    }

    // Get display IDs before deleting the slideshow
    try {
      displayIdsToDeleteNotifications = await getDisplayIdsForSlideshow(id);
    } catch (notifyError) {
      console.error(
        `Error getting display IDs for slideshow ${id}:`,
        notifyError
      );
    }

    await Slideshow.findByIdAndDelete(id);

    // Notify relevant displays after successful deletion
    try {
      for (const displayId of displayIdsToDeleteNotifications) {
        sendEventToDisplay(displayId, "display_updated", {
          displayId,
          action: "update",
          reason: "slideshow_deleted",
          slideshowId: id,
        });
      }
    } catch (notifyError) {
      console.error(
        `Error notifying displays after slideshow deletion ${id}:`,
        notifyError
      );
    }

    return NextResponse.json({ message: "Slideshow deleted successfully" });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Error deleting slideshow", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
