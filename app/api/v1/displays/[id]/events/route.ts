import { NextRequest } from "next/server";
import {
  addDisplayConnection,
  removeDisplayConnection,
} from "@/lib/sse_display_manager";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: displayId } = await context.params;

  if (!displayId || typeof displayId !== "string") {
    return new Response(JSON.stringify({ message: "Display ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Set headers for SSE
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the global store
      addDisplayConnection(displayId, controller);

      // Send initial connection event
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: connected\n`));
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            message: `SSE connected to display ${displayId}`,
            displayId,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );

      // Keep the connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (heartbeatError) {
          // Fixed: renamed error to heartbeatError to avoid shadowing
          clearInterval(heartbeat);
          removeDisplayConnection(displayId, controller);
        }
      }, 30000); // Send heartbeat every 30 seconds

      // Clean up on abort
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        removeDisplayConnection(displayId, controller);
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}
