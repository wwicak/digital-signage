import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { requireAuth } from "@/lib/auth";

// Force dynamic rendering to prevent static generation errors
export const dynamic = "force-dynamic";

// Allowed media MIME types
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov files
  "video/x-msvideo", // .avi files
];

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg", // .mp3 files
  "audio/wav",
  "audio/ogg",
  "audio/mp4", // .m4a files
  "audio/x-wav", // Alternative wav MIME type
];

const ALLOWED_MEDIA_TYPES = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES];

// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request);

    const formData = await request.formData();
    const file = formData.get("mediaFile") as File;

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          message: `Invalid file type. Allowed types: ${ALLOWED_MEDIA_TYPES.join(
            ", "
          )}`,
          allowedTypes: ALLOWED_MEDIA_TYPES,
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

    // Determine media type and subdirectory
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
    const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type);
    const mediaType = isVideo ? "video" : isAudio ? "audio" : "unknown";
    const subdirectory = isVideo ? "videos" : "audio";

    // Validate file content (basic check)
    const buffer = Buffer.from(await file.arrayBuffer());

    // Basic media validation - check for common media file signatures
    const isValidMedia = validateMediaBuffer(buffer, file.type);
    if (!isValidMedia) {
      return NextResponse.json(
        { message: "Invalid media file or corrupted data" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", subdirectory);
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
    const publicUrl = `/uploads/${subdirectory}/${filename}`;

    console.log(
      `Media uploaded successfully: ${filename} (${file.size} bytes) by user ${user._id}`
    );

    return NextResponse.json({
      url: publicUrl,
      filename: filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
      mediaType: mediaType,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user._id,
    });
  } catch (error: unknown) {
    console.error("Error in media upload:", error);

    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
    const errorStack = process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      {
        message: errorMessage,
        error: errorStack,
      },
      { status: 500 }
    );
  }
}

/**
 * Validate media buffer by checking file signatures
 */
function validateMediaBuffer(buffer: Buffer, mimeType: string): boolean {
  console.log(`Validating media buffer for MIME type: ${mimeType}`);
  console.log('Buffer (first 8 bytes):', buffer.slice(0, 8));
  if (buffer.length < 8) return false;

  // Check common media file signatures
  const signatures = {
    // Video signatures
    "video/mp4": [0x00, 0x00, 0x00, undefined, 0x66, 0x74, 0x79, 0x70], // ftyp box (size ignored)
    "video/webm": [0x1a, 0x45, 0xdf, 0xa3], // EBML header
    "video/quicktime": [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], // QuickTime
    "video/x-msvideo": [0x52, 0x49, 0x46, 0x46], // RIFF header for AVI

    // Audio signatures
    "audio/mpeg": [0xff, 0xfb], // MP3 frame header (can vary)
    "audio/wav": [0x52, 0x49, 0x46, 0x46], // RIFF header
    "audio/x-wav": [0x52, 0x49, 0x46, 0x46], // RIFF header
    "audio/ogg": [0x4f, 0x67, 0x67, 0x53], // OggS
    "audio/mp4": [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // M4A uses MP4 container
  };

  const signature = signatures[mimeType as keyof typeof signatures];
  if (!signature) {
    // For types without specific signatures, allow based on MIME type
    return true;
  }

  // Check if buffer starts with the expected signature
  for (let i = 0; i < signature.length && i < buffer.length; i++) {
    if (signature[i] !== undefined && buffer[i] !== signature[i]) {
      // For MP3, check alternative frame headers
      if (mimeType === "audio/mpeg") {
        return buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
      }
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
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
  };

  // If filename has a valid extension that matches the MIME type, use it
  if (filenameExt && mimeToExt[mimeType] === `.${filenameExt}`) {
    return `.${filenameExt}`;
  }

  // Otherwise, use extension based on MIME type
  return mimeToExt[mimeType] || ".mp4";
}
