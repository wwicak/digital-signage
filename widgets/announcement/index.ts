import { ComponentType } from 'react'
import { AlertTriangle } from 'lucide-react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from '../base_widget'
import AnnouncementContent from './src/AnnouncementContent'
import AnnouncementOptions from './src/AnnouncementOptions'

// Define the structure for the announcement widget's default data
export interface IAnnouncementDefaultData extends Record<string, unknown> {
  text: string;
  color: string;
  textColor: string;
  titleColor: string;
  accentColor: string;
  title?: string;
}

// Define the widget definition arguments for the Announcement widget
const announcementDefinitionArgs: IWidgetDefinitionArgs<Record<string, unknown>> = {
  name: 'Announcement',
  type: 'announcement',
  version: '0.1',
  icon: AlertTriangle,
  defaultData: {
    text: '',
    color: '#708090', // Slate gray
    textColor: '#ffffff', // White
    titleColor: '#fff0f0', // Snow
    accentColor: '#EDC951', // Goldenrod
    title: 'Announcement', // Default title
  } as Record<string, unknown>,
  WidgetComponent: AnnouncementContent as unknown as ComponentType<IWidgetContentProps<Record<string, unknown>>>,
  OptionsComponent: AnnouncementOptions as unknown as ComponentType<IWidgetOptionsEditorProps<Record<string, unknown>>>
}

class Announcement extends BaseWidget {
  constructor() {
    super(announcementDefinitionArgs)
  }
}

// Export an instance of the Announcement widget
const announcementWidget: IBaseWidget = new Announcement()
export default announcementWidget
