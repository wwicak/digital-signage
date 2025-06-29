import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { requireAuth } from "@/lib/auth";

// Force dynamic rendering to prevent static generation errors
export const dynamic = "force-dynamic";

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    const formData = await request.formData();
    const file = formData.get("slideFile") as File;

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          message: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(
            ", "
          )}`,
          allowedTypes: ALLOWED_IMAGE_TYPES,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          message: `File too large. Maximum size: ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
          maxSize: MAX_FILE_SIZE,
        },
        { status: 400 }
      );
    }

    // Validate file content (basic check)
    const buffer = Buffer.from(await file.arrayBuffer());

    // Basic image validation - check for common image file signatures
    const isValidImage = validateImageBuffer(buffer, file.type);
    if (!isValidImage) {
      return NextResponse.json(
        { message: "Invalid image file or corrupted data" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "images");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = getFileExtension(file.name, file.type);
    const filename = `${timestamp}_${randomString}${fileExtension}`;
    const filepath = join(uploadsDir, filename);

    // Write file to disk
    try {
      await writeFile(filepath, buffer);
    } catch (writeError) {
      console.error("Failed to write file:", writeError);
      return NextResponse.json(
        { message: "Failed to save uploaded file" },
        { status: 500 }
      );
    }

    // Return the public URL
    const publicUrl = `/uploads/images/${filename}`;

    console.log(
      `Image uploaded successfully: ${filename} (${file.size} bytes) by user ${user._id}`
    );

    return NextResponse.json({
      url: publicUrl,
      filename: filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user._id,
    });
  } catch (error: unknown) {
    console.error("Error in standalone upload:", error);

    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Failed to upload file",
        error: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Validate image buffer by checking file signatures
 */
function validateImageBuffer(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  // Check common image file signatures
  const signatures = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/gif": [0x47, 0x49, 0x46],
    "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP also has WEBP at offset 8)
    "image/bmp": [0x42, 0x4d],
    "image/tiff": [0x49, 0x49, 0x2a, 0x00], // Little endian TIFF
  };

  const signature = signatures[mimeType as keyof typeof signatures];
  if (!signature) {
    // For types without specific signatures (like SVG), allow if MIME type matches
    return mimeType === "image/svg+xml";
  }

  // Check if buffer starts with the expected signature
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Get appropriate file extension based on filename and MIME type
 */
function getFileExtension(filename: string, mimeType: string): string {
  // Try to get extension from filename first
  const filenameExt = filename.split(".").pop()?.toLowerCase();

  // Map of MIME types to extensions
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
  };

  // If filename has a valid extension that matches the MIME type, use it
  if (filenameExt && mimeToExt[mimeType] === `.${filenameExt}`) {
    return `.${filenameExt}`;
  }

  // Otherwise, use extension based on MIME type
  return mimeToExt[mimeType] || ".jpg";
}
