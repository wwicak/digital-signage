import { ComponentType } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faGifts } from "@fortawesome/free-solid-svg-icons"; // Import the specific icon

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs } from "../base_widget";
import CongratsContent from "./src/CongratsContent"; // Assuming .js for now
import CongratsOptions from "./src/CongratsOptions"; // Assuming .js for now

// Define the structure for the congrats widget's default data
interface ICongratsDefaultData {
  animation: string; // e.g., 'confetti', 'balloons'
  text: string;
  color: string; // Background color
  textColor: string;
  fontSize: number;
  recipient?: string; // Optional: name of person being congratulated
}

// Define the widget definition arguments for the Congrats widget
const congratsDefinitionArgs: IWidgetDefinitionArgs = {
  name: "Congratulations",
  type: "congrats", // Added 'type' field as it's required
  version: "0.1",
  icon: faGifts as IconProp, // Use the imported icon
  defaultData: {
    animation: "confetti",
    text: "Congratulations!",
    color: "#34495e", // Wet Asphalt
    textColor: "#ffffff", // White
    fontSize: 16,
    recipient: "", // Default recipient to empty string
  } as ICongratsDefaultData,
  WidgetComponent: CongratsContent as ComponentType<any>, // Cast as ComponentType<any> for now
  OptionsComponent: CongratsOptions as ComponentType<any>, // Cast as ComponentType<any> for now
};

class Congrats extends BaseWidget {
  constructor() {
    super(congratsDefinitionArgs);
  }

  // Widget and Options getters are inherited from BaseWidget
  // and will use WidgetComponent and OptionsComponent from definitionArgs
}

// Export an instance of the Congrats widget, typed as IBaseWidget
const congratsWidget: IBaseWidget = new Congrats();
export default congratsWidget;
