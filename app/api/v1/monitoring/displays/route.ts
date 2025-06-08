import { NextResponse } from "next/server";

export async function GET() {
  // Return basic display monitoring data - this is a stub implementation
  return NextResponse.json({
    displays: [],
    totalCount: 0,
    onlineCount: 0,
    offlineCount: 0,
    lastUpdated: new Date().toISOString(),
  });
}
