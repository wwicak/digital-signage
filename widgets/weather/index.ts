import { ComponentType } from 'react';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faCloudSun } from '@fortawesome/free-solid-svg-icons'; // Import the specific icon

import BaseWidget, { IBaseWidget, IWidgetDefinitionArgs } from '../../base_widget';
import WeatherContent from './src/WeatherContent'; // Assuming .js for now
import WeatherOptions from './src/WeatherOptions'; // Assuming .js for now

// Define the structure for the weather widget's default data
export type TWeatherUnit = 'metric' | 'imperial'; // Celsius/Meters/sec vs Fahrenheit/Miles/hour

interface IWeatherDefaultData {
  zip: string; // Zip code or city name for location
  unit: TWeatherUnit;
  showForecast?: boolean; // Option to show multi-day forecast
  apiKey?: string; // If an API key is needed and configurable per widget instance
  locationName?: string; // Display name for the location, might be fetched or set
}

// Define the widget definition arguments for the Weather widget
const weatherDefinitionArgs: IWidgetDefinitionArgs = {
  name: 'Weather',
  type: 'weather', // Added 'type' field as it's required
  version: '0.1',
  icon: faCloudSun as IconProp, // Use the imported icon
  defaultData: {
    zip: '10001', // Default to New York
    unit: 'imperial',
    showForecast: true, // Default to show forecast
    apiKey: '', // API key might be needed
    locationName: '', // Will be updated after fetching weather
  } as IWeatherDefaultData,
  WidgetComponent: WeatherContent as ComponentType<any>,
  OptionsComponent: WeatherOptions as ComponentType<any>,
};

// Renamed from Weather to WeatherWidget for consistency
class WeatherWidget extends BaseWidget {
  constructor() {
    super(weatherDefinitionArgs);
  }

  // Widget and Options getters are inherited from BaseWidget
}

// Export an instance of the WeatherWidget, typed as IBaseWidget
const weatherWidget: IBaseWidget = new WeatherWidget();
export default weatherWidget;
