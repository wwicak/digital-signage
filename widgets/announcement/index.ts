import { ComponentType } from 'react'
import { AlertTriangle } from 'lucide-react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from '../base_widget'
import AnnouncementContent from './src/AnnouncementContent'
import AnnouncementOptions from './src/AnnouncementOptions'

// Define the structure for the announcement widget's default data
export interface IAnnouncementDefaultData extends Record<string, unknown> {
  title: string;
  content: string;
  date: string;
  time: string;
  priority: "high" | "medium" | "low";
  category: string;
  type: "alert" | "info" | "success" | "general";
}

// Define the widget definition arguments for the Announcement widget
const announcementDefinitionArgs: IWidgetDefinitionArgs<Record<string, unknown>> = {
  name: 'Announcement',
  type: 'announcement',
  version: '0.2',
  icon: AlertTriangle,
  defaultData: {
    title: 'Important System Maintenance',
    content: 'The network will be temporarily unavailable for scheduled maintenance. Please save your work and log off by 5:00 PM today. Expected downtime is 2 hours.',
    date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    time: '5:00 PM - 7:00 PM',
    priority: 'high' as const,
    category: 'IT Notice',
    type: 'alert' as const,
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
