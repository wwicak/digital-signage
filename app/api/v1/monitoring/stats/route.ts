import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Display from "@/lib/models/Display";
import DisplayHeartbeat from "@/lib/models/DisplayHeartbeat";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get total display count
    const totalDisplays = await Display.countDocuments();

    // Get displays with recent activity (last 5 minutes)
    const recentCutoff = new Date(Date.now() - 5 * 60 * 1000);
    const onlineDisplays = await Display.countDocuments({
      last_update: { $gte: recentCutoff },
    });

    const offlineDisplays = totalDisplays - onlineDisplays;

    // Get heartbeat stats for last hour
    const lastHourCutoff = new Date(Date.now() - 60 * 60 * 1000);
    const heartbeatsLastHour = await DisplayHeartbeat.countDocuments({
      timestamp: { $gte: lastHourCutoff },
    });

    // Calculate overall uptime percentage
    const uptimePercentage =
      totalDisplays > 0 ? (onlineDisplays / totalDisplays) * 100 : 100;

    // Simple alert count (displays offline for more than 10 minutes)
    const alertCutoff = new Date(Date.now() - 10 * 60 * 1000);
    const alertCount = await Display.countDocuments({
      last_update: { $lt: alertCutoff },
    });

    return NextResponse.json({
      displays: {
        total: totalDisplays,
        online: onlineDisplays,
        offline: offlineDisplays,
        uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      },
      alerts: {
        active: alertCount,
      },
      heartbeats: {
        lastHour: heartbeatsLastHour,
      },
      service: {
        isRunning: true,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Monitoring stats error:", error);
    return NextResponse.json({
      displays: {
        total: 0,
        online: 0,
        offline: 0,
        uptimePercentage: 100,
      },
      alerts: {
        active: 0,
      },
      heartbeats: {
        lastHour: 0,
      },
      service: {
        isRunning: false,
      },
      lastUpdated: new Date().toISOString(),
      error: error.message,
    });
  }
}
