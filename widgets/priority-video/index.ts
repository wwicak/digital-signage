import { ComponentType } from "react";
import { Zap } from "lucide-react";
import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from "../base_widget";
import { PriorityVideoContent, PriorityVideoOptions } from "./src";

// Define the default data interface for the Priority Video widget
export interface IPriorityVideoDefaultData extends Record<string, unknown> {
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
const priorityVideoDefinitionArgs: IWidgetDefinitionArgs<IPriorityVideoDefaultData> = {
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
  },
  WidgetComponent: PriorityVideoContent as ComponentType<IWidgetContentProps<IPriorityVideoDefaultData>>,
  OptionsComponent: PriorityVideoOptions as ComponentType<IWidgetOptionsEditorProps<IPriorityVideoDefaultData>>,
};

// Create and export the widget instance
const priorityVideoWidget: IBaseWidget = new BaseWidget(priorityVideoDefinitionArgs);

export default priorityVideoWidget;