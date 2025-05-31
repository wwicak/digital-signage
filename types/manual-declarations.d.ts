// types/manual-declarations.d.ts
declare module "dotenv";
declare module "next";
// declare module 'boxen'; // If boxen still causes issues with @types/boxen

// Fix for styled-jsx/server module
declare module "styled-jsx/server" {
  export function flushToHTML(): any;
  export default function flush(): any;
}

// Fix for react-easy-state Store import
declare module "react-easy-state" {
  export function store<T extends object>(obj: T): T;
  export const Store: typeof store; // Add Store as alias to store
  export function view<T extends React.ComponentType<any>>(component: T): T;
  export function batch(fn: () => void): void;
}

// Fix for react-dropzone FileRejection
declare module "react-dropzone" {
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
  ): React.ReactElement;

  export type DropzoneProps = DropzoneOptions;
}

// Fix for react-youtube
declare module "react-youtube" {
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
        color?: "red" | "white";
        controls?: 0 | 1;
        disablekb?: 0 | 1;
        enablejsapi?: 0 | 1;
        end?: number;
        fs?: 0 | 1;
        hl?: string;
        iv_load_policy?: 1 | 3;
        list?: string;
        listType?: "playlist" | "search" | "user_uploads";
        loop?: 0 | 1;
        modestbranding?: 0 | 1;
        origin?: string;
        playlist?: string;
        playsinline?: 0 | 1;
        rel?: 0 | 1;
        showinfo?: 0 | 1;
        start?: number;
        wmode?: "transparent" | "opaque";
        theme?: "dark" | "light";
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
declare module "ts-jest" {
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
declare module "@fortawesome/react-fontawesome" {
  import { IconDefinition } from "@fortawesome/fontawesome-common-types";

  export type IconProp = IconDefinition | string;

  export interface FontAwesomeIconProps {
    icon: IconProp;
    size?:
      | "xs"
      | "sm"
      | "lg"
      | "1x"
      | "2x"
      | "3x"
      | "4x"
      | "5x"
      | "6x"
      | "7x"
      | "8x"
      | "9x"
      | "10x";
    fixedWidth?: boolean;
    color?: string;
    className?: string;
    style?: React.CSSProperties;
  }

  export function FontAwesomeIcon(
    props: FontAwesomeIconProps
  ): React.ReactElement;
}

declare module "@fortawesome/fontawesome-svg-core" {
  import { IconDefinition } from "@fortawesome/fontawesome-common-types";

  export type IconProp = IconDefinition | string;
  export type IconPrefix = string;

  // Re-export IconDefinition for convenience
  export { IconDefinition };

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
    add(...icons: (IconDefinition | Record<string, IconDefinition>)[]): void;
  }

  export const library: Library;
  export const config: Config;
}

// Make all FontAwesome icons compatible
// Make all FontAwesome icons compatible
declare module "@fortawesome/free-solid-svg-icons" {
  import { IconDefinition } from "@fortawesome/fontawesome-common-types";

  export const faClock: IconDefinition;
  export const faEdit: IconDefinition;
  export const faTrash: IconDefinition;
  export const faTimes: IconDefinition;
  export const faPencilAlt: IconDefinition;
  export const faTh: IconDefinition;
  export const faThLarge: IconDefinition;
  export const faRss: IconDefinition;
  export const faGripVertical: IconDefinition;
  export const faCalendarAlt: IconDefinition;
  export const faSun: IconDefinition;
  export const faCloudSun: IconDefinition;
  export const faCloudMoon: IconDefinition;
  export const faCloud: IconDefinition;
  export const faCloudRain: IconDefinition;
  export const faCloudMoonRain: IconDefinition;
  export const faBolt: IconDefinition;
  export const faSnowflake: IconDefinition;
  export const faSmog: IconDefinition;
  export const faWifi: IconDefinition;
  export const faMapMarkerAlt: IconDefinition;
  export const faExclamationTriangle: IconDefinition;
  export const faPlay: IconDefinition;
  export const faGlobe: IconDefinition;
  export const faFileImage: IconDefinition;
  export const faFileVideo: IconDefinition;
  export const faFileAlt: IconDefinition;
  export const faTv: IconDefinition;
  export const faCheck: IconDefinition;
  export const faAngleLeft: IconDefinition;
  export const faFont: IconDefinition;
  export const faList: IconDefinition;
  export const faMousePointer: IconDefinition;
  export const faCalendar: IconDefinition;
  export const faCog: IconDefinition;
  export const faEye: IconDefinition;
  export const faLink: IconDefinition;
  export const faKey: IconDefinition;
  export const faImages: IconDefinition;
  export const faSignOutAlt: IconDefinition;
  export const faCaretDown: IconDefinition;
  export const faGifts: IconDefinition;
  export const faImage: IconDefinition;
  export const faListUl: IconDefinition;

  // Re-export IconDefinition for convenience
  export { IconDefinition };

  // Export icon pack
  export const fas: Record<string, IconDefinition>;

  // Export all other icons as IconDefinition
  const icons: Record<string, IconDefinition>;
  export = icons;
}
declare module "@fortawesome/free-brands-svg-icons" {
  import { IconDefinition } from "@fortawesome/fontawesome-common-types";

  export const faChromecast: IconDefinition;
  export const faYoutube: IconDefinition;

  export const fab: Record<string, IconDefinition>;

  const icons: Record<string, IconDefinition>;
  export = icons;
}

declare module "@fortawesome/free-regular-svg-icons" {
  import { IconDefinition } from "@fortawesome/fontawesome-common-types";

  export const faClock: IconDefinition;
  export const faWindowRestore: IconDefinition;
  export const faImages: IconDefinition;

  const icons: Record<string, IconDefinition>;
  export = icons;
}
