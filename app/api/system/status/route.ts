import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

interface SystemStatusResponse {
  database: {
    connected: boolean;
    responseTime?: number;
    error?: string;
  };
  server: {
    status: "online" | "offline";
    uptime?: number;
  };
  lastChecked: Date;
}

export async function GET(_request: NextRequest) {
  const _startTime = Date.now();

  try {
    // Check database connectivity
    let databaseStatus = {
      connected: false,
      responseTime: undefined as number | undefined,
      error: undefined as string | undefined,
    };

    try {
      // Attempt to connect to database
      await dbConnect();

      // Test database connection with a simple query
      const connectionState = mongoose.connection.readyState;

      if (connectionState === 1) {
        // 1 = connected
        // Perform a simple ping to test responsiveness
        const pingStart = Date.now();
        if (mongoose.connection.db) {
          await mongoose.connection.db.admin().ping();
        }
        const responseTime = Date.now() - pingStart;

        databaseStatus = {
          connected: true,
          responseTime,
          error: undefined,
        };
      } else {
        databaseStatus = {
          connected: false,
          responseTime: undefined,
          error: `Connection state: ${connectionState}`,
        };
      }
    } catch (dbError: any) {
      databaseStatus = {
        connected: false,
        responseTime: undefined,
        error: dbError.message || "Database connection failed",
      };
    }

    // Server status (always online if we can respond)
    const serverStatus = {
      status: "online" as const,
      uptime: process.uptime(), // Server uptime in seconds
    };

    const response: SystemStatusResponse = {
      database: databaseStatus,
      server: serverStatus,
      lastChecked: new Date(),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error: any) {
    console.error("System status check failed:", error);

    const errorResponse: SystemStatusResponse = {
      database: {
        connected: false,
        error: error.message || "Unknown error",
      },
      server: {
        status: "online", // Server is online if we can respond
        uptime: process.uptime(),
      },
      lastChecked: new Date(),
    };

    return NextResponse.json(errorResponse, {
      status: 200, // Return 200 even on errors so the client can handle the status
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }
}
