import { IBaseWidget } from "./base_widget";

// Export the interface for compatibility
export type IWidgetDefinition = IBaseWidget;

/*
 * Import all widget instances
 * TypeScript will resolve these to the respective index.ts files in each directory
 */
import announcementWidget from "./announcement";
import congratsWidget from "./congrats";
import imageWidget from "./image";
import listWidget from "./list";
import mediaPlayerWidget from "./media-player";
import meetingRoomWidget from "./meeting-room";
import priorityVideoWidget from "./priority-video";
import slideshowWidget from "./slideshow";
import weatherWidget from "./weather";
import webWidget from "./web";
import youtubeWidget from "./youtube";
// Import other widget instances here as they are created/migrated

// Define the structure of the exported widgets collection
const widgets: Record<string, IBaseWidget> = {
  [announcementWidget.type]: announcementWidget,
  [congratsWidget.type]: congratsWidget,
  [imageWidget.type]: imageWidget,
  [listWidget.type]: listWidget,
  [mediaPlayerWidget.type]: mediaPlayerWidget,
  [meetingRoomWidget.type]: meetingRoomWidget,
  [priorityVideoWidget.type]: priorityVideoWidget,
  [slideshowWidget.type]: slideshowWidget,
  [weatherWidget.type]: weatherWidget,
  [webWidget.type]: webWidget,
  [youtubeWidget.type]: youtubeWidget,
  // Add other widgets here, using their 'type' property as the key
};

/*
 * Optional: For verifying all types from widget_list.ts are covered,
 * you could import widgetTypes and iterate, but static assignment is safer for typing.
 * import widgetTypes from './widget_list';
 * for (const type of widgetTypes) {
 *   if (!widgets[type]) {
 *     console.warn(`Widget type "${type}" from widget_list.ts is not registered in widgets/index.ts`);
 *   }
 * }
 */

export default widgets;
