import type { NextApiRequest, NextApiResponse } from "next";
import { addClient, removeClient } from "../../../../../api/sse_manager";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id: displayId } = req.query;

  if (!displayId || typeof displayId !== "string") {
    return res.status(400).json({ message: "Display ID is required" });
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
    `data: ${JSON.stringify({
      message: `SSE connected to display ${displayId}`,
    })}\n\n`
  );

  // Add client to SSE manager for this specific display
  addClient(displayId, res);

  // Handle client disconnect
  req.on("close", () => {
    removeClient(displayId, res);
  });

  req.on("error", () => {
    removeClient(displayId, res);
  });
}
