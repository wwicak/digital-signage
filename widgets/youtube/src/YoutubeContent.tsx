import React, { Component } from 'react'
import { config as FaConfig } from '@fortawesome/fontawesome-svg-core' // Only config is used
import getVideoId from 'get-video-id' // Assuming @types/get-video-id or it returns any
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube' // Import YouTube component and its types

import { IYoutubeDefaultData } from '../index' // This is an interface
import * as z from 'zod'

FaConfig.autoAddCss = false

// Zod schema for IYoutubeDefaultData (used in props.data)
export const YoutubeWidgetDataSchema = z.object({
  video_id: z.string().nullable(),
  autoplay: z.boolean().optional(),
  loop: z.boolean().optional(),
  show_controls: z.boolean().optional(),
  start_time: z.number().optional(),
  end_time: z.number().optional(),
  show_captions: z.boolean().optional(),
})
export type IYoutubeWidgetData = z.infer<typeof YoutubeWidgetDataSchema>; // For internal consistency

// Zod schema for YoutubeContent component props
export const YoutubeContentPropsSchema = z.object({
  data: YoutubeWidgetDataSchema.optional(),
  isPreview: z.boolean().optional(),
  /*
   * style: z.record(z.any()).optional(), // For React.CSSProperties if needed
   * className: z.string().optional(),
   */
})
export type IYoutubeContentProps = z.infer<typeof YoutubeContentPropsSchema>;

// Default values from original JS, though IYoutubeDefaultData has its own defaults
const DEFAULT_YT_URL_FOR_ID_EXTRACTION = 'https://www.youtube.com/watch?v=9xwazD5SyVg'
// const DEFAULT_BG_COLOR = '#95a5a6'; // This color was for the widget frame, not really for YT player area

class YoutubeContent extends Component<IYoutubeContentProps> {
  // The iframe ref from original JS was unused as react-youtube manages its own iframe.
  private player: YouTubePlayer | null = null

  constructor(props: IYoutubeContentProps) {
    super(props)
  }

  onPlayerReady: YouTubeProps['onReady'] = (event) => {
    // Access to player in all event handlers via event.target
    this.player = event.target
    /*
     * Example: Mute video if not autoplaying or for preview
     * if (!this.props.data?.autoplay || this.props.isPreview) {
     *   event.target.mute();
     * }
     */
  }
  
  // Add other event handlers if needed, e.g., onEnd for looping
  onPlayerEnd: YouTubeProps['onEnd'] = (event) => {
    if (this.props.data?.loop) {
      event.target.seekTo(this.props.data?.start_time || 0)
      event.target.playVideo()
    }
  }


  render() {
    const { data } = this.props
    // Use defaults from IYoutubeDefaultData defined in ../index.ts via props.data
    const {
      video_id = null, // This is the primary field now
      autoplay = true,
      loop = false, // Loop is handled by onEnd + seekTo + playVideo
      show_controls = true,
      start_time = 0,
      end_time = 0, // 0 means play to end
      show_captions = false,
      /*
       * title and color from original JS data are less relevant here.
       * If a title bar is needed, it should be a separate element.
       */
    } = data || {}

    /*
     * The original JS used getVideoId(url). Now, video_id is directly configured.
     * If a URL were still primary, extraction would be:
     * const extracted = video_url ? getVideoId(video_url) : null;
     * const currentVideoId = extracted && extracted.service === 'youtube' ? extracted.id : null;
     */
    const currentVideoId = video_id


    const playerOpts: YouTubeProps['opts'] = {
      /*
       * height and width are set by the container typically, or can be fixed
       * height: '100%', // These might be overridden by react-youtube's default internal styling or props.style
       * width: '100%',
       */
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        controls: show_controls ? 1 : 0,
        start: start_time || 0,
        end: end_time || undefined, // undefined means play to end
        loop: loop ? 1 : 0, // For YouTube's native loop (plays single video again)
        playlist: loop ? currentVideoId || undefined : undefined, // Required for 'loop:1' to work on single video
        cc_load_policy: show_captions ? 1 : 0, // Show/hide closed captions
        fs: 1, // Allow fullscreen (default is 1, 0 to disable)
        iv_load_policy: 3, // Do not show video annotations (default is 1)
        modestbranding: 1, // Prevent YouTube logo in control bar (doesn't always work)
        rel: 0, // Do not show related videos when playback ends
        showinfo: 0, // Hide video title and uploader before playback starts
      },
    }

    /*
     * The background color from props.data.color was for the widget frame,
     * YouTube player itself is black or shows video content.
     * If a title bar is desired, it should be explicitly added outside the YouTube component.
     */

    return (
      <div className='youtube-widget-content'>
        {/* Optional: Title bar if needed, similar to other widgets */}
        {/* {data.title && <div className='widget-title'>{data.title}</div>} */}

        <div className='youtube-iframe-container'> {/* Renamed class */}
          {!currentVideoId ? (
            <div className='youtube-error-message'>Invalid or missing YouTube Video ID.</div>
          ) : (
            <YouTube
              videoId={currentVideoId}
              opts={playerOpts}
              className={'youtube-player-iframe'} // For styling the iframe wrapper
              containerClassName={'youtube-player-container'} // For styling the outer container div
              onReady={this.onPlayerReady}
              onEnd={this.onPlayerEnd}
              // Add other event handlers as needed: onError, onStateChange, onPlaybackRateChange, etc.
            />
          )}
        </div>
        {/* Global styles for react-youtube might be needed if its defaults are too restrictive */}
        <style jsx global>{`
          .youtube-player-container, 
          .youtube-player-iframe {
            width: 100%;
            height: 100%;
          }
        `}</style>
        <style jsx>
          {`
            .youtube-widget-content {
              position: relative;
              box-sizing: border-box;
              height: 100%;
              width: 100%;
              background: #000000; /* Black background for cinematic feel */
              flex: 1; /* Fill parent if flex item */
              display: flex; /* Use flex to manage layout if title bar is added */
              flex-direction: column;
              overflow: hidden; /* Prevent content spill */
            }
            .youtube-iframe-container { /* Renamed */
              flex: 1; /* Take available space */
              border: none;
              overflow: hidden; /* Ensure no scrollbars from iframe itself */
              min-height: 0; /* Important for flex children that need to scroll/be constrained */
            }
            .youtube-error-message {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: white;
                font-family: 'Open Sans', sans-serif;
                padding: 20px;
                text-align: center;
            }
            /* Example for a title bar if added: */
            /*
            .widget-title {
              padding: 12px;
              font-family: 'Open Sans', sans-serif;
              font-size: 16px;
              font-weight: 600;
              color: white;
              background-color: rgba(0,0,0,0.5);
              text-transform: uppercase;
              z-index: 1;
            }
            */
          `}
        </style>
      </div>
    )
  }
}

export default YoutubeContent
