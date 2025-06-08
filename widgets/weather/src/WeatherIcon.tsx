import React, { Component } from 'react'
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Zap,
  CloudDrizzle,
  LucideIcon
} from 'lucide-react'

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
  convertIcon(iconCode: WeatherIconCode | undefined): LucideIcon {
    switch (iconCode) {
      case '01d':
        return Sun
      case '01n':
        return Sun // Use Sun for night clear as well
      case '02d':
        return Cloud
      case '02n':
        return Cloud
      case '03d':
      case '03n':
      case '04d':
      case '04n':
        return Cloud
      case '09d': // Shower rain
      case '10d': // Rain
        return CloudRain
      case '09n': // Shower rain night
      case '10n': // Rain night
        return CloudRain
      case '11d': // Thunderstorm
      case '11n':
        return Zap
      case '13d': // Snow
      case '13n':
        return CloudSnow
      case '50d': // Mist
      case '50n':
        return CloudDrizzle
      default:
        return Cloud // Default icon
    }
  }

  render() {
    const { icon } = this.props
    const IconComponent = this.convertIcon(icon)
    return <IconComponent className="w-8 h-8" />
  }
}

export default WeatherIcon