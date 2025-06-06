import { NextApiRequest, NextApiResponse } from 'next';
import { addClient, removeClient, sendEventToDisplay } from '../../../../../api/sse_manager'; // Adjusted path
// Note: sendSseEvent from common_helper was used in original for the 'connected' message.
// We can replicate that or use sendEventToDisplay if it's general enough.
// For clarity, let's define a simple send function here or import the original one.

// Basic function to send an SSE event directly on this response
const sendSseMessage = (res: NextApiResponse, type: string, data: any) => {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { displayId } = req.query;

  if (req.method !== 'GET' || !displayId || typeof displayId !== 'string') {
    res.status(405).json({ message: 'Method Not Allowed or Display ID missing' });
    return;
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Flush the headers to establish the connection

  // Add this client (response object) to the SSE manager
  addClient(displayId, res);

  // Send a connected event (or a simple confirmation)
  sendSseMessage(res, 'connected', { message: 'SSE connection established for display ' + displayId });
  // Or using the imported sendEventToDisplay if it's suitable:
  // sendEventToDisplay(displayId, 'connected', { message: 'SSE connection established' });
  // The original used a generic sendSseEvent(res, type, data), so sendSseMessage here is closer.

  // Handle client disconnection
  req.on('close', () => {
    removeClient(displayId, res);
    console.log(`SSE client disconnected for display: ${displayId}`);
    res.end(); // Ensure response is ended when client closes connection
  });

  // Note: In a serverless environment, the res object might not be kept alive indefinitely
  // or shared across invocations. This setup is best suited for a traditional Node.js server.
  // For serverless, a pub/sub mechanism (e.g., Redis, Google Pub/Sub, Ably, Pusher)
  // would be more robust for broadcasting SSE events.
}
