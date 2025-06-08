/**
 * Comprehensive icon mapping from FontAwesome to Lucide React
 * This provides a centralized way to manage all icons in the application
 */

import * as React from 'react'
import {
  // Navigation & UI
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Settings,
  
  // Actions
  Edit,
  Trash2,
  Plus,
  Minus,
  Save,
  Download,
  Upload,
  Copy,
  Share,
  
  // Media & Content
  Play,
  Pause,
  Square as Stop,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Image,
  Video,
  Music,
  FileText,
  
  // Devices & Display
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  Wifi,
  WifiOff,
  
  // Layout & Grid
  Grid3X3,
  Grid2X2,
  Layout,
  Maximize,
  Minimize,
  
  // Status & Indicators
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Clock,
  Calendar,
  
  // User & Account
  User,
  Users,
  UserPlus,
  UserMinus,
  LogOut,
  LogIn,
  Key,
  
  // Communication
  Mail,
  MessageSquare,
  Phone,
  
  // Weather
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Zap,
  
  // Arrows & Direction
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  
  // Shapes & Symbols
  Circle,
  Square,
  Triangle,
  Star,
  Heart,
  
  // Files & Documents
  File,
  Folder,
  FolderOpen,
  
  // Technology
  Wifi as WifiIcon,
  Globe,
  Link,
  
  // Time
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  
  type LucideIcon
} from 'lucide-react'

// Icon mapping type
export type IconName = string
export type IconComponent = LucideIcon

// Comprehensive FontAwesome to Lucide mapping
export const iconMap: Record<string, IconComponent> = {
  // Navigation
  'faBars': Menu,
  'faMenu': Menu,
  'faTimes': X,
  'faClose': X,
  'faCaretDown': ChevronDown,
  'faChevronDown': ChevronDown,
  'faChevronUp': ChevronUp,
  'faChevronLeft': ChevronLeft,
  'faChevronRight': ChevronRight,
  'faEllipsisH': MoreHorizontal,
  'faCog': Settings,
  'faGear': Settings,
  
  // Actions
  'faEdit': Edit,
  'faPencil': Edit,
  'faPencilAlt': Edit,
  'faTrash': Trash2,
  'faTrashAlt': Trash2,
  'faPlus': Plus,
  'faMinus': Minus,
  'faSave': Save,
  'faDownload': Download,
  'faUpload': Upload,
  'faCopy': Copy,
  'faShare': Share,
  
  // Media
  'faPlay': Play,
  'faPause': Pause,
  'faStop': Stop,
  'faStepForward': SkipForward,
  'faStepBackward': SkipBack,
  'faVolumeUp': Volume2,
  'faVolumeMute': VolumeX,
  'faImage': Image,
  'faVideo': Video,
  'faMusic': Music,
  'faFileText': FileText,
  'faImages': Image,
  
  // Devices
  'faDesktop': Monitor,
  'faLaptop': Monitor,
  'faMobile': Smartphone,
  'faMobileAlt': Smartphone,
  'faTablet': Tablet,
  'faTabletAlt': Tablet,
  'faTv': Tv,
  'faWifi': Wifi,
  
  // Layout
  'faThLarge': Grid3X3,
  'faTh': Grid2X2,
  'faLayout': Layout,
  'faExpand': Maximize,
  'faCompress': Minimize,
  
  // Status
  'faCheckCircle': CheckCircle,
  'faTimesCircle': XCircle,
  'faExclamationCircle': AlertCircle,
  'faInfoCircle': Info,
  'faClock': Clock,
  'faCalendar': Calendar,
  'faCalendarAlt': Calendar,
  
  // User
  'faUser': User,
  'faUsers': Users,
  'faUserPlus': UserPlus,
  'faUserMinus': UserMinus,
  'faSignOut': LogOut,
  'faSignOutAlt': LogOut,
  'faSignIn': LogIn,
  'faSignInAlt': LogIn,
  'faKey': Key,
  
  // Communication
  'faEnvelope': Mail,
  'faComment': MessageSquare,
  'faPhone': Phone,
  
  // Weather
  'faSun': Sun,
  'faCloud': Cloud,
  'faCloudRain': CloudRain,
  'faSnowflake': CloudSnow,
  'faBolt': Zap,
  
  // Arrows
  'faArrowUp': ArrowUp,
  'faArrowDown': ArrowDown,
  'faArrowLeft': ArrowLeft,
  'faArrowRight': ArrowRight,
  
  // Shapes
  'faCircle': Circle,
  'faSquare': Square,
  'faStar': Star,
  'faHeart': Heart,
  
  // Files
  'faFile': File,
  'faFolder': Folder,
  'faFolderOpen': FolderOpen,
  
  // Technology
  'faGlobe': Globe,
  'faLink': Link,
  'faExternalLink': Link,
  
  // Misc
  'faEye': Monitor, // For "view" actions
  'faWindowRestore': Layout,
}

// Helper function to get icon component
export const getIcon = (iconName: string): IconComponent => {
  return iconMap[iconName] || Info // Default fallback icon
}

// Helper component for rendering icons
interface IconProps {
  name: string
  className?: string
  size?: number
}

export const Icon: React.FC<IconProps> = ({ name, className = "w-4 h-4", size }) => {
  const IconComponent = getIcon(name)
  const sizeClass = size ? `w-${size} h-${size}` : className

  return React.createElement(IconComponent, { className: sizeClass })
}

// Export commonly used icons for direct import
export {
  Menu,
  X,
  ChevronDown,
  Edit,
  Trash2,
  Plus,
  Play,
  Monitor,
  Smartphone,
  Grid3X3,
  Grid2X2,
  User,
  Settings,
  Wifi,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
}
