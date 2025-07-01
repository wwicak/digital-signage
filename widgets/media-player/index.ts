import { ComponentType } from "react";
import { Play } from "lucide-react";
import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from "../base_widget";
import { MediaPlayerContent, MediaPlayerOptions } from "./src";

// Define the default data interface for the Media Player widget
export interface IMediaPlayerDefaultData extends Record<string, unknown> {
  title?: string;
  url?: string;
  mediaType: "video" | "audio";
  backgroundColor: string;
  autoplay: boolean;
  loop: boolean;
  volume: number;
  muted: boolean;
  showControls: boolean;
  fit: "contain" | "cover" | "fill";
  enableScheduling: boolean;
  schedule: {
    daysOfWeek: number[];
    timeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  };
  fallbackContent: {
    message: string;
    backgroundColor: string;
  };
}

// Define the widget definition arguments for the Media Player widget
const mediaPlayerDefinitionArgs: IWidgetDefinitionArgs<Record<string, unknown>> = {
  name: "Media Player",
  type: "media-player",
  version: "1.0.0",
  icon: Play,
  defaultData: {
    mediaType: "video",
    backgroundColor: "#000000",
    autoplay: false,
    loop: false,
    volume: 1,
    muted: false,
    showControls: true,
    fit: "contain",
    enableScheduling: false,
    schedule: {
      daysOfWeek: [],
      timeSlots: [{ startTime: "09:00", endTime: "17:00" }],
    },
    fallbackContent: {
      message: "Media content is not available",
      backgroundColor: "#000000",
    },
  } as Record<string, unknown>,
  WidgetComponent: MediaPlayerContent as unknown as ComponentType<IWidgetContentProps<Record<string, unknown>>>,
  OptionsComponent: MediaPlayerOptions as unknown as ComponentType<IWidgetOptionsEditorProps<Record<string, unknown>>>,
};

// Create and export the widget instance
const mediaPlayerWidget: IBaseWidget = new BaseWidget(mediaPlayerDefinitionArgs);

export default mediaPlayerWidget;
