import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosResponse } from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { config as FaConfig, IconProp } from '@fortawesome/fontawesome-svg-core';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

import WeatherIcon from './WeatherIcon';
import { IWeatherDefaultData, TWeatherUnit } from '../index';
import * as z from 'zod';

FaConfig.autoAddCss = false;

// Zod schema for TWeatherUnit
export const TWeatherUnitSchema = z.enum(["metric", "imperial"]);

// Zod schema for IWeatherDefaultData (used in props.data)
export const WeatherWidgetDataSchema = z.object({
  zip: z.string(),
  unit: TWeatherUnitSchema,
  showForecast: z.boolean().optional(),
  apiKey: z.string().optional(),
  locationName: z.string().optional(),
});

// Zod schema for WeatherContent component props
export const WeatherContentPropsSchema = z.object({
  data: WeatherWidgetDataSchema.optional(),
  isPreview: z.boolean().optional(),
});
export type IWeatherContentProps = z.infer<typeof WeatherContentPropsSchema>;

// Zod schema for WeatherContent component state
export const WeatherContentStateSchema = z.object({
  locationName: z.string().optional(),
  iconCode: z.string().optional(),
  temperature: z.number().optional(),
  description: z.string().optional(),
  isLoading: z.boolean(),
  error: z.string().nullable(),
});
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
const DEFAULT_UNIT: TWeatherUnit = 'imperial';
const DEFAULT_ZIP = '10001';
const DEFAULT_API_KEY = 'da6ef4bf43eed800fdadd4a728766089';
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

const WeatherContent: React.FC<IWeatherContentProps> = React.memo(({ data, isPreview }) => {
  const [weatherState, setWeatherState] = useState<IWeatherContentState>({
    isLoading: true,
    error: null,
  });

  const fetchWeatherData = useCallback(async (): Promise<void> => {
    const { zip = DEFAULT_ZIP, unit = DEFAULT_UNIT, apiKey = DEFAULT_API_KEY } = data || {};
    
    if (!apiKey) {
      setWeatherState(prev => ({ ...prev, isLoading: false, error: "Weather API key is missing." }));
      return;
    }
    if (!zip) {
      setWeatherState(prev => ({ ...prev, isLoading: false, error: "Location (zip/city) is missing." }));
      return;
    }

    setWeatherState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const queryParam = /^\d+$/.test(zip) ? `zip=${zip},us` : `q=${zip}`;

      const response: AxiosResponse<IOpenWeatherCurrentResponse> = await axios.get(
        `${API_BASE_URL}/weather?${queryParam}&apiKey=${apiKey}&units=${unit}`
      );

      const responseData = response.data;
      if (responseData && responseData.weather && responseData.weather.length > 0) {
        const { name, weather, main } = responseData;
        const { icon, description } = weather[0];
        setWeatherState({
          locationName: name,
          iconCode: icon,
          temperature: main.temp,
          description,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error("Invalid weather data structure received.");
      }
    } catch (error: any) {
      console.error("Failed to fetch weather data:", error);
      let errorMessage = "Could not retrieve weather information.";
      if (error.response) {
        errorMessage = `Error ${error.response.status}: ${error.response.data?.message || error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setWeatherState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
    }
  }, [data]);

  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  const { locationName, iconCode, temperature, description, isLoading, error } = weatherState;

  if (isLoading) {
    return <div className="weather-loading">Loading Weather...</div>;
  }

  if (error) {
    return <div className="weather-error">Error: {error}</div>;
  }

  if (!locationName) {
    return <div className="weather-nodata">Weather data unavailable.</div>;
  }

  return (
    <div className='weather-widget-content'>
      {iconCode && <div className='background-icon'>
        <WeatherIcon icon={iconCode} />
      </div>}
      <div className='info-panel'>
        <div className='temp'>{Math.round(temperature || 0)}°</div>
        <div className='desc'>{description}</div>
        <div className='location-info'>
          <div className='marker-icon'>
            <FontAwesomeIcon icon={faMapMarkerAlt as IconProp} size='xs' fixedWidth />
          </div>
          <div className='name-text'>{locationName}</div>
        </div>
      </div>
      {iconCode && <div className='main-icon'>
        <WeatherIcon icon={iconCode} />
      </div>}
      <style jsx>
        {`
          .weather-widget-content {
            position: relative;
            box-sizing: border-box;
            height: 100%;
            width: 100%;
            background: #358aed;
            color: white;
            flex: 1;
            padding: 16px;
            font-family: 'Open Sans', sans-serif;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            overflow: hidden;
          }
          .info-panel {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            z-index: 1;
          }
          .main-icon {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            transform: scale(2);
            transform-origin: top right;
            z-index: 1;
          }
          .info-panel .temp {
            font-family: 'Open Sans', sans-serif;
            font-size: 48px;
            line-height: 1;
            margin-bottom: 4px;
          }
          .info-panel .desc {
            font-family: 'Open Sans', sans-serif;
            font-size: 14px;
            text-transform: capitalize;
            margin-bottom: 4px;
          }
          .background-icon {
            position: absolute;
            right: 20px;
            top: 0px;
            transform: scale(5) rotate(-5deg);
            opacity: 0.2;
            z-index: 0;
          }
          .location-info {
            display: flex;
            flex-direction: row;
            align-items: center;
          }
          .location-info .name-text {
            font-family: 'Open Sans', sans-serif;
            font-size: 12px;
            text-transform: capitalize;
          }
          .location-info .marker-icon {
            margin-right: 4px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .weather-loading, .weather-error, .weather-nodata {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            width: 100%;
            color: white;
            font-family: 'Open Sans', sans-serif;
            font-size: 1.2em;
            background: #358aed;
          }
          .weather-error {
            color: #ffdddd;
          }
        `}
      </style>
    </div>
  );
});

WeatherContent.displayName = 'WeatherContent';

export default WeatherContent;
