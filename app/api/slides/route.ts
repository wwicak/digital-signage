import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Slide, { SlideSchemaZod, SlideTypeZod, SlideType } from "@/lib/models/Slide";
import mongoose from "mongoose";
import { getHttpStatusFromError, getErrorMessage } from "@/types/error";
import {
  handleSlideInSlideshows,
  getDisplayIdsForSlide,
} from "@/lib/helpers/slide_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import { requireAuth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

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
      { message: "Error fetching slides.", error: getErrorMessage(error) },
      { status: getHttpStatusFromError(error) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    
    // Handle FormData from file uploads
    const formData = await request.formData();
    const file = formData.get('slideFile') as File | null;
    
    // Extract other fields from FormData
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as string;
    const duration = formData.get('duration') ? Number(formData.get('duration')) : 10;
    const is_enabled = formData.get('is_enabled') === 'true';
    const slideshow_id = formData.get('slideshow_id') as string;
    
    // Parse data field if it's JSON string
    let data: any;
    const dataField = formData.get('data') as string;
    if (dataField) {
      try {
        data = JSON.parse(dataField);
      } catch {
        data = dataField; // Use as string if not valid JSON
      }
    }
    
    const slideshow_ids = slideshow_id ? [slideshow_id] : [];

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { message: "Slide name and type are required." },
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

    // Handle file upload for image/photo slides
    let finalData = data;
    if ((type === SlideType.PHOTO || type === SlideType.IMAGE) && file) {
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
        finalData = { url: `/uploads/slides/${fileName}` };
      } catch (error) {
        console.error('File upload error:', error);
        return NextResponse.json(
          { message: "Failed to upload file." },
          { status: 500 }
        );
      }
    }

    // For non-image/photo slides, ensure data is provided
    if (type !== SlideType.PHOTO && type !== SlideType.IMAGE && !finalData) {
      return NextResponse.json(
        { message: "Data is required for non-photo slides." },
        { status: 400 }
      );
    }

    // Validate data using SlideSchemaZod (discriminated union)
    const slideCandidate = {
      name,
      description,
      type,
      data: finalData,
      creator_id: new mongoose.Types.ObjectId(user._id),
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
      data: finalData,
      duration,
      is_enabled,
      creator_id: new mongoose.Types.ObjectId(user._id),
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
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { message: "Validation Error", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Error creating slide", error: getErrorMessage(error) },
      { status: getHttpStatusFromError(error) }
    );
  }
}
