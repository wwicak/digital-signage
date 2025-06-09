import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Display from "@/lib/models/Display";
import DisplayHeartbeat from "@/lib/models/DisplayHeartbeat";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const layoutId = searchParams.get("layoutId");

    // Build query for displays
    const query: any = {};
    if (layoutId) {
      query.layout = layoutId;
    }

    // Fetch displays
    const displays = await Display.find(query)
      .select({
        _id: 1,
        name: 1,
        layout: 1,
        last_update: 1,
        location: 1,
        building: 1,
      })
      .lean();

    // Get recent heartbeats for all displays
    const displayIds = displays.map((d) => d._id);
    const recentHeartbeats = await DisplayHeartbeat.aggregate([
      {
        $match: {
          displayId: { $in: displayIds },
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
        },
      },
      {
        $sort: { displayId: 1, timestamp: -1 },
      },
      {
        $group: {
          _id: "$displayId",
          lastHeartbeat: { $first: "$timestamp" },
          lastResponseTime: { $first: "$responseTime" },
          lastIpAddress: { $first: "$ipAddress" },
          connectionType: { $first: "$connectionType" },
          heartbeatCount: { $sum: 1 },
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
    ]);

    // Create heartbeat lookup map
    const heartbeatMap = new Map();
    recentHeartbeats.forEach((hb) => {
      heartbeatMap.set(hb._id.toString(), hb);
    });

    // Enhance displays with monitoring data
    const enhancedDisplays = displays.map((display) => {
      const heartbeatData = heartbeatMap.get(display._id.toString());
      const lastUpdate = display.last_update
        ? new Date(display.last_update)
        : null;
      const lastHeartbeat = heartbeatData?.lastHeartbeat
        ? new Date(heartbeatData.lastHeartbeat)
        : null;

      // Determine if display is online (heartbeat within last 2 minutes)
      const isOnline =
        lastHeartbeat && Date.now() - lastHeartbeat.getTime() < 2 * 60 * 1000;

      // Calculate uptime percentage (simplified)
      const uptimePercentage = heartbeatData?.heartbeatCount
        ? Math.min(100, (heartbeatData.heartbeatCount / 1440) * 100) // Assuming 1 heartbeat per minute ideal
        : 0;

      return {
        displayId: display._id,
        name: display.name || `Display ${display._id.toString().slice(-4)}`,
        layout: display.layout || "default",
        isOnline,
        lastSeen: lastUpdate,
        lastHeartbeat,
        clientCount: isOnline ? 1 : 0,
        consecutiveFailures: isOnline ? 0 : 1,
        responseTime: heartbeatData?.lastResponseTime,
        uptimePercentage,
        connectionType: heartbeatData?.connectionType || "sse",
        ipAddress: heartbeatData?.lastIpAddress || "Unknown",
        location: display.location || "Unknown Location",
        building: display.building || "Main Building",
        alertCount: 0, // Could be enhanced with actual alert system
      };
    });

    const onlineCount = enhancedDisplays.filter((d) => d.isOnline).length;
    const offlineCount = enhancedDisplays.length - onlineCount;

    return NextResponse.json({
      displays: enhancedDisplays,
      totalCount: enhancedDisplays.length,
      onlineCount,
      offlineCount,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Monitoring displays error:", error);
    return NextResponse.json({
      displays: [],
      totalCount: 0,
      onlineCount: 0,
      offlineCount: 0,
      lastUpdated: new Date().toISOString(),
      error: error.message,
    });
  }
}
