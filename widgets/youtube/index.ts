import { ComponentType } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faYoutube } from "@fortawesome/free-brands-svg-icons"; // Import the specific icon

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs } from "../base_widget";
import YoutubeContent from "./src/YoutubeContent"; // Assuming .js for now
import YoutubeOptions from "./src/YoutubeOptions"; // Assuming .js for now

// Define the structure for the YouTube widget's default data
export interface IYoutubeDefaultData {
  video_id: string | null; // YouTube Video ID (e.g., 9xwazD5SyVg)
  autoplay?: boolean;
  loop?: boolean;
  show_controls?: boolean;
  start_time?: number; // Start time in seconds
  end_time?: number; // End time in seconds
  show_captions?: boolean; // Show closed captions by default
  // 'title' and 'color' from original JS defaultData are less relevant for YouTube embeds.
  // If a frame title or background color for non-video area is needed, they can be added.
}

// Define the widget definition arguments for the YouTube widget
const youtubeDefinitionArgs: IWidgetDefinitionArgs = {
  name: "YouTube Video", // More descriptive name
  type: "youtube", // Added 'type' field as it's required
  version: "0.1",
  icon: faYoutube as IconProp, // Use the imported icon
  defaultData: {
    video_id: "9xwazD5SyVg", // Example video ID
    autoplay: true,
    loop: false,
    show_controls: true,
    start_time: 0,
    end_time: 0, // 0 typically means play to end
    show_captions: false,
  } as IYoutubeDefaultData,
  WidgetComponent: YoutubeContent as ComponentType<any>,
  OptionsComponent: YoutubeOptions as ComponentType<any>,
};

// Renamed from Web (in original JS) to YoutubeWidget
class YoutubeWidget extends BaseWidget {
  constructor() {
    super(youtubeDefinitionArgs);
  }

  // Widget and Options getters are inherited from BaseWidget
}

// Export an instance of the YoutubeWidget, typed as IBaseWidget
const youtubeWidget: IBaseWidget = new YoutubeWidget();
export default youtubeWidget;
