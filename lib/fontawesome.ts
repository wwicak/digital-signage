import { Edit, X, Trash2, Plus, Minus, Eye, User, Settings, Key, Tv, Grid3X3, Grid2X2, Images, Image, Play, Pause, Stop, Clock, Calendar, ExternalLink, Download, Upload, Save, LogOut, ChevronDown, ChevronUp, Layout, Cast, Smartphone, Tablet, Monitor } from 'lucide-react'
// FontAwesome v6 configuration

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
