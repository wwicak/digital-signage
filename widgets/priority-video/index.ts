import { ComponentType } from "react";
import { Zap } from "lucide-react";
import BaseWidget, { IWidgetDefinitionArgs } from "../base_widget";
import { PriorityVideoContent, PriorityVideoOptions } from "./src";

// Define the default data interface for the Priority Video widget
interface IPriorityVideoDefaultData {
  title?: string;
  url?: string;
  mediaType: "video" | "audio";
  backgroundColor: string;
  schedule: {
    daysOfWeek: number[];
    timeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  };
  volume: number;
  fallbackContent: {
    message: string;
    backgroundColor: string;
  };
  priority: number;
  playOnce: boolean;
}

// Define the widget definition arguments for the Priority Video widget
const priorityVideoDefinitionArgs: IWidgetDefinitionArgs = {
  name: "Priority Scheduled Video",
  type: "priority-video",
  version: "1.0.0",
  icon: Zap,
  defaultData: {
    title: "",
    url: "",
    mediaType: "video",
    backgroundColor: "#000000",
    schedule: {
      daysOfWeek: [],
      timeSlots: [{ startTime: "22:00", endTime: "22:05" }], // Default 10 PM to 10:05 PM
    },
    volume: 1,
    fallbackContent: {
      message: "Priority video is not scheduled",
      backgroundColor: "#000000",
    },
    priority: 100, // High priority
    playOnce: true, // Play only once per activation
  } as IPriorityVideoDefaultData,
  WidgetComponent: PriorityVideoContent as ComponentType<any>,
  OptionsComponent: PriorityVideoOptions as ComponentType<any>,
};

// Create and export the widget instance
const priorityVideoWidget = new BaseWidget(priorityVideoDefinitionArgs);

export default priorityVideoWidget;