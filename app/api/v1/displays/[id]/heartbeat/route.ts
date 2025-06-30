import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import DisplayHeartbeat from "@/lib/models/DisplayHeartbeat";
import Display from "@/lib/models/Display";
import { z } from "zod";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Request body schema
const HeartbeatRequestSchema = z.object({
  timestamp: z.string(),
  clientInfo: z
    .object({
      screenResolution: z.string().optional(),
      browserVersion: z.string().optional(),
      platform: z.string().optional(),
      memoryUsage: z.number().optional(),
      cpuUsage: z.number().optional(),
      networkType: z.string().optional(),
      connectionQuality: z
        .enum(["excellent", "good", "fair", "poor"])
        .optional(),
      ipAddress: z.string().optional(),
    })
    .optional(),
  performanceMetrics: z
    .object({
      renderTime: z.number().optional(),
      loadTime: z.number().optional(),
      errorCount: z.number().optional(),
    })
    .optional(),
  disconnect: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id: displayId } = await params;
    if (!displayId) {
      return NextResponse.json(
        { error: "Display ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = HeartbeatRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { timestamp, clientInfo, performanceMetrics, disconnect } =
      validation.data;

    // Get client IP address from request headers
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const clientIP =
      forwardedFor?.split(",")[0] ||
      realIP ||
      clientInfo?.ipAddress ||
      "unknown";

    // Get user agent
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Check if display exists
    const display = await Display.findById(displayId);
    if (!display) {
      return NextResponse.json({ error: "Display not found" }, { status: 404 });
    }

    // Handle disconnect signal
    if (disconnect) {
      // Record final heartbeat with disconnect flag
      await DisplayHeartbeat.create({
        displayId,
        timestamp: new Date(timestamp),
        responseTime: 0,
        ipAddress: clientIP,
        userAgent,
        connectionType: "sse",
        clientInfo: {
          ...clientInfo,
          disconnected: true,
        },
        serverInfo: {
          serverTime: new Date(),
          processingTime: 0,
          activeConnections: 0,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Disconnect recorded",
      });
    }

    // Calculate response time
    const requestTime = new Date(timestamp);
    const serverTime = new Date();
    const responseTime = serverTime.getTime() - requestTime.getTime();

    // Record heartbeat
    const heartbeat = await DisplayHeartbeat.create({
      displayId,
      timestamp: requestTime,
      responseTime: Math.max(0, responseTime), // Ensure non-negative
      ipAddress: clientIP,
      userAgent,
      connectionType: "sse",
      clientInfo: {
        screenResolution: clientInfo?.screenResolution,
        browserVersion: clientInfo?.browserVersion,
        platform: clientInfo?.platform,
        memoryUsage: clientInfo?.memoryUsage,
        cpuUsage: clientInfo?.cpuUsage,
        networkType: clientInfo?.networkType,
        // Include performance metrics for monitoring and diagnostics
        performanceMetrics: performanceMetrics ? {
          loadTime: performanceMetrics.loadTime,
          renderTime: performanceMetrics.renderTime,
          memoryHeapUsed: performanceMetrics.memoryHeapUsed,
          networkLatency: performanceMetrics.networkLatency,
        } : undefined,
      },
      serverInfo: {
        serverTime,
        processingTime: responseTime,
        activeConnections: 1, // This would be calculated from active SSE connections
      },
    });

    // Update display's last seen timestamp
    await Display.findByIdAndUpdate(displayId, {
      last_update: serverTime,
    });

    return NextResponse.json({
      success: true,
      heartbeatId: heartbeat._id,
      serverTime: serverTime.toISOString(),
      responseTime,
      clientIP,
    });
  } catch (error: unknown) {
    console.error("Heartbeat error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id: displayId } = await params;
    if (!displayId) {
      return NextResponse.json(
        { error: "Display ID is required" },
        { status: 400 }
      );
    }

    // Get recent heartbeats for this display
    const recentHeartbeats = await DisplayHeartbeat.find({
      displayId,
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Get heartbeat statistics
    const stats = await DisplayHeartbeat.getHeartbeatStats(displayId, 24);

    // Calculate if display is currently online (heartbeat within last 2 minutes)
    const lastHeartbeat = recentHeartbeats[0];
    const isOnline =
      lastHeartbeat &&
      Date.now() - new Date(lastHeartbeat.timestamp).getTime() < 2 * 60 * 1000;

    return NextResponse.json({
      displayId,
      isOnline,
      lastHeartbeat: lastHeartbeat?.timestamp,
      recentHeartbeats,
      stats,
    });
  } catch (error: unknown) {
    console.error("Get heartbeat error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
