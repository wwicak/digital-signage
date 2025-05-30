import React, { Component } from 'react';
import { Form, Input, IChoice, InlineInputGroup } from '../../../components/Form'; // Assuming Form components are/will be typed
import { IWidgetOptionsEditorProps } from '../../../components/Admin/WidgetEditDialog'; // Props from WidgetEditDialog

import { IWeatherDefaultData, TWeatherUnit } from '../index'; // Data structure and types from weather/index.ts

// Props for WeatherOptions should conform to IWidgetOptionsEditorProps
export interface IWeatherOptionsProps extends IWidgetOptionsEditorProps<IWeatherDefaultData> {}

// State for WeatherOptions will hold the fields of IWeatherDefaultData
type IWeatherOptionsState = IWeatherDefaultData;

// Define available 'unit' choices
const unitChoices: IChoice[] = [
  { id: 'imperial', label: 'Fahrenheit (°F)' },
  { id: 'metric', label: 'Celsius (°C)' },
];

class WeatherOptions extends Component<IWeatherOptionsProps, IWeatherOptionsState> {
  constructor(props: IWeatherOptionsProps) {
    super(props);
    // Initialize state from props.data, providing defaults from IWeatherDefaultData
    const {
      zip = '10001',
      unit = 'imperial',
      showForecast = true,
      apiKey = '', // Default to empty, user should provide their own
      locationName = '', // This might be display-only or editable based on requirements
    } = props.data || {};

    this.state = {
      zip,
      unit,
      showForecast,
      apiKey,
      locationName,
    };
  }

  componentDidUpdate(prevProps: IWeatherOptionsProps) {
    if (this.props.data !== prevProps.data && this.props.data) {
      // This can cause issues if not handled carefully.
      // Update state if props.data changes, ensuring defaults are still applied if new data is partial.
      const {
        zip = this.state.zip, // Keep current state if new prop doesn't have it
        unit = this.state.unit,
        showForecast = this.state.showForecast,
        apiKey = this.state.apiKey,
        locationName = this.state.locationName,
      } = this.props.data;
      this.setState({ zip, unit, showForecast, apiKey, locationName });
    }
  }

  handleChange = (name: string, value: any): void => {
    const { onChange } = this.props;
    this.setState(
      { [name]: value } as Pick<IWeatherOptionsState, keyof IWeatherOptionsState>,
      () => {
        if (onChange) {
          onChange(this.state); // Pass the entire current state upwards
        }
      }
    );
  };

  render() {
    // Provide fallbacks for rendering if state values are somehow undefined/null
    const {
      zip = '',
      unit = 'imperial',
      showForecast = true,
      apiKey = '',
      locationName = '', // Location name might be read-only if fetched by WeatherContent
    } = this.state;

    return (
      <Form>
        <h3>Widget: Weather</h3>
        <p>Choose your preferences for the weather widget.</p>
        <Input
          label={'API Key (OpenWeatherMap)'}
          type={'text'}
          name={'apiKey'}
          value={apiKey}
          placeholder={'Enter your OpenWeatherMap API Key'}
          onChange={this.handleChange}
          helpText="An API key from OpenWeatherMap is required."
        />
        <InlineInputGroup>
            <Input
            label={'Zip Code or City Name'}
            type={'text'}
            name={'zip'}
            value={zip}
            placeholder={'e.g., 90210 or London'}
            onChange={this.handleChange}
            expand={true}
            />
            <Input
            label={'Temperature Unit'}
            type={'select'}
            name={'unit'}
            value={unit}
            choices={unitChoices}
            onChange={this.handleChange}
            expand={false}
            />
        </InlineInputGroup>
        <Input
            type="checkbox"
            name="showForecast" // Make sure this matches a key in IWeatherOptionsState
            label="Show Multi-day Forecast"
            checked={showForecast} // Direct boolean binding
            onChange={(name, checked) => this.handleChange(name as keyof IWeatherOptionsState, checked)}
        />
        {/* Location Name could be an input if user should set it, or just display if API provides it */}
        {/* For now, assuming it might be editable if desired, or it's just part of the data object */}
        <Input
            label={'Location Display Name (Optional)'}
            type={'text'}
            name={'locationName'}
            value={locationName}
            placeholder={'e.g., New York City (auto-detected if empty)'}
            onChange={this.handleChange}
            helpText="Overrides auto-detected name from API."
        />
        <style jsx>
          {`
            h3,
            p {
              font-family: 'Open Sans', sans-serif;
            }
            /* Form, Input, InlineInputGroup styles are assumed to be global or handled by those components */
          `}
        </style>
      </Form>
    );
  }
}

export default WeatherOptions;
