/**
 * @fileoverview Widget validation helper with proper type safety
 */

import { WidgetType, WidgetData } from "../models/Widget";
import Slideshow from "../models/Slideshow";
import mongoose from "mongoose";

// Type guards for each widget data type
function isAnnouncementData(data: WidgetData): data is { text: string; title?: string; [key: string]: unknown } {
  return 'text' in data;
}

function isCongratsData(data: WidgetData): data is { text: string; recipient?: string; [key: string]: unknown } {
  return 'text' in data;
}

function isImageData(data: WidgetData): data is { url: string | null; [key: string]: unknown } {
  return 'url' in data || data === null || data === undefined;
}

function isListData(data: WidgetData): data is { list: Array<{ text: string }>; title?: string | null; [key: string]: unknown } {
  return 'list' in data;
}

function isMediaPlayerData(data: WidgetData): data is { 
  url?: string | null;
  mediaType?: 'video' | 'audio';
  volume?: number;
  fit?: string;
  schedule?: {
    daysOfWeek?: number[];
    timeSlots?: Array<{ startTime: string; endTime: string }>;
  };
  [key: string]: unknown;
} {
  return typeof data === 'object' && data !== null;
}

function isMeetingRoomData(data: WidgetData): data is {
  buildingId?: string;
  refreshInterval?: number;
  showUpcoming?: boolean;
  maxReservations?: number;
  title?: string;
  [key: string]: unknown;
} {
  return typeof data === 'object' && data !== null;
}

function isSlideshowData(data: WidgetData): data is { slideshow_id?: string | null; [key: string]: unknown } {
  return typeof data === 'object' && data !== null;
}

function isWeatherData(data: WidgetData): data is { zip: string; unit?: 'metric' | 'imperial'; [key: string]: unknown } {
  return 'zip' in data;
}

function isWebData(data: WidgetData): data is { url: string; [key: string]: unknown } {
  return 'url' in data;
}

function isYoutubeData(data: WidgetData): data is { video_id: string; [key: string]: unknown } {
  return 'video_id' in data;
}

/**
 * Validates widget data based on its type with proper type safety
 */
export const validateWidgetData = async (
  type: WidgetType,
  data: WidgetData
): Promise<boolean> => {
  if (!data) {
    return true; // Some widgets might not require data
  }

  switch (type) {
    case WidgetType.ANNOUNCEMENT:
      if (!isAnnouncementData(data) || typeof data.text !== "string") {
        throw new Error("Invalid data for Announcement widget: text must be a string.");
      }
      if (data.title !== undefined && typeof data.title !== "string") {
        throw new Error("Invalid data for Announcement widget: title, if provided, must be a string.");
      }
      break;
      
    case WidgetType.CONGRATS:
      if (!isCongratsData(data) || typeof data.text !== "string") {
        throw new Error("Invalid data for Congrats widget: text must be a string.");
      }
      if (data.recipient !== undefined && typeof data.recipient !== "string") {
        throw new Error("Invalid data for Congrats widget: recipient, if provided, must be a string.");
      }
      break;
      
    case WidgetType.IMAGE:
      if (isImageData(data)) {
        if (data.url !== null && data.url !== undefined && typeof data.url !== "string") {
          throw new Error("Invalid data for Image widget: URL must be a string or null.");
        }
        if (data.url && typeof data.url === "string" && !data.url.match(/^https?:\/\/.+/)) {
          throw new Error("Invalid data for Image widget: URL must be a valid HTTP/HTTPS URL.");
        }
      }
      break;
      
    case WidgetType.LIST:
      if (!isListData(data)) {
        throw new Error("Invalid data for List widget: must contain list property.");
      }
      if (!Array.isArray(data.list) || !data.list.every(item => 
        typeof item === "object" && item !== null && 'text' in item && typeof item.text === "string"
      )) {
        throw new Error("Invalid data for List widget: list must be an array of objects with text property.");
      }
      if (data.title !== null && data.title !== undefined && typeof data.title !== "string") {
        throw new Error("Invalid data for List widget: title, if provided, must be a string or null.");
      }
      break;
      
    case WidgetType.MEDIA_PLAYER:
      if (isMediaPlayerData(data)) {
        if (data.url !== undefined && data.url !== null && typeof data.url !== "string") {
          throw new Error("Invalid data for Media Player widget: url, if provided, must be a string.");
        }
        if (data.mediaType !== undefined && !["video", "audio"].includes(data.mediaType)) {
          throw new Error('Invalid data for Media Player widget: mediaType must be "video" or "audio".');
        }
        if (data.volume !== undefined && (typeof data.volume !== "number" || data.volume < 0 || data.volume > 1)) {
          throw new Error("Invalid data for Media Player widget: volume must be a number between 0 and 1.");
        }
        if (data.fit !== undefined && !["contain", "cover", "fill"].includes(data.fit)) {
          throw new Error('Invalid data for Media Player widget: fit must be "contain", "cover", or "fill".');
        }
        if (data.schedule !== undefined) {
          if (data.schedule.daysOfWeek !== undefined) {
            if (!Array.isArray(data.schedule.daysOfWeek) || 
                !data.schedule.daysOfWeek.every(day => typeof day === "number" && day >= 0 && day <= 6)) {
              throw new Error("Invalid data for Media Player widget: schedule.daysOfWeek must be an array of numbers 0-6.");
            }
          }
          if (data.schedule.timeSlots !== undefined) {
            if (!Array.isArray(data.schedule.timeSlots) || 
                !data.schedule.timeSlots.every(slot => 
                  slot && typeof slot === 'object' &&
                  typeof slot.startTime === "string" && 
                  typeof slot.endTime === "string" &&
                  /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(slot.startTime) &&
                  /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(slot.endTime)
                )) {
              throw new Error("Invalid data for Media Player widget: schedule.timeSlots must be an array of objects with startTime and endTime in HH:MM format.");
            }
          }
        }
      }
      break;
      
    case WidgetType.MEETING_ROOM:
      if (isMeetingRoomData(data)) {
        if (data.buildingId !== undefined && typeof data.buildingId !== "string") {
          throw new Error("Invalid data for Meeting Room widget: buildingId, if provided, must be a string.");
        }
        if (data.refreshInterval !== undefined && typeof data.refreshInterval !== "number") {
          throw new Error("Invalid data for Meeting Room widget: refreshInterval, if provided, must be a number.");
        }
        if (data.showUpcoming !== undefined && typeof data.showUpcoming !== "boolean") {
          throw new Error("Invalid data for Meeting Room widget: showUpcoming, if provided, must be a boolean.");
        }
        if (data.maxReservations !== undefined && typeof data.maxReservations !== "number") {
          throw new Error("Invalid data for Meeting Room widget: maxReservations, if provided, must be a number.");
        }
        if (data.title !== undefined && typeof data.title !== "string") {
          throw new Error("Invalid data for Meeting Room widget: title, if provided, must be a string.");
        }
      }
      break;
      
    case WidgetType.SLIDESHOW:
      if (isSlideshowData(data) && data.slideshow_id !== null && data.slideshow_id !== undefined) {
        if (typeof data.slideshow_id !== "string" || !mongoose.Types.ObjectId.isValid(data.slideshow_id)) {
          throw new Error("Invalid data for Slideshow widget: slideshow_id must be a valid ObjectId string or null.");
        }
        const slideshowExists = await Slideshow.findById(data.slideshow_id);
        if (!slideshowExists) {
          throw new Error(`Slideshow with id ${data.slideshow_id} not found.`);
        }
      }
      break;
      
    case WidgetType.WEATHER:
      if (!isWeatherData(data) || typeof data.zip !== "string") {
        throw new Error("Invalid data for Weather widget: zip must be a string.");
      }
      if (data.unit && !["metric", "imperial"].includes(data.unit)) {
        throw new Error('Invalid data for Weather widget: unit must be "metric" or "imperial".');
      }
      break;
      
    case WidgetType.WEB:
      if (!isWebData(data) || typeof data.url !== "string" || !data.url.startsWith("http")) {
        throw new Error("Invalid data for Web widget: URL must be a valid web URL starting with http.");
      }
      break;
      
    case WidgetType.YOUTUBE:
      if (!isYoutubeData(data) || typeof data.video_id !== "string") {
        throw new Error("Invalid data for YouTube widget: video_id must be a string.");
      }
      break;
      
    case WidgetType.EMPTY:
      // Empty widgets typically have no data or minimal configuration
      break;
      
    default:
      console.warn(`Validation not implemented for widget type: ${type}`);
      return true;
  }
  
  return true;
}