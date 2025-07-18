import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Slide, { SlideSchemaZod, SlideTypeZod, SlideType } from "@/lib/models/Slide";
import Slideshow from "@/lib/models/Slideshow";
import mongoose from "mongoose";
import { getHttpStatusFromError, getErrorMessage } from "@/types/error";
import {
  handleSlideInSlideshows,
  getDisplayIdsForSlide,
  deleteSlideAndCleanReferences,
} from "@/lib/helpers/slide_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import { requireAuth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

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
    const { id } = await context.params;

    // Handle both FormData (for file uploads) and JSON data
    let slideData: any = {};
    let slideshow_ids: string[] | undefined;
    let file: File | null = null;

    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('multipart/form-data')) {
      // Handle FormData from file uploads
      const formData = await request.formData();
      file = formData.get('slideFile') as File | null;
      
      // Extract fields from FormData
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const type = formData.get('type') as string;
      const duration = formData.get('duration') ? Number(formData.get('duration')) : undefined;
      const is_enabled = formData.get('is_enabled') === 'true';
      
      // Parse data field if it's JSON string
      const dataField = formData.get('data') as string;
      if (dataField) {
        try {
          slideData.data = JSON.parse(dataField);
        } catch {
          slideData.data = dataField; // Use as string if not valid JSON
        }
      }
      
      // Build slideData object
      if (name) slideData.name = name;
      if (description) slideData.description = description;
      if (type) slideData.type = type;
      if (duration !== undefined) slideData.duration = duration;
      if (is_enabled !== undefined) slideData.is_enabled = is_enabled;
      
      // Handle slideshow_ids if provided
      const slideshowIdField = formData.get('slideshow_ids') as string;
      if (slideshowIdField) {
        try {
          slideshow_ids = JSON.parse(slideshowIdField);
        } catch {
          slideshow_ids = [slideshowIdField]; // Treat as single ID if not array
        }
      }
    } else {
      // Handle JSON data (original behavior)
      const body = await request.json();
      const { slideshow_ids: bodySlideshow_ids, ...bodySlideData } = body;
      slideData = bodySlideData;
      slideshow_ids = bodySlideshow_ids;
    }

    // Validate type if present
    if (slideData.type && !SlideTypeZod.safeParse(slideData.type).success) {
      return NextResponse.json(
        { message: "Invalid slide type." },
        { status: 400 }
      );
    }

    // Handle file upload for photo slides
    if (slideData.type === SlideType.PHOTO && file) {
      try {
        // Create upload directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'slides');
        await mkdir(uploadDir, { recursive: true });
        
        // Generate unique filename
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const fileName = `${nanoid()}.${fileExtension}`;
        const filePath = path.join(uploadDir, fileName);
        
        // Save file
        const bytes = await file.arrayBuffer();
        await writeFile(filePath, new Uint8Array(bytes));
        
        // Set data to the file URL
        slideData.data = { url: `/uploads/slides/${fileName}` };
      } catch (error) {
        console.error('File upload error:', error);
        return NextResponse.json(
          { message: "Failed to upload file." },
          { status: 500 }
        );
      }
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
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { message: "Validation Error", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Error updating slide", error: getErrorMessage(error) },
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
