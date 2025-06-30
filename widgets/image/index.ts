import { ComponentType } from 'react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from '../base_widget'
import ImageContent from './src/ImageContent'
import ImageOptions from './src/ImageOptions'
import { Image } from 'lucide-react'

// Define the structure for the image widget's default data
export type TImageFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

export interface IImageDefaultData extends Record<string, unknown> {
  title?: string | null; // Optional title for the image/widget
  url: string | null; // URL of the image
  fit: TImageFit; // How the image should fit within its container
  color: string; // Background color, useful if image is transparent or doesn't cover fully
  altText?: string; // Alt text for accessibility
}

// Define the widget definition arguments for the Image widget
const imageDefinitionArgs: IWidgetDefinitionArgs<IImageDefaultData> = {
  name: 'Image',
  type: 'image',
  version: '0.1',
  icon: Image,
  defaultData: {
    title: null,
    url: null,
    fit: 'contain',
    color: '#2d3436', // Default background: Dark Gray
    altText: '',
  },
  WidgetComponent: ImageContent as ComponentType<IWidgetContentProps<IImageDefaultData>>,
  OptionsComponent: ImageOptions as ComponentType<IWidgetOptionsEditorProps<IImageDefaultData>>
}

// Renamed from Image to ImageWidget to avoid potential naming conflicts with global Image type
class ImageWidget extends BaseWidget {
  constructor() {
    super(imageDefinitionArgs)
  }
}

// Export an instance of the ImageWidget
const imageWidget: IBaseWidget = new ImageWidget()
export default imageWidget
