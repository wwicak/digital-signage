// FontAwesome v6 configuration
import { config, library } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css"; // Import the CSS

// Prevent FontAwesome from adding its CSS since we're importing it manually
config.autoAddCss = false;

// Import all the icons we need
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
  faExclamationTriangle,
  faTrash,
  faPencilAlt,
  faTimes,
  faCaretDown,
  faTv,
  faCheck,
  faAngleLeft,
  faWifi,
  faMapMarkerAlt,
  faEdit,
  faPlay,
  faGlobe,
  faFileImage,
  faFileVideo,
  faFileAlt,
  faEye,
  faLink,
  faCog,
  faThLarge,
  faTh,
} from "@fortawesome/free-solid-svg-icons";

import {
  faClock,
  faImages,
  faWindowRestore,
} from "@fortawesome/free-regular-svg-icons";

import { faChromecast } from "@fortawesome/free-brands-svg-icons";

// Add all icons to the library
library.add(
  // Solid icons
  faBolt,
  faSmog,
  faCloud,
  faSun,
  faCloudSun,
  faCloudRain,
  faCloudMoonRain,
  faSnowflake,
  faCloudMoon,
  faExclamationTriangle,
  faTrash,
  faPencilAlt,
  faTimes,
  faCaretDown,
  faTv,
  faCheck,
  faAngleLeft,
  faWifi,
  faMapMarkerAlt,
  faEdit,
  faPlay,
  faGlobe,
  faFileImage,
  faFileVideo,
  faFileAlt,
  faEye,
  faLink,
  faCog,
  faThLarge,
  faTh,
  // Regular icons
  faClock,
  faImages,
  faWindowRestore,
  // Brand icons
  faChromecast
);

export { config, library };
