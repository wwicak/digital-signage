import { ComponentType } from 'react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from '../base_widget'
import YoutubeContent from './src/YoutubeContent'
import YoutubeOptions from './src/YoutubeOptions'
import { Play } from 'lucide-react'

// Define the structure for the YouTube widget's default data
export interface IYoutubeDefaultData extends Record<string, unknown> {
  video_id: string | null; // YouTube Video ID (e.g., 9xwazD5SyVg)
  autoplay?: boolean;
  loop?: boolean;
  show_controls?: boolean;
  start_time?: number; // Start time in seconds
  end_time?: number; // End time in seconds
  show_captions?: boolean; // Show closed captions by default
  /*
   * 'title' and 'color' from original JS defaultData are less relevant for YouTube embeds.
   * If a frame title or background color for non-video area is needed, they can be added.
   */
}

// Define the widget definition arguments for the YouTube widget
const youtubeDefinitionArgs: IWidgetDefinitionArgs<Record<string, unknown>> = {
  name: 'YouTube Video', // More descriptive name
  type: 'youtube',
  version: '0.1',
  icon: Play,
  defaultData: {
    video_id: '9xwazD5SyVg', // Example video ID
    autoplay: true,
    loop: false,
    show_controls: true,
    start_time: 0,
    end_time: 0, // 0 typically means play to end
    show_captions: false,
  } as Record<string, unknown>,
  WidgetComponent: YoutubeContent as unknown as ComponentType<IWidgetContentProps<Record<string, unknown>>>,
  OptionsComponent: YoutubeOptions as unknown as ComponentType<IWidgetOptionsEditorProps<Record<string, unknown>>>,
}

// Renamed from Web (in original JS) to YoutubeWidget
class YoutubeWidget extends BaseWidget {
  constructor() {
    super(youtubeDefinitionArgs)
  }
}

// Export an instance of the YoutubeWidget
const youtubeWidget: IBaseWidget = new YoutubeWidget()
export default youtubeWidget
