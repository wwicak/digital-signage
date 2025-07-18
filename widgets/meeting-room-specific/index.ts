import { ComponentType } from 'react'
import { Calendar } from 'lucide-react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from '../base_widget'
import MeetingRoomSpecificContent from './src/MeetingRoomSpecificContent'
import MeetingRoomSpecificOptions from './src/MeetingRoomSpecificOptions'

// Define the structure for the meeting room widget's default data
export interface IMeetingRoomSpecificDefaultData extends Record<string, unknown> {
  roomId?: string;
  refreshInterval: number;
  showUpcoming: boolean;
  maxReservations: number;
  title?: string;
}

// Define the widget definition arguments for the Meeting Room Specific widget
const meetingRoomSpecificDefinitionArgs: IWidgetDefinitionArgs<Record<string, unknown>> = {
  name: 'Meeting Room Display (Specific Room)',
  type: 'meeting-room-specific',
  version: '1.0.0',
  icon: Calendar,
  defaultData: {
    roomId: undefined, // Will require a specific room to be selected
    refreshInterval: 30000, // 30 seconds
    showUpcoming: true,
    maxReservations: 10,
    title: "Today's Meetings",
  } as Record<string, unknown>,
  WidgetComponent: MeetingRoomSpecificContent as unknown as ComponentType<IWidgetContentProps<Record<string, unknown>>>,
  OptionsComponent: MeetingRoomSpecificOptions as unknown as ComponentType<IWidgetOptionsEditorProps<Record<string, unknown>>>,
}

class MeetingRoomSpecific extends BaseWidget {
  constructor() {
    super(meetingRoomSpecificDefinitionArgs)
  }
}

// Export an instance of the Meeting Room Specific widget
const meetingRoomSpecificWidget: IBaseWidget = new MeetingRoomSpecific()
export default meetingRoomSpecificWidget
