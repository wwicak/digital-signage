import { ComponentType } from 'react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs } from '../base_widget'
import SlideshowContent from './src/Slideshow' // Assuming .js for now, will be .tsx later
import SlideshowOptions from './src/SlideshowOptions' // Assuming .js for now, will be .tsx later
import { Images } from 'lucide-react'

// Define the structure for the slideshow widget's default data
export interface ISlideshowWidgetDefaultData {
  slideshow_id: string | null; // ID of the slideshow to display
  show_progressbar?: boolean; // Whether to show a progress bar for slide duration
  transition_time?: number; // Time in seconds for transition between slides (if applicable)
  random_order?: boolean; // Play slides in random order
}

// Define the widget definition arguments for the Slideshow widget
const slideshowWidgetDefinitionArgs: IWidgetDefinitionArgs = {
  name: 'Slideshow',
  type: 'slideshow', // Added 'type' field as it's required
  version: '0.1',
  icon: Images, // Use the imported icon
  defaultData: {
    slideshow_id: null,
    show_progressbar: true,
    transition_time: 1, // Default 1 second
    random_order: false,
  } as ISlideshowWidgetDefaultData,
  WidgetComponent: SlideshowContent as ComponentType<any>,
  OptionsComponent: SlideshowOptions as ComponentType<any>,
}

// Renamed from Slideshow to SlideshowWidget for consistency
class SlideshowWidget extends BaseWidget {
  constructor() {
    super(slideshowWidgetDefinitionArgs)
  }

  // Widget and Options getters are inherited from BaseWidget
}

// Export an instance of the SlideshowWidget, typed as IBaseWidget
const slideshowWidget: IBaseWidget = new SlideshowWidget()
export default slideshowWidget
