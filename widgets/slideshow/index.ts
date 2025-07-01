import { ComponentType } from 'react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from '../base_widget'
import SlideshowContent from './src/Slideshow'
import SlideshowOptions from './src/SlideshowOptions'
import { Images } from 'lucide-react'

// Define the structure for the slideshow widget's default data
export interface ISlideshowWidgetDefaultData extends Record<string, unknown> {
  slideshow_id: string | null; // ID of the slideshow to display
  show_progressbar?: boolean; // Whether to show a progress bar for slide duration
  transition_time?: number; // Time in seconds for transition between slides (if applicable)
  random_order?: boolean; // Play slides in random order
}

// Define the widget definition arguments for the Slideshow widget
const slideshowWidgetDefinitionArgs: IWidgetDefinitionArgs<Record<string, unknown>> = {
  name: 'Slideshow',
  type: 'slideshow',
  version: '0.1',
  icon: Images,
  defaultData: {
    slideshow_id: null,
    show_progressbar: true,
    transition_time: 1, // Default 1 second
    random_order: false,
  } as Record<string, unknown>,
  WidgetComponent: SlideshowContent as unknown as ComponentType<IWidgetContentProps<Record<string, unknown>>>,
  OptionsComponent: SlideshowOptions as unknown as ComponentType<IWidgetOptionsEditorProps<Record<string, unknown>>>,
}

// Renamed from Slideshow to SlideshowWidget for consistency
class SlideshowWidget extends BaseWidget {
  constructor() {
    super(slideshowWidgetDefinitionArgs)
  }
}

// Export an instance of the SlideshowWidget
const slideshowWidget: IBaseWidget = new SlideshowWidget()
export default slideshowWidget
