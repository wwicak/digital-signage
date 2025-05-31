import React, { Component } from 'react';
import axios, { AxiosResponse } from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { config as FaConfig, IconProp } from '@fortawesome/fontawesome-svg-core';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons'; // Changed from faMapMarker for updated icon sets

import WeatherIcon from './WeatherIcon';
import { IWeatherDefaultData, TWeatherUnit } from '../index'; // IWeatherDefaultData is interface, TWeatherUnit is type alias
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
// We don't infer a type for IWeatherDefaultData from this schema here, as it's imported.
// This schema is for validating the 'data' prop.

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
// These can remain as interfaces as they type external API responses
interface IWeatherCondition {
  id: number; // Weather condition id
  main: string; // Group of weather parameters (Rain, Snow, Extreme etc.)
  description: string; // Weather condition within the group
  icon: string; // Weather icon id (e.g., "01d", "10n")
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
  all?: number; // Cloudiness %
}

interface ICoordData {
    lon?: number;
    lat?: number;
}

interface IOpenWeatherCurrentResponse {
  coord?: ICoordData;
  weather: IWeatherCondition[]; // Array, but usually only first element is used
  base?: string; // Internal parameter
  main: IMainWeatherData;
  visibility?: number;
  wind?: IWindData;
  clouds?: ICloudsData;
  dt?: number; // Time of data calculation, unix, UTC
  sys?: {
    type?: number;
    id?: number;
    country?: string; // Country code (GB, JP etc.)
    sunrise?: number; // Sunrise time, unix, UTC
    sunset?: number; // Sunset time, unix, UTC
  };
  timezone?: number; // Shift in seconds from UTC
  id?: number; // City ID
  name: string; // City name
  cod?: number; // Internal parameter
}

// --- Component Interfaces ---
// --- Constants ---
const DEFAULT_UNIT: TWeatherUnit = 'imperial';
const DEFAULT_ZIP = '10001'; // Default to New York
// It's highly recommended to move API keys to server-side or environment variables, not hardcode in frontend.
const DEFAULT_API_KEY = 'da6ef4bf43eed800fdadd4a728766089'; // This key is from the original JS
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5'; // Use HTTPS

class WeatherContent extends Component<IWeatherContentProps, IWeatherContentState> {
  constructor(props: IWeatherContentProps) {
    super(props);
    this.state = {
      isLoading: true,
      error: null,
    };
  }

  componentDidMount() {
    this.fetchWeatherData();
  }

  componentDidUpdate(prevProps: IWeatherContentProps) {
    // Re-fetch if zip, unit, or apiKey props change
    if (
      this.props.data?.zip !== prevProps.data?.zip ||
      this.props.data?.unit !== prevProps.data?.unit ||
      this.props.data?.apiKey !== prevProps.data?.apiKey
    ) {
      this.fetchWeatherData();
    }
  }

  fetchWeatherData = async (): Promise<void> => {
    const { zip = DEFAULT_ZIP, unit = DEFAULT_UNIT, apiKey = DEFAULT_API_KEY } = this.props.data || {};
    
    if (!apiKey) {
        this.setState({ isLoading: false, error: "Weather API key is missing." });
        return;
    }
    if (!zip) {
        this.setState({ isLoading: false, error: "Location (zip/city) is missing." });
        return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      // Determine if 'zip' is a numeric zip code or a city name for query parameter
      const queryParam = /^\d+$/.test(zip) ? `zip=${zip},us` : `q=${zip}`;

      const response: AxiosResponse<IOpenWeatherCurrentResponse> = await axios.get(
        `${API_BASE_URL}/weather?${queryParam}&apiKey=${apiKey}&units=${unit}`
      );

      const responseData = response.data;
      if (responseData && responseData.weather && responseData.weather.length > 0) {
        const { name, weather, main } = responseData;
        const { icon, description } = weather[0];
        this.setState({
          locationName: name,
          iconCode: icon,
          temperature: main.temp,
          description,
          isLoading: false,
        });
      } else {
        throw new Error("Invalid weather data structure received.");
      }
    } catch (error: any) {
      console.error("Failed to fetch weather data:", error);
      let errorMessage = "Could not retrieve weather information.";
      if (error.response) {
        // Handle specific API error messages if available
        errorMessage = `Error ${error.response.status}: ${error.response.data?.message || error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      this.setState({ isLoading: false, error: errorMessage });
    }
  };

  render() {
    const { locationName, iconCode, temperature, description, isLoading, error } = this.state;

    if (isLoading) {
      return <div className="weather-loading">Loading Weather...</div>;
    }

    if (error) {
      return <div className="weather-error">Error: {error}</div>;
    }

    if (!locationName) { // Or if other essential data is missing
      return <div className="weather-nodata">Weather data unavailable.</div>;
    }

    return (
      <div className='weather-widget-content'> {/* Renamed class */}
        {iconCode && <div className='background-icon'> {/* Renamed class */}
          <WeatherIcon icon={iconCode} />
        </div>}
        <div className='info-panel'> {/* Renamed class */}
          <div className='temp'>{Math.round(temperature || 0)}°</div>
          <div className='desc'>{description}</div>
          <div className='location-info'> {/* Renamed class */}
            <div className='marker-icon'> {/* Renamed class */}
              <FontAwesomeIcon icon={faMapMarkerAlt as IconProp} size='xs' fixedWidth />
            </div>
            <div className='name-text'>{locationName}</div> {/* Renamed class */}
          </div>
        </div>
        {iconCode && <div className='main-icon'> {/* Renamed class */}
          <WeatherIcon icon={iconCode} />
        </div>}
        <style jsx>
          {`
            .weather-widget-content { /* Renamed */
              position: relative;
              box-sizing: border-box;
              height: 100%;
              width: 100%;
              background: #358aed; /* Default background */
              color: white; /* Default text color */
              flex: 1; /* Fill parent if flex item */
              padding: 16px;
              font-family: 'Open Sans', sans-serif;
              display: flex;
              flex-direction: row;
              justify-content: space-between;
              overflow: hidden; /* Prevent bg icon from causing scroll */
            }
            .info-panel { /* Renamed */
              display: flex;
              flex-direction: column;
              justify-content: flex-end;
              z-index: 1; /* Ensure info is above background icon */
            }
            .main-icon { /* Renamed */
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              transform: scale(2);
              transform-origin: top right;
              z-index: 1;
            }
            .info-panel .temp { /* Renamed */
              font-family: 'Open Sans', sans-serif;
              font-size: 48px;
              line-height: 1; /* Adjusted for better visual spacing */
              margin-bottom: 4px;
            }
            .info-panel .desc { /* Renamed */
              font-family: 'Open Sans', sans-serif;
              font-size: 14px;
              text-transform: capitalize;
              margin-bottom: 4px;
            }
            .background-icon { /* Renamed */
              position: absolute;
              right: 20px;
              top: 0px;
              transform: scale(5) rotate(-5deg);
              opacity: 0.2; /* Reduced opacity */
              z-index: 0; /* Background icon */
            }
            .location-info { /* Renamed */
              display: flex;
              flex-direction: row;
              align-items: center;
            }
            .location-info .name-text { /* Renamed */
              font-family: 'Open Sans', sans-serif;
              font-size: 12px;
              text-transform: capitalize;
            }
            .location-info .marker-icon { /* Renamed */
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
                background: #358aed; /* Match widget background */
            }
            .weather-error {
                color: #ffdddd; /* Light red for error text on dark background */
            }
          `}
        </style>
      </div>
    );
  }
}

export default WeatherContent;
