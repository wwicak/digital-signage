import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Slideshow from "@/lib/models/Slideshow";
import mongoose from "mongoose";
import { getHttpStatusFromError, getErrorMessage } from "@/types/error";
import { CreateSlideshowSchema } from "@/lib/schemas/slideshow";
import {
  validateSlidesExist,
  populateSlideshowSlides,
} from "@/lib/helpers/slideshow_helper";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    const slideshows = await Slideshow.find({
      creator_id: user._id,
    }).populate("slides");

    return NextResponse.json(slideshows);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Error fetching slideshows.", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const body = await request.json();

    const result = CreateSlideshowSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: result.error.formErrors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, description, slide_ids, is_enabled } = result.data;

    if (slide_ids && slide_ids.length > 0) {
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

    const newSlideshowDoc = new Slideshow({
      name,
      description,
      slides: slide_ids || [],
      is_enabled,
      creator_id: user._id,
    });

    const savedSlideshow = await newSlideshowDoc.save();
    const populatedSlideshow = await populateSlideshowSlides(savedSlideshow);

    return NextResponse.json(populatedSlideshow, { status: 201 });
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
    return NextResponse.json(
      { message: "Error creating slideshow", error: getErrorMessage(error) },
      { status: getHttpStatusFromError(error) }
    );
  }
}
