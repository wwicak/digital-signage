import { ComponentType } from 'react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from '../base_widget'
import CongratsContent from './src/CongratsContent'
import CongratsOptions from './src/CongratsOptions'
import { Gift } from 'lucide-react'

// Define the structure for the congrats widget's default data
export interface ICongratsDefaultData extends Record<string, unknown> {
  animation: string; // e.g., 'confetti', 'balloons'
  text: string;
  color: string; // Background color
  textColor: string;
  fontSize: number;
  recipient?: string; // Optional: name of person being congratulated
}

// Define the widget definition arguments for the Congrats widget
const congratsDefinitionArgs: IWidgetDefinitionArgs<Record<string, unknown>> = {
  name: 'Congratulations',
  type: 'congrats',
  version: '0.1',
  icon: Gift,
  defaultData: {
    animation: 'confetti',
    text: 'Congratulations!',
    color: '#34495e', // Wet Asphalt
    textColor: '#ffffff', // White
    fontSize: 16,
    recipient: '', // Default recipient to empty string
  } as Record<string, unknown>,
  WidgetComponent: CongratsContent as unknown as ComponentType<IWidgetContentProps<Record<string, unknown>>>,
  OptionsComponent: CongratsOptions as unknown as ComponentType<IWidgetOptionsEditorProps<Record<string, unknown>>>
}

class Congrats extends BaseWidget {
  constructor() {
    super(congratsDefinitionArgs)
  }
}

// Export an instance of the Congrats widget
const congratsWidget: IBaseWidget = new Congrats()
export default congratsWidget
