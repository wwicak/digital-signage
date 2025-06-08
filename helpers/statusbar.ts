import { Edit, X, Trash2, Plus, Minus, Eye, User, Settings, Key, Tv, Grid3X3, Grid2X2, Images, Image, Play, Pause, Stop, Clock, Calendar, ExternalLink, Download, Upload, Save, LogOut, ChevronDown, ChevronUp, Layout, Cast, Smartphone, Tablet, Monitor } from 'lucide-react'
import {
  faRss,
  faGripVertical,
  faClock,
  faCalendarAlt,
  /*
   * faWifi was used in Display/Frame.tsx for 'connection', ensure consistency or add both
   * For now, sticking to original icons in this file.
   */
} from '@fortawesome/free-solid-svg-icons'

config.autoAddCss = false
// Library add calls are fine here, they register icons globally for FontAwesome
library.add(faRss, faGripVertical, faClock, faCalendarAlt)

// Interface for the definition of a status bar element type
export interface IStatusBarElementDefinition {
  // 'type' field is implicit as it's the key in StatusBarElementTypes record
  name: string; // Display name for UI, e.g., in a selection dropdown
  icon: LucideIcon; // FontAwesome icon to represent this element type
  /*
   * Potentially add other properties if needed in the future,
   * e.g., a default component for rendering, or specific configuration options.
   */
}

// Record of available status bar element types
export const StatusBarElementTypes: Record<string, IStatusBarElementDefinition> = {
  time: {
    name: 'Time', // Capitalized for display
    icon: faClock ,
  },
  date: {
    name: 'Date', // Capitalized
    icon: faCalendarAlt ,
  },
  spacer: {
    /*
     * 'Spacer' might not be a good name if it's just an icon.
     * If it's a visual spacer, its rendering logic might be different.
     * For now, assuming it's an icon-based element.
     */
    name: 'Spacer / Handle', // Clarified name
    icon: faGripVertical ,
  },
  connection: {
    /*
     * Note: Display/Frame.tsx used faWifi for 'connection'.
     * The original statusbar.js used faRss. This needs to be consistent.
     * Assuming faRss is the intended icon for selection here.
     */
    name: 'Connection Status', // More descriptive name
    icon: faRss ,
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
