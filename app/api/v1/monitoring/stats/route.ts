import { NextResponse } from "next/server";

export async function GET() {
  // Return basic monitoring stats - this is a stub implementation
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
      isRunning: true,
    },
    lastUpdated: new Date().toISOString(),
  });
}
