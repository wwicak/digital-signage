/**
 * @fileoverview Slide component that given a slide type and its data renders it
 * along with its title and description.
 */

import React from 'react'
import GenericSlide, { GenericSlideProps } from './Generic'
import getVideoId from 'get-video-id'
import YouTube from 'react-youtube'

interface IYoutubeSlideProps extends GenericSlideProps {
  // Youtube slide specific props can be added here if needed
}

// YouTube player interface
interface YouTubePlayer {
  pauseVideo(): void
  playVideo(): void
  seekTo(seconds: number): void
}

interface YouTubeEvent {
  target: YouTubePlayer
}

class YoutubeSlide extends GenericSlide {
  private youtube: YouTubePlayer | null = null

  constructor(props: IYoutubeSlideProps) {
    super(props)
    this.youtube = null
  }

  handleYoutubeLoaded = (): void => {
    if (this.state.loading.resolve) {
      this.state.loading.resolve()
    } else {
      this.setState({ loaded: true })
    }
  }

  onYoutubeReady = (event: YouTubeEvent): void => {
    // access to player in all event handlers via event.target
    this.youtube = event.target
    this.handleYoutubeLoaded()
  }

  /**
   * Renders the inner content of the slide (ex. the photo, youtube iframe, etc)
   * @param data The slide's data (usually a URL or object ID)
   * @returns React component
   */
  renderSlideContent(data: string): React.ReactElement {
    const { id, service } = getVideoId(data)
    /* eslint-disable-next-line no-console */
    if (!id || service !== 'youtube') console.error('Failed to parse Youtube URL')
    
    return (
      <div className="w-full h-full min-h-full">
        <YouTube
          containerClassName="w-full h-full min-h-full"
          videoId={id || ''}
          opts={{
            /* eslint-disable camelcase */
            height: '100%',
            width: '100%',
            playerVars: {
              autoplay: 0,
              controls: 0,
              start: 0,
              cc_load_policy: 0,
              fs: 0,
              iv_load_policy: 3,
              modestbranding: 1,
              rel: 0,
              showinfo: 0
            }
            /* eslint-enable camelcase */
          }}
          onReady={this.onYoutubeReady}
        />
      </div>
    )
  }

  /**
   * Stops the slide's content from playing when the slide is out of focus
   */
  stop = (): void => {
    if (this.youtube) {
      this.youtube.pauseVideo()
      this.youtube.seekTo(0)
    }
  }

  /**
   * Starts or resumes the slide's content when the slide is in focus
   */
  play = (): void => {
    if (this.youtube) {
      this.youtube.playVideo()
    }
  }
}

export default YoutubeSlide
