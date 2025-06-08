// types/manual-declarations.d.ts
declare module 'dotenv';
declare module 'next';
// declare module 'boxen'; // If boxen still causes issues with @types/boxen

// Fix for styled-jsx/server module
declare module 'styled-jsx/server' {
  export function flushToHTML(): any;
  export default function flush(): any
}

// Fix for react-easy-state Store import
declare module 'react-easy-state' {
  export function store<T extends object>(obj: T): T;
  export const Store: typeof store // Add Store as alias to store
  export function view<T extends React.ComponentType<any>>(component: T): T;
  export function batch(fn: () => void): void;
}

// Fix for react-dropzone FileRejection
declare module 'react-dropzone' {
  export interface FileRejection {
    file: File;
    errors: Array<{
      code: string;
      message: string;
    }>;
  }

  export interface DropEvent extends React.DragEvent<HTMLElement> {}

  export interface DropzoneOptions {
    accept?: string | string[] | Record<string, string[]>;
    multiple?: boolean;
    preventDropOnDocument?: boolean;
    noClick?: boolean;
    noKeyboard?: boolean;
    noDrag?: boolean;
    noDragEventsBubbling?: boolean;
    disabled?: boolean;
    onDrop?: (
      acceptedFiles: File[],
      fileRejections: FileRejection[],
      event: React.DragEvent<HTMLElement>
    ) => void;
    onDropAccepted?: (
      files: File[],
      event: React.DragEvent<HTMLElement>
    ) => void;
    onDropRejected?: (
      fileRejections: FileRejection[],
      event: React.DragEvent<HTMLElement>
    ) => void;
    getFilesFromEvent?: (
      event: React.DragEvent<HTMLElement>
    ) => Promise<File[]>;
    onFileDialogCancel?: () => void;
    validator?: (file: File) => { code: string; message: string } | null;
    useFsAccessApi?: boolean;
    autoFocus?: boolean;
    onError?: (err: Error) => void;
    maxFiles?: number;
    maxSize?: number;
    minSize?: number;
  }

  export interface DropzoneState {
    isFocused: boolean;
    isDragActive: boolean;
    isDragAccept: boolean;
    isDragReject: boolean;
    acceptedFiles: File[];
    fileRejections: FileRejection[];
  }

  export interface DropzoneRef {
    open: () => void;
  }

  export function useDropzone(options?: DropzoneOptions): DropzoneState & {
    getRootProps: (props?: any) => any;
    getInputProps: (props?: any) => any;
    open: () => void;
  };

  export default function Dropzone(
    props: DropzoneOptions & {
      children: (
        state: DropzoneState & {
          getRootProps: any;
          getInputProps: any;
          open: () => void;
        }
      ) => React.ReactNode;
    }
  ): React.ReactElement

  export type DropzoneProps = DropzoneOptions;
}

// Fix for react-youtube
declare module 'react-youtube' {
  export interface YouTubePlayer {
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    clearVideo(): void;
    getVideoLoadedFraction(): number;
    getPlayerState(): number;
    getCurrentTime(): number;
    getDuration(): number;
    getVideoUrl(): string;
    getVideoEmbedCode(): string;
    getPlaylist(): string[];
    getPlaylistIndex(): number;
    getVolume(): number;
    isMuted(): boolean;
    mute(): void;
    unMute(): void;
    setVolume(volume: number): void;
    setSize(width: number, height: number): void;
    getIframe(): HTMLIFrameElement;
    destroy(): void;
  }

  export interface YouTubeEvent {
    target: YouTubePlayer;
    data: number;
  }

  export interface YouTubeProps {
    videoId?: string;
    id?: string;
    className?: string;
    containerClassName?: string;
    opts?: {
      height?: string | number;
      width?: string | number;
      playerVars?: {
        autoplay?: 0 | 1;
        cc_load_policy?: 0 | 1;
        color?: 'red' | 'white';
        controls?: 0 | 1;
        disablekb?: 0 | 1;
        enablejsapi?: 0 | 1;
        end?: number;
        fs?: 0 | 1;
        hl?: string;
        iv_load_policy?: 1 | 3;
        list?: string;
        listType?: 'playlist' | 'search' | 'user_uploads';
        loop?: 0 | 1;
        modestbranding?: 0 | 1;
        origin?: string;
        playlist?: string;
        playsinline?: 0 | 1;
        rel?: 0 | 1;
        showinfo?: 0 | 1;
        start?: number;
        wmode?: 'transparent' | 'opaque';
        theme?: 'dark' | 'light';
      };
    };
    onReady?: (event: YouTubeEvent) => void;
    onPlay?: (event: YouTubeEvent) => void;
    onPause?: (event: YouTubeEvent) => void;
    onEnd?: (event: YouTubeEvent) => void;
    onError?: (event: YouTubeEvent) => void;
    onStateChange?: (event: YouTubeEvent) => void;
    onPlaybackQualityChange?: (event: YouTubeEvent) => void;
    onPlaybackRateChange?: (event: YouTubeEvent) => void;
  }

  export default class YouTube extends React.Component<YouTubeProps> {}
}

// Fix for ts-jest
declare module 'ts-jest' {
  export interface InitialOptions {
    preset?: string;
    globals?: Record<string, any>;
    transform?: Record<string, any>;
    testEnvironment?: string;
    setupFilesAfterEnv?: string[];
    moduleNameMapping?: Record<string, string>;
    collectCoverageFrom?: string[];
    testMatch?: string[];
    testPathIgnorePatterns?: string[];
    moduleFileExtensions?: string[];
    transformIgnorePatterns?: string[];
  }
}

// Fix for FontAwesome icon type conflicts
declare module '@fortawesome/react-fontawesome' {
  
  export type  =  | string;

  export interface Lucides {
    icon: ;
    size?:
      | 'xs'
      | 'sm'
      | 'lg'
      | '1x'
      | '2x'
      | '3x'
      | '4x'
      | '5x'
      | '6x'
      | '7x'
      | '8x'
      | '9x'
      | '10x';
    fixedWidth?: boolean;
    color?: string;
    className?: string;
    style?: React.CSSProperties;
  }

  export function (
    props: Lucides
  ): React.ReactElement;
}

declare module '@fortawesome/fontawesome-svg-core' {
  
  export type  =  | string;
  export type IconPrefix = string;

  // Re-export  for convenience
  export {  }

  export interface Config {
    autoAddCss: boolean;
    autoReplaceSvg: boolean;
    observeMutations: boolean;
    keepOriginalSource: boolean;
    familyPrefix: string;
    replacementClass: string;
    autoA11y: boolean;
    searchPseudoElements: boolean;
    showMissingIcons: boolean;
  }

  export interface Library {
    add(...icons: ( | Record<string, >)[]): void;
  }

  export const library: Library
  export const config: Config
}

/*
 * Make all FontAwesome icons compatible
 * Make all FontAwesome icons compatible
 */
declare module '@fortawesome/free-solid-svg-icons' {
  
  export const faClock: 
  export const faEdit: 
  export const faTrash: 
  export const faTimes: 
  export const faPencilAlt: 
  export const faTh: 
  export const faThLarge: 
  export const faRss: 
  export const faGripVertical: 
  export const faCalendarAlt: 
  export const faSun: 
  export const faCloudSun: 
  export const faCloudMoon: 
  export const faCloud: 
  export const faCloudRain: 
  export const faCloudMoonRain: 
  export const faBolt: 
  export const faSnowflake: 
  export const faSmog: 
  export const faWifi: 
  export const faMapMarkerAlt: 
  export const faExclamationTriangle: 
  export const faPlay: 
  export const faGlobe: 
  export const faFileImage: 
  export const faFileVideo: 
  export const faFileAlt: 
  export const faTv: 
  export const faCheck: 
  export const faAngleLeft: 
  export const faFont: 
  export const faList: 
  export const faMousePointer: 
  export const faCalendar: 
  export const faCog: 
  export const faEye: 
  export const faLink: 
  export const faKey: 
  export const faImages: 
  export const faSignOutAlt: 
  export const faCaretDown: 
  export const faGifts: 
  export const faImage: 
  export const faListUl: 

  // Re-export  for convenience
  export {  }

  // Export icon pack
  export const fas: Record<string, >

  // Export all other icons as 
  const icons: Record<string, >
  export = icons;
}
declare module '@fortawesome/free-brands-svg-icons' {
  
  export const faChromecast: 
  export const faYoutube: 

  export const fab: Record<string, >

  const icons: Record<string, >
  export = icons;
}

declare module '@fortawesome/free-regular-svg-icons' {
  
  export const faClock: 
  export const faWindowRestore: 
  export const faImages: 

  const icons: Record<string, >
  export = icons;
}
