import { ComponentType } from "react";

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from "../base_widget";
import WebContent from "./src/WebContent";
import WebOptions from "./src/WebOptions";
import { Globe } from "lucide-react";

// Define the structure for the web widget's default data
export interface IWebDefaultData extends Record<string, unknown> {
  title?: string | null; // Optional title for the web content frame
  url: string; // URL of the web page to display
  color?: string; // Optional background color if iframe transparency is handled
  refreshInterval?: number; // Optional: Interval in seconds to refresh the iframe
  scale?: number; // Optional: Scale factor for the iframe content (e.g., 0.8 for 80%)
  allowInteraction?: boolean; // Optional: allow user interaction with the iframe
  useProxy?: boolean; // Optional: use proxy for X-Frame-Options blocked sites
  showErrorMessage?: boolean; // Optional: show user-friendly error messages
}

// Define the widget definition arguments for the Web widget
const webDefinitionArgs: IWidgetDefinitionArgs<Record<string, unknown>> = {
  name: "Web Page", // Changed name to be more descriptive
  type: "web",
  version: "0.1",
  icon: Globe,
  defaultData: {
    title: null,
    url: "https://www.plnindonesiapower.co.id/",
    color: "#FFFFFF", // Default background, though iframe usually covers this
    refreshInterval: 0, // 0 means no refresh
    scale: 1.0, // 100% scale
    allowInteraction: false, // Default to no interaction
    useProxy: false, // Default to direct loading
    showErrorMessage: true, // Default to showing error messages
  } as Record<string, unknown>,
  WidgetComponent: WebContent as unknown as ComponentType<IWidgetContentProps<Record<string, unknown>>>,
  OptionsComponent: WebOptions as unknown as ComponentType<IWidgetOptionsEditorProps<Record<string, unknown>>>,
};

// Renamed from Web to WebWidget for consistency
class WebWidget extends BaseWidget {
  constructor() {
    super(webDefinitionArgs);
  }
}

// Export an instance of the WebWidget
const webWidget: IBaseWidget = new WebWidget();
export default webWidget;
