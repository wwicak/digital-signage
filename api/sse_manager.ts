import { Response } from 'express';
import { sendSseEvent } from './helpers/common_helper';

export let sseClients: Record<string, Response[]> = {};

export function addClient(displayId: string, response: Response): void {
  if (!sseClients[displayId]) {
    sseClients[displayId] = [];
  }
  sseClients[displayId].push(response);
}

export function removeClient(displayId: string, response: Response): void {
  if (sseClients[displayId]) {
    sseClients[displayId] = sseClients[displayId].filter(client => client !== response);
    if (sseClients[displayId].length === 0) {
      delete sseClients[displayId];
    }
  }
}

export function sendEventToDisplay(displayId: string, eventName: string, data: any): void {
  if (sseClients[displayId]) {
    sseClients[displayId].forEach(client => {
      sendSseEvent(client, eventName, data);
    });
  }
}
