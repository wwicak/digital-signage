import { ComponentType } from 'react'

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs, IWidgetContentProps, IWidgetOptionsEditorProps } from '../base_widget'
import WeatherContent from './src/WeatherContent'
import WeatherOptions from './src/WeatherOptions'
import { Cloud } from 'lucide-react'

// Define the structure for the weather widget's default data
export type TWeatherUnit = 'metric' | 'imperial'; // Celsius/Meters/sec vs Fahrenheit/Miles/hour

export interface IWeatherDefaultData extends Record<string, unknown> {
  zip: string; // Zip code or city name for location
  unit: TWeatherUnit;
  showForecast?: boolean; // Option to show multi-day forecast
  apiKey?: string; // If an API key is needed and configurable per widget instance
  locationName?: string; // Display name for the location, might be fetched or set
}

// Define the widget definition arguments for the Weather widget
const weatherDefinitionArgs: IWidgetDefinitionArgs<IWeatherDefaultData> = {
  name: 'Weather',
  type: 'weather',
  version: '0.1',
  icon: Cloud,
  defaultData: {
    zip: '10001', // Default to New York
    unit: 'imperial',
    showForecast: true, // Default to show forecast
    apiKey: '', // API key might be needed
    locationName: '', // Will be updated after fetching weather
  },
  WidgetComponent: WeatherContent as ComponentType<IWidgetContentProps<IWeatherDefaultData>>,
  OptionsComponent: WeatherOptions as ComponentType<IWidgetOptionsEditorProps<IWeatherDefaultData>>,
}

// Renamed from Weather to WeatherWidget for consistency
class WeatherWidget extends BaseWidget {
  constructor() {
    super(weatherDefinitionArgs)
  }
}

// Export an instance of the WeatherWidget
const weatherWidget: IBaseWidget = new WeatherWidget()
export default weatherWidget
