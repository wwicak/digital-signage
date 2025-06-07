import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
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
      // Send initial connection event
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: connected\n`));
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            message: "Global display SSE connected",
          })}\n\n`
        )
      );

      // Keep the connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000); // Send heartbeat every 30 seconds

      // Clean up on abort
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}
