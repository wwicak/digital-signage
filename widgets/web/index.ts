import { ComponentType } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faGlobe } from "@fortawesome/free-solid-svg-icons"; // Import the specific icon

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs } from "../base_widget";
import WebContent from "./src/WebContent"; // Assuming .js for now
import WebOptions from "./src/WebOptions"; // Assuming .js for now

// Define the structure for the web widget's default data
export interface IWebDefaultData {
  title?: string | null; // Optional title for the web content frame
  url: string; // URL of the web page to display
  color?: string; // Optional background color if iframe transparency is handled
  refreshInterval?: number; // Optional: Interval in seconds to refresh the iframe
  scale?: number; // Optional: Scale factor for the iframe content (e.g., 0.8 for 80%)
  allowInteraction?: boolean; // Optional: allow user interaction with the iframe
}

// Define the widget definition arguments for the Web widget
const webDefinitionArgs: IWidgetDefinitionArgs = {
  name: "Web Page", // Changed name to be more descriptive
  type: "web", // Added 'type' field as it's required
  version: "0.1",
  icon: faGlobe as IconProp, // Use the imported icon
  defaultData: {
    title: null,
    url: "https://compsci.lafayette.edu/",
    color: "#FFFFFF", // Default background, though iframe usually covers this
    refreshInterval: 0, // 0 means no refresh
    scale: 1.0, // 100% scale
    allowInteraction: false, // Default to no interaction
  } as IWebDefaultData,
  WidgetComponent: WebContent as ComponentType<any>,
  OptionsComponent: WebOptions as ComponentType<any>,
};

// Renamed from Web to WebWidget for consistency
class WebWidget extends BaseWidget {
  constructor() {
    super(webDefinitionArgs);
  }

  // Widget and Options getters are inherited from BaseWidget
}

// Export an instance of the WebWidget, typed as IBaseWidget
const webWidget: IBaseWidget = new WebWidget();
export default webWidget;
