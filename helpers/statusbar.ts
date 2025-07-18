import { library, config, IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faRss,
  faGripVertical,
  faClock,
  faCalendarAlt,
  // faWifi was used in Display/Frame.tsx for 'connection', ensure consistency or add both
  // For now, sticking to original icons in this file.
} from '@fortawesome/free-solid-svg-icons';

config.autoAddCss = false;
// Library add calls are fine here, they register icons globally for FontAwesome
library.add(faRss, faGripVertical, faClock, faCalendarAlt);

// Interface for the definition of a status bar element type
export interface IStatusBarElementDefinition {
  // 'type' field is implicit as it's the key in StatusBarElementTypes record
  name: string; // Display name for UI, e.g., in a selection dropdown
  icon: IconProp; // FontAwesome icon to represent this element type
  // Potentially add other properties if needed in the future,
  // e.g., a default component for rendering, or specific configuration options.
}

// Record of available status bar element types
export const StatusBarElementTypes: Record<string, IStatusBarElementDefinition> = {
  time: {
    name: 'Time', // Capitalized for display
    icon: faClock as IconProp,
  },
  date: {
    name: 'Date', // Capitalized
    icon: faCalendarAlt as IconProp,
  },
  spacer: {
    // 'Spacer' might not be a good name if it's just an icon.
    // If it's a visual spacer, its rendering logic might be different.
    // For now, assuming it's an icon-based element.
    name: 'Spacer / Handle', // Clarified name
    icon: faGripVertical as IconProp,
  },
  connection: {
    // Note: Display/Frame.tsx used faWifi for 'connection'.
    // The original statusbar.js used faRss. This needs to be consistent.
    // Assuming faRss is the intended icon for selection here.
    name: 'Connection Status', // More descriptive name
    icon: faRss as IconProp,
  },
  // Example of adding a new one:
  // weather: {
  //   name: 'Current Weather',
  //   icon: faCloudSun as IconProp,
  // }
};

// For convenience, an array of choices for UI dropdowns can be generated
export interface IStatusBarElementChoice {
  id: string; // The type key, e.g., "time"
  label: string; // The display name, e.g., "Time"
  icon: IconProp;
}

export const statusBarElementChoices: IStatusBarElementChoice[] = Object.keys(StatusBarElementTypes).map(typeKey => ({
    id: typeKey,
    label: StatusBarElementTypes[typeKey].name,
    icon: StatusBarElementTypes[typeKey].icon,
}));
