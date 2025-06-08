import { ComponentType } from 'react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs } from '../base_widget'
import AnnouncementContent from './src/AnnouncementContent' // Assuming .js for now
import AnnouncementOptions from './src/AnnouncementOptions' // Assuming .js for now
import { Edit, X, Trash2, Plus, Minus, Eye, User, Settings, Key, Tv, Grid3X3, Grid2X2, Images, Image, Play, Pause, Stop, Clock, Calendar, ExternalLink, Download, Upload, Save, LogOut, ChevronDown, ChevronUp, Layout, Cast, Smartphone, Tablet, Monitor } from 'lucide-react'

// Define the structure for the announcement widget's default data
interface IAnnouncementDefaultData {
  text: string;
  color: string;
  textColor: string;
  titleColor: string;
  accentColor: string;
  title?: string; // Added optional title based on typical announcements
}

// Define the widget definition arguments for the Announcement widget
const announcementDefinitionArgs: IWidgetDefinitionArgs = {
  name: 'Announcement',
  type: 'announcement', // Added 'type' field as it's required by IWidgetDefinitionArgs
  version: '0.1',
  icon: faExclamationTriangle , // Use the imported icon
  defaultData: {
    text: '',
    color: '#708090', // Slate gray
    textColor: '#ffffff', // White
    titleColor: '#fff0f0', // Snow
    accentColor: '#EDC951', // Goldenrod
    title: 'Announcement', // Default title
  } as IAnnouncementDefaultData,
  WidgetComponent: AnnouncementContent as ComponentType<any>, // Cast as ComponentType<any> for now
  OptionsComponent: AnnouncementOptions as ComponentType<any>, // Cast as ComponentType<any> for now
}

class Announcement extends BaseWidget {
  constructor() {
    super(announcementDefinitionArgs)
  }

  /*
   * Widget and Options getters are inherited from BaseWidget
   * and will use WidgetComponent and OptionsComponent from definitionArgs
   */
}

// Export an instance of the Announcement widget, typed as IBaseWidget
const announcementWidget: IBaseWidget = new Announcement()
export default announcementWidget
