import React, { ComponentType } from 'react';
import EmptyWidget from '../components/Widgets/EmptyWidget'; // Assuming .js or .tsx
import EmptyWidgetOptions from '../components/Widgets/EmptyWidgetOptions'; // Assuming .js or .tsx
import { IconProp } from '@fortawesome/fontawesome-svg-core'; // For the 'icon' field

// Interface for the arguments passed to the BaseWidget constructor
// Individual widgets will provide these details.
export interface IWidgetDefinitionArgs {
  name: string; // Human-readable name of the widget
  type: string; // Unique type identifier for the widget (e.g., 'clock', 'weather-map')
  version: string; // Version of the widget definition
  icon: IconProp; // Icon to represent the widget in UI
  defaultData?: Record<string, any>; // Default configuration data for a new instance of this widget
  WidgetComponent?: ComponentType<any>; // The actual React component to render the widget
  OptionsComponent?: ComponentType<any>; // The React component to render widget-specific options/settings
  [key: string]: any; // Allow other properties specific to the widget definition
}

// Interface for the BaseWidget instance structure
// This defines what properties an instance of BaseWidget (or its derivatives) will have.
export interface IBaseWidget {
  name: string;
  type: string;
  version: string;
  icon: IconProp;
  defaultData?: Record<string, any>;
  Widget: ComponentType<any>; // Getter for the widget display component
  Options: ComponentType<any>; // Getter for the widget options component
  [key: string]: any; // Allow other properties from definition
}

const REQUIRED_DEF_FIELDS: Array<keyof Pick<IWidgetDefinitionArgs, 'name' | 'version' | 'icon' | 'type'>> = ['name', 'type', 'version', 'icon'];

class BaseWidget implements IBaseWidget {
  // Declare properties that will be set by the constructor from definition
  public name: string;
  public type: string;
  public version: string;
  public icon: IconProp;
  public defaultData?: Record<string, any>;

  // Store the components passed in definition, or use defaults
  private _WidgetComponent: ComponentType<any>;
  private _OptionsComponent: ComponentType<any>;

  constructor(definition: IWidgetDefinitionArgs) {
    for (const reqField of REQUIRED_DEF_FIELDS) {
      if (!(reqField in definition)) {
        throw new Error(`Field '${reqField}' is a required property for new widget definitions.`);
      }
    }

    // Assign all definition fields to this instance
    // Object.assign(this, definition); // This is less type-safe

    this.name = definition.name;
    this.type = definition.type;
    this.version = definition.version;
    this.icon = definition.icon;
    this.defaultData = definition.defaultData;
    
    // Assign other fields from definition dynamically
    for (const defField of Object.keys(definition)) {
        if (!(this as any).hasOwnProperty(defField)) { // Avoid re-assigning already declared properties
            (this as any)[defField] = definition[defField];
        }
    }

    this._WidgetComponent = definition.WidgetComponent || EmptyWidget;
    this._OptionsComponent = definition.OptionsComponent || EmptyWidgetOptions;
  }

  // Getter for the React component that renders the widget
  public get Widget(): ComponentType<any> {
    return this._WidgetComponent;
  }

  // Getter for the React component that renders the widget's options/settings form
  public get Options(): ComponentType<any> {
    return this._OptionsComponent;
  }
}

export default BaseWidget;
