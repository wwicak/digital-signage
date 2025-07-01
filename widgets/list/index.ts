import { ComponentType } from 'react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from '../base_widget'
import ListContent from './src/ListContent'
import ListOptions from './src/ListOptions'
import { List } from 'lucide-react'

// Define the structure for a single list item
export interface IListItem {
  text: string;
  label?: string | null; // Optional label for the list item
  // id?: string; // Optional unique ID if items need to be identified for DND or updates
}

// Define the structure for the list widget's default data
export interface IListDefaultData extends Record<string, unknown> {
  title?: string | null;
  color: string; // Background color for the widget
  textColor: string; // Text color for list items
  list: IListItem[];
  ordered?: boolean; // Whether the list is ordered (numbered) or unordered (bulleted)
  fontSize?: number; // Font size for list items
}

// Define the widget definition arguments for the List widget
const listDefinitionArgs: IWidgetDefinitionArgs<Record<string, unknown>> = {
  name: 'List',
  type: 'list',
  version: '0.1',
  icon: List,
  defaultData: {
    title: null,
    color: '#34495e', // Wet Asphalt
    textColor: '#ffffff', // White
    list: [{ text: 'First item', label: null }], // Default with one item
    ordered: false, // Default to unordered list
    fontSize: 16, // Default font size
  } as Record<string, unknown>,
  WidgetComponent: ListContent as unknown as ComponentType<IWidgetContentProps<Record<string, unknown>>>,
  OptionsComponent: ListOptions as unknown as ComponentType<IWidgetOptionsEditorProps<Record<string, unknown>>>,
}

// Renamed from List to ListWidget for consistency and to avoid potential conflicts
class ListWidget extends BaseWidget {
  constructor() {
    super(listDefinitionArgs)
  }
}

// Export an instance of the ListWidget
const listWidget: IBaseWidget = new ListWidget()
export default listWidget
