/**
 * @fileoverview Video slide component for handling video content in slideshows
 */

import React from 'react'
import GenericSlide, { GenericSlideProps } from './Generic'

interface IVideoSlideProps extends GenericSlideProps {
  // Video slide specific props can be added here if needed
}

class VideoSlide extends GenericSlide {
  private video: React.RefObject<HTMLVideoElement | null>

  constructor(props: IVideoSlideProps) {
    super(props)
    this.video = React.createRef()
  }

  componentDidMount(): void {
    super.componentDidMount()
    if (this.video.current) {
      this.video.current.addEventListener('loadeddata', this.handleVideoLoaded)
      this.video.current.addEventListener('error', this.handleVideoError)
    }
  }

  componentWillUnmount(): void {
    if (this.video.current) {
      this.video.current.removeEventListener('loadeddata', this.handleVideoLoaded)
      this.video.current.removeEventListener('error', this.handleVideoError)
    }
  }

  handleVideoLoaded = (): void => {
    if (this.state.loading.resolve) {
      this.state.loading.resolve()
    } else {
      this.setState({ loaded: true })
    }
  }

  handleVideoError = (): void => {
    if (this.state.loading.reject) {
      this.state.loading.reject()
    } else {
      this.setState({ loaded: false })
    }
  }

  /**
   * Renders the inner content of the slide (video element)
   * @param data The slide's data (video URL)
   * @returns React element
   */
  renderSlideContent(data: string): React.ReactElement {
    return (
      <div className='w-full h-full relative overflow-hidden bg-black'>
        <video
          ref={this.video}
          className='w-full h-full object-cover'
          src={data}
          muted
          loop
          playsInline
          preload='metadata'
          onLoadedData={this.handleVideoLoaded}
          onError={this.handleVideoError}
        >
          <source src={data} />
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  /**
   * Stops the slide's content from playing when the slide is out of focus
   */
  stop = (): void => {
    if (this.video.current) {
      this.video.current.pause()
      this.video.current.currentTime = 0
    }
  }

  /**
   * Starts or resumes the slide's content when the slide is in focus
   */
  play = (): void => {
    if (this.video.current) {
      this.video.current.play().catch(() => {
        // Video autoplay prevented - this is expected in many browsers
      })
    }
  }
}

export default VideoSlide
