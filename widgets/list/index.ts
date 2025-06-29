import { ComponentType } from 'react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from '../base_widget'
import ListContent from './src/ListContent' // Assuming .js for now
import ListOptions from './src/ListOptions' // Assuming .js for now
import { List } from 'lucide-react'

// Define the structure for a single list item
export interface IListItem {
  text: string;
  label?: string | null; // Optional label for the list item
  // id?: string; // Optional unique ID if items need to be identified for DND or updates
}

// Define the structure for the list widget's default data
export interface IListDefaultData {
  title?: string | null;
  color: string; // Background color for the widget
  textColor: string; // Text color for list items
  list: IListItem[];
  ordered?: boolean; // Whether the list is ordered (numbered) or unordered (bulleted)
  fontSize?: number; // Font size for list items
}

// Define the widget definition arguments for the List widget
const listDefinitionArgs: IWidgetDefinitionArgs = {
  name: 'List',
  type: 'list', // Added 'type' field as it's required
  version: '0.1',
  icon: List, // Use the imported icon
  defaultData: {
    title: null,
    color: '#34495e', // Wet Asphalt
    textColor: '#ffffff', // White
    list: [{ text: 'First item', label: null }], // Default with one item
    ordered: false, // Default to unordered list
    fontSize: 16, // Default font size
  } as IListDefaultData,
  WidgetComponent: ListContent as ComponentType<IWidgetContentProps<IListDefaultData>>,
  OptionsComponent: ListOptions as ComponentType<IWidgetOptionsEditorProps<IListDefaultData>>,
}

// Renamed from List to ListWidget for consistency and to avoid potential conflicts
class ListWidget extends BaseWidget {
  constructor() {
    super(listDefinitionArgs)
  }

  // Widget and Options getters are inherited from BaseWidget
}

// Export an instance of the ListWidget, typed as IBaseWidget
const listWidget: IBaseWidget = new ListWidget()
export default listWidget
