import { ComponentType } from 'react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs } from '../base_widget'
import ImageContent from './src/ImageContent' // Assuming .js for now
import ImageOptions from './src/ImageOptions' // Assuming .js for now
import { Edit, X, Trash2, Plus, Minus, Eye, User, Settings, Key, Tv, Grid3X3, Grid2X2, Images, Image, Play, Pause, Stop, Clock, Calendar, ExternalLink, Download, Upload, Save, LogOut, ChevronDown, ChevronUp, Layout, Cast, Smartphone, Tablet, Monitor } from 'lucide-react'

// Define the structure for the image widget's default data
export type TImageFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

export interface IImageDefaultData {
  title?: string | null; // Optional title for the image/widget
  url: string | null; // URL of the image
  fit: TImageFit; // How the image should fit within its container
  color: string; // Background color, useful if image is transparent or doesn't cover fully
  altText?: string; // Alt text for accessibility
}

// Define the widget definition arguments for the Image widget
const imageDefinitionArgs: IWidgetDefinitionArgs = {
  name: 'Image',
  type: 'image', // Added 'type' field as it's required
  version: '0.1',
  icon: faImage , // Use the imported icon
  defaultData: {
    title: null,
    url: null,
    fit: 'contain',
    color: '#2d3436', // Default background: Dark Gray
    altText: '',
  } as IImageDefaultData,
  WidgetComponent: ImageContent as ComponentType<any>, // Cast as ComponentType<any> for now
  OptionsComponent: ImageOptions as ComponentType<any>, // Cast as ComponentType<any> for now
}

// Renamed from Image to ImageWidget to avoid potential naming conflicts with global Image type
class ImageWidget extends BaseWidget {
  constructor() {
    super(imageDefinitionArgs)
  }

  /*
   * Widget and Options getters are inherited from BaseWidget
   * and will use WidgetComponent and OptionsComponent from definitionArgs
   */
}

// Export an instance of the ImageWidget, typed as IBaseWidget
const imageWidget: IBaseWidget = new ImageWidget()
export default imageWidget
