import React, { Component } from 'react'
import {
  faBolt,
  faSmog,
  faCloud,
  faSun,
  faCloudSun,
  faCloudRain,
  faCloudMoonRain,
  faSnowflake,
  faCloudMoon,
} from '@fortawesome/free-solid-svg-icons'

// Define a type for the weather icon codes for better type safety
type WeatherIconCode =
  | '01d' | '01n'
  | '02d' | '02n'
  | '03d' | '03n' | '04d' | '04n'
  | '09d' | '10d'
  | '09n' | '10n'
  | '11d' | '11n'
  | '13d' | '13n'
  | '50d' | '50n'
  | string; // Fallback for any other string, though specific codes are better

interface Weathers {
  icon?: WeatherIconCode; // Make icon prop optional as in original code (defaulted to '')
}

interface WeatherIconState {} // No state used

class WeatherIcon extends Component<Weathers, WeatherIconState> {
  convertIcon(iconCode: WeatherIconCode | undefined):  {
    switch (iconCode) {
      case '01d':
        return faSun
      case '01n': // Typically night clear, might use faMoon if available and distinct
        return faCloudSun // Original was faCloudSun, consider faMoon if theme supports night icons
      case '02d':
        return faCloudSun
      case '02n':
        return faCloudMoon
      case '03d':
      case '03n':
      case '04d':
      case '04n':
        return faCloud
      case '09d': // Shower rain
      case '10d': // Rain
        return faCloudRain
      case '09n': // Shower rain night
      case '10n': // Rain night
        return faCloudMoonRain
      case '11d': // Thunderstorm
      case '11n':
        return faBolt
      case '13d': // Snow
      case '13n':
        return faSnowflake
      case '50d': // Mist
      case '50n':
        return faSmog
      default:
        return faCloud // Default icon
    }
  }

  render() {
    const { icon } = this.props // icon will be undefined if not provided, matching original default of ''
    return <<this.convertIcon(icon) className={'2x' className="w-4 h-4" /> />
  }
}

export default WeatherIcon
