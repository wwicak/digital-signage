import React, { ComponentType } from 'react'
import { LucideIcon } from 'lucide-react'
import EmptyWidget from '../components/Widgets/EmptyWidget'
import EmptyWidgetOptions from '../components/Widgets/EmptyWidgetOptions'

// Generic widget content props interface
export interface IWidgetContentProps<T = Record<string, any>> {
  data?: T;
  isPreview?: boolean;
}

// Generic widget options props interface
export interface IWidgetOptionsProps<T = Record<string, any>> {
  data: T;
  onChange: (
    name: string,
    value: unknown,
    event?:
      | React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      | File
  ) => void;
}

// Interface that matches what WidgetEditDialog expects
export interface IWidgetOptionsEditorProps<T = Record<string, any>> {
  data: T | undefined;
  onChange: (newData: T) => void;
}

// Interface for the arguments passed to the BaseWidget constructor
export interface IWidgetDefinitionArgs<TData = Record<string, any>> {
  name: string; // Human-readable name of the widget
  type: string; // Unique type identifier for the widget (e.g., 'clock', 'weather-map')
  version: string; // Version of the widget definition
  icon: LucideIcon; // Icon to represent the widget in UI
  defaultData?: TData; // Default configuration data for a new instance of this widget
  WidgetComponent?: ComponentType<IWidgetContentProps<TData>>; // The actual React component to render the widget
  OptionsComponent?: ComponentType<IWidgetOptionsEditorProps<TData>>; // The React component to render widget-specific options/settings
  [key: string]: unknown; // Allow other properties specific to the widget definition
}

/*
 * Interface for the BaseWidget instance structure
 * This defines what properties an instance of BaseWidget (or its derivatives) will have.
 */
export interface IBaseWidget<TData = Record<string, any>> {
  name: string;
  type: string;
  version: string;
  icon: LucideIcon;
  defaultData?: TData;
  Widget: ComponentType<IWidgetContentProps<TData>>; // Getter for the widget display component
  Options: ComponentType<IWidgetOptionsEditorProps<TData>>; // Getter for the widget options component
  [key: string]: unknown; // Allow other properties from definition
}

const REQUIRED_DEF_FIELDS: Array<
  keyof Pick<IWidgetDefinitionArgs, 'name' | 'version' | 'icon' | 'type'>
> = ['name', 'type', 'version', 'icon']

class BaseWidget implements IBaseWidget {
  // Declare properties that will be set by the constructor from definition
  public name: string
  public type: string
  public version: string
  public icon: LucideIcon
  public defaultData?: Record<string, unknown>

  // Store the components passed in definition, or use defaults
  private _WidgetComponent: ComponentType<IWidgetContentProps<Record<string, unknown>>>
  private _OptionsComponent: ComponentType<IWidgetOptionsEditorProps<Record<string, unknown>>>;

  // Index signature to allow dynamic properties
  [key: string]: unknown;

  constructor(definition: IWidgetDefinitionArgs) {
    for (const reqField of REQUIRED_DEF_FIELDS) {
      if (!(reqField in definition)) {
        throw new Error(
          `Field '${reqField}' is a required property for new widget definitions.`
        )
      }
    }

    /*
     * Assign all definition fields to this instance
     * Object.assign(this, definition); // This is less type-safe
     */

    this.name = definition.name
    this.type = definition.type
    this.version = definition.version
    this.icon = definition.icon
    this.defaultData = definition.defaultData

    // Assign other fields from definition dynamically
    for (const defField of Object.keys(definition)) {
      if (!(this as Record<string, unknown>).hasOwnProperty(defField)) {
        // Avoid re-assigning already declared properties
        (this as Record<string, unknown>)[defField] = (definition as Record<string, unknown>)[defField]
      }
    }

    this._WidgetComponent = definition.WidgetComponent || EmptyWidget
    this._OptionsComponent = definition.OptionsComponent || EmptyWidgetOptions
  }

  // Getter for the React component that renders the widget
  public get Widget(): ComponentType<IWidgetContentProps<Record<string, unknown>>> {
    return this._WidgetComponent
  }

  // Getter for the React component that renders the widget's options/settings form
  public get Options(): ComponentType<IWidgetOptionsEditorProps<Record<string, unknown>>> {
    return this._OptionsComponent
  }
}

export default BaseWidget
