import React, { useState, useEffect, useCallback } from 'react'
import axios, { AxiosResponse } from 'axios'
import { MapPin } from 'lucide-react'

import WeatherIcon from './WeatherIcon'
import { TWeatherUnit } from '../index'
import * as z from 'zod'

// Zod schema for TWeatherUnit
export const TWeatherUnitSchema = z.enum(['metric', 'imperial'])

// Zod schema for IWeatherDefaultData (used in props.data)
export const WeatherWidgetDataSchema = z.object({
  zip: z.string(),
  unit: TWeatherUnitSchema,
  showForecast: z.boolean().optional(),
  apiKey: z.string().optional(),
  locationName: z.string().optional(),
})

// Zod schema for WeatherContent component props
export const WeatherContentPropsSchema = z.object({
  data: WeatherWidgetDataSchema.optional(),
  isPreview: z.boolean().optional(),
})
export type IWeatherContentProps = z.infer<typeof WeatherContentPropsSchema>;

// Zod schema for WeatherContent component state
export const WeatherContentStateSchema = z.object({
  locationName: z.string().optional(),
  iconCode: z.string().optional(),
  temperature: z.number().optional(),
  description: z.string().optional(),
  isLoading: z.boolean(),
  error: z.string().nullable(),
})
type IWeatherContentState = z.infer<typeof WeatherContentStateSchema>;

// --- OpenWeatherMap API Response Interfaces ---
interface IWeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface IMainWeatherData {
  temp: number;
  feels_like?: number;
  temp_min?: number;
  temp_max?: number;
  pressure?: number;
  humidity?: number;
  sea_level?: number;
  grnd_level?: number;
}

interface IWindData {
  speed?: number;
  deg?: number;
  gust?: number;
}

interface ICloudsData {
  all?: number;
}

interface ICoordData {
  lon?: number;
  lat?: number;
}

interface IOpenWeatherCurrentResponse {
  coord?: ICoordData;
  weather: IWeatherCondition[];
  base?: string;
  main: IMainWeatherData;
  visibility?: number;
  wind?: IWindData;
  clouds?: ICloudsData;
  dt?: number;
  sys?: {
    type?: number;
    id?: number;
    country?: string;
    sunrise?: number;
    sunset?: number;
  };
  timezone?: number;
  id?: number;
  name: string;
  cod?: number;
}

// --- Constants ---
const DEFAULT_UNIT: TWeatherUnit = 'imperial'
const DEFAULT_ZIP = '10001'
const DEFAULT_API_KEY = 'da6ef4bf43eed800fdadd4a728766089'
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5'

const WeatherContent: React.FC<IWeatherContentProps> = React.memo(({ data, isPreview }) => {
  const [weatherState, setWeatherState] = useState<IWeatherContentState>({
    isLoading: true,
    error: null,
  })

  const fetchWeatherData = useCallback(async (): Promise<void> => {
    const { zip = DEFAULT_ZIP, unit = DEFAULT_UNIT, apiKey = DEFAULT_API_KEY } = data || {}
    
    if (!apiKey) {
      setWeatherState(prev => ({ ...prev, isLoading: false, error: 'Weather API key is missing.' }))
      return
    }
    if (!zip) {
      setWeatherState(prev => ({ ...prev, isLoading: false, error: 'Location (zip/city) is missing.' }))
      return
    }

    setWeatherState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const queryParam = /^\d+$/.test(zip) ? `zip=${zip},us` : `q=${zip}`

      const response: AxiosResponse<IOpenWeatherCurrentResponse> = await axios.get(
        `${API_BASE_URL}/weather?${queryParam}&apiKey=${apiKey}&units=${unit}`
      )

      const responseData = response.data
      if (responseData && responseData.weather && responseData.weather.length > 0) {
        const { name, weather, main } = responseData
        const { icon, description } = weather[0]
        setWeatherState({
          locationName: name,
          iconCode: icon,
          temperature: main.temp,
          description,
          isLoading: false,
          error: null,
        })
      } else {
        throw new Error('Invalid weather data structure received.')
      }
    } catch (error: unknown) {
      console.error('Failed to fetch weather data:', error)
      let errorMessage = 'Could not retrieve weather information.'
      const errorWithResponse = error as {response?: {status: number; data?: {message?: string}}; message?: string};
      if (errorWithResponse.response) {
        errorMessage = `Error ${errorWithResponse.response.status}: ${errorWithResponse.response.data?.message || errorWithResponse.message || 'Unknown error'}`
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      setWeatherState(prev => ({ ...prev, isLoading: false, error: errorMessage }))
    }
  }, [data])

  useEffect(() => {
    fetchWeatherData()
  }, [fetchWeatherData])

  const { locationName, iconCode, temperature, description, isLoading, error } = weatherState

  if (isLoading) {
    return <div className='weather-loading'>Loading Weather...</div>
  }

  if (error) {
    return <div className='weather-error'>Error: {error}</div>
  }

  if (!locationName) {
    return <div className='weather-nodata'>Weather data unavailable.</div>
  }

  return (
    <div className='relative box-border h-full w-full text-white flex-1 p-4 font-sans flex flex-row justify-between overflow-hidden'>
      {iconCode && <div className='absolute -5 -0'>
        <WeatherIcon icon={iconCode} />
      </div>}
      <div className='flex flex-col justify-end'>
        <div className='temp'>{Math.round(temperature || 0)}°</div>
        <div className='desc'>{description}</div>
        <div className='flex flex-row items-center'>
          <div className='marker-icon'>
            <MapPin className='w-4 h-4 text-gray-500' />
          </div>
          <div className='name-text'>{locationName}</div>
        </div>
      </div>
      {iconCode && <div className='flex flex-col justify-start scale-200'>
        <WeatherIcon icon={iconCode} />
      </div>}
      
    </div>
  )
})

WeatherContent.displayName = 'WeatherContent'

export default WeatherContent