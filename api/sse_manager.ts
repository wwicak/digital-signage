import { Response } from 'express';
import { sendSseEvent } from './helpers/common_helper';

export let sseClients: Record<string, Response[]> = {};

export function addClient(displayId: string, response: Response): void {
  if (!sseClients[displayId]) {
    sseClients[displayId] = [];
  }
  sseClients[displayId].push(response);
  console.log(`Client added for displayId: ${displayId}`);
}

export function removeClient(displayId: string, response: Response): void {
  if (sseClients[displayId]) {
    sseClients[displayId] = sseClients[displayId].filter(client => client !== response);
    if (sseClients[displayId].length === 0) {
      delete sseClients[displayId];
    }
  }
  console.log(`Client removed for displayId: ${displayId}`);
}

export function sendEventToDisplay(displayId: string, eventName: string, data: any): void {
  if (sseClients[displayId]) {
    console.log(`Sending event ${eventName} to ${sseClients[displayId].length} clients for displayId: ${displayId}`);
    sseClients[displayId].forEach(client => {
      sendSseEvent(client, eventName, data);
    });
  }
}
