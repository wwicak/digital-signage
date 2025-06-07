//import type { NextApiRequest, NextApiResponse } from "next";
import { addClient, removeClient } from "../../../../api/sse_manager";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Set headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Send initial connection event
  res.write(`event: connected\n`);
  res.write(
    `data: ${JSON.stringify({ message: "Global display SSE connected" })}\n\n`
  );

  // Add client to global SSE manager
  const displayId = "global"; // This is for global events
  addClient(displayId, res);

  // Handle client disconnect
  req.on("close", () => {
    removeClient(displayId, res);
  });

  req.on("error", () => {
    removeClient(displayId, res);
  });
}
