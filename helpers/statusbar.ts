import { Clock, Calendar, GripVertical, Wifi, LucideIcon } from 'lucide-react'

// Interface for the definition of a status bar element type
export interface IStatusBarElementDefinition {
  // 'type' field is implicit as it's the key in StatusBarElementTypes record
  name: string; // Display name for UI, e.g., in a selection dropdown
  icon: LucideIcon; // Lucide icon to represent this element type
  /*
   * Potentially add other properties if needed in the future,
   * e.g., a default component for rendering, or specific configuration options.
   */
}

// Record of available status bar element types
export const StatusBarElementTypes: Record<string, IStatusBarElementDefinition> = {
  time: {
    name: 'Time',
    icon: Clock,
  },
  date: {
    name: 'Date',
    icon: Calendar,
  },
  spacer: {
    name: 'Spacer / Handle',
    icon: GripVertical,
  },
  connection: {
    name: 'Connection Status',
    icon: Wifi,
  },
  /*
   * Example of adding a new one:
   * weather: {
   *   name: 'Current Weather',
   *   icon: faCloudSun ,
   * }
   */
}

// For convenience, an array of choices for UI dropdowns can be generated
export interface IStatusBarElementChoice {
  id: string; // The type key, e.g., "time"
  label: string; // The display name, e.g., "Time"
  icon: LucideIcon;
}

export const statusBarElementChoices: IStatusBarElementChoice[] = Object.keys(StatusBarElementTypes).map(typeKey => ({
    id: typeKey,
    label: StatusBarElementTypes[typeKey].name,
    icon: StatusBarElementTypes[typeKey].icon,
}))
