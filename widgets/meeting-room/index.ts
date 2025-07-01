import { ComponentType } from 'react'
import { Calendar } from 'lucide-react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from '../base_widget'
import MeetingRoomContent from './src/MeetingRoomContent'
import MeetingRoomOptions from './src/MeetingRoomOptions'

// Define the structure for the meeting room widget's default data
export interface IMeetingRoomDefaultData extends Record<string, unknown> {
  buildingId?: string;
  refreshInterval: number;
  showUpcoming: boolean;
  maxReservations: number;
  title?: string;
}

// Define the widget definition arguments for the Meeting Room widget
const meetingRoomDefinitionArgs: IWidgetDefinitionArgs<Record<string, unknown>> = {
  name: 'Meeting Room Display',
  type: 'meeting-room',
  version: '1.0.0',
  icon: Calendar,
  defaultData: {
    buildingId: undefined, // Will show all buildings if not set
    refreshInterval: 30000, // 30 seconds
    showUpcoming: true,
    maxReservations: 10,
    title: "Today's Meetings",
  } as Record<string, unknown>,
  WidgetComponent: MeetingRoomContent as unknown as ComponentType<IWidgetContentProps<Record<string, unknown>>>,
  OptionsComponent: MeetingRoomOptions as unknown as ComponentType<IWidgetOptionsEditorProps<Record<string, unknown>>>,
}

class MeetingRoom extends BaseWidget {
  constructor() {
    super(meetingRoomDefinitionArgs)
  }
}

// Export an instance of the Meeting Room widget
const meetingRoomWidget: IBaseWidget = new MeetingRoom()
export default meetingRoomWidget
