import React, { Component } from 'react'
import { Form, Input, IChoice } from '../../../components/Form' // Assuming Form components are/will be typed
import * as z from 'zod'

// IWeatherDefaultData is interface
import { WeatherWidgetDataSchema } from './WeatherContent' // Import Zod schema for IWeatherDefaultData

/*
 * Zod schema for WeatherOptions props
 * IWidgetOptionsEditorProps<T> has data: T | undefined, onChange: (newData: T) => void
 */
export const WeatherOptionsPropsSchema = z.object({
  data: WeatherWidgetDataSchema.optional(),
  onChange: z.function().args(WeatherWidgetDataSchema).returns(z.void()),
})
export type IWeatherOptionsProps = z.infer<typeof WeatherOptionsPropsSchema>;

// State for WeatherOptions will use the Zod-inferred type
type IWeatherOptionsState = z.infer<typeof WeatherWidgetDataSchema>;

// Define available 'unit' choices
const unitChoices: IChoice[] = [
  { id: 'imperial', label: 'Fahrenheit (°F)' },
  { id: 'metric', label: 'Celsius (°C)' },
]

class WeatherOptions extends Component<IWeatherOptionsProps, IWeatherOptionsState> {
  constructor(props: IWeatherOptionsProps) {
    super(props)
    // Initialize state from props.data, providing defaults from IWeatherDefaultData
    const {
      zip = '10001',
      unit = 'imperial',
      showForecast = true,
      apiKey = '', // Default to empty, user should provide their own
      locationName = '', // This might be display-only or editable based on requirements
    } = props.data || {}

    this.state = {
      zip,
      unit,
      showForecast,
      apiKey,
      locationName,
    }
  }

  componentDidUpdate(prevProps: IWeatherOptionsProps) {
    if (this.props.data !== prevProps.data && this.props.data) {
      /*
       * This can cause issues if not handled carefully.
       * Update state if props.data changes, ensuring defaults are still applied if new data is partial.
       */
      const {
        zip = this.state.zip, // Keep current state if new prop doesn't have it
        unit = this.state.unit,
        showForecast = this.state.showForecast,
        apiKey = this.state.apiKey,
        locationName = this.state.locationName,
      } = this.props.data
      this.setState({ zip, unit, showForecast, apiKey, locationName })
    }
  }

  handleChange = (name: string, value: unknown): void => {
    const { onChange } = this.props
    this.setState(
      { [name]: value } as Pick<IWeatherOptionsState, keyof IWeatherOptionsState>,
      () => {
        if (onChange) {
          onChange(this.state) // Pass the entire current state upwards
        }
      }
    )
  }

  render() {
    // Provide fallbacks for rendering if state values are somehow undefined/null
    const {
      zip = '',
      unit = 'imperial',
      showForecast = true,
      apiKey = '',
      locationName = '', // Location name might be read-only if fetched by WeatherContent
    } = this.state

    return (
      <div className='space-y-8'>
        {/* Configuration Section */}
        <div className='bg-white rounded-lg border border-gray-200 p-6'>
          <div className='mb-6'>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>Weather Widget Configuration</h3>
            <p className='text-gray-600'>Configure your weather display settings and data source.</p>
          </div>

          <Form>
            <div className='space-y-6'>
              {/* API Key */}
              <div>
                <Input
                  label='OpenWeatherMap API Key'
                  type='text'
                  name='apiKey'
                  value={apiKey}
                  placeholder='Enter your OpenWeatherMap API Key'
                  onChange={this.handleChange}
                />
                <p className='text-sm text-gray-500 mt-1'>
                  Get your free API key from{' '}
                  <a href='https://openweathermap.org/api' target='_blank' rel='noopener noreferrer' className='text-blue-600 hover:text-blue-800'>
                    OpenWeatherMap
                  </a>
                </p>
              </div>

              {/* Location and Unit Settings */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <Input
                    label='Location'
                    type='text'
                    name='zip'
                    value={zip}
                    placeholder='e.g., 90210 or London'
                    onChange={this.handleChange}
                    expand={true}
                  />
                  <p className='text-sm text-gray-500 mt-1'>Enter zip code or city name</p>
                </div>
                <div>
                  <Input
                    label='Temperature Unit'
                    type='select'
                    name='unit'
                    value={unit}
                    choices={unitChoices}
                    onChange={this.handleChange}
                    expand={false}
                  />
                </div>
              </div>

              {/* Display Options */}
              <div className='space-y-4'>
                <div className='flex items-center'>
                  <Input
                    type='checkbox'
                    name='showForecast'
                    label='Show Multi-day Forecast'
                    checked={showForecast}
                    onChange={(name, checked) => this.handleChange(name as keyof IWeatherOptionsState, checked)}
                  />
                </div>

                <div>
                  <Input
                    label='Custom Location Name (Optional)'
                    type='text'
                    name='locationName'
                    value={locationName}
                    placeholder='e.g., New York City'
                    onChange={this.handleChange}
                  />
                  <p className='text-sm text-gray-500 mt-1'>Override the auto-detected location name</p>
                </div>
              </div>
            </div>
          </Form>
        </div>
      </div>
    )
  }
}

export default WeatherOptions