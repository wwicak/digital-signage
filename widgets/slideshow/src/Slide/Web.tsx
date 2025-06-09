/**
 * @fileoverview Slide component that given a slide type and its data renders it
 * along with its title and description.
 */

import React from 'react'
import GenericSlide, { GenericSlideProps } from './Generic'

interface IWebSlideProps extends GenericSlideProps {
  // Web slide specific props can be added here if needed
}

class WebSlide extends GenericSlide {
  constructor(props: IWebSlideProps) {
    super(props)
  }

  componentDidMount(): void {
    if (this.state.loading.resolve) {
      this.state.loading.resolve()
    }
  }

  /**
   * Renders the inner content of the slide (ex. the photo, youtube iframe, etc)
   * @param data The slide's data (usually a URL or object ID)
   * @returns React component
   */
  renderSlideContent(data: string): React.ReactElement {
    return (
      <div className='w-full h-full relative'>
        <iframe
          width='100%'
          height='100%'
          src={data}
          frameBorder='0'
          allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
          allowFullScreen
          title='Web content'
          className='absolute top-0 left-0 w-full h-full'
          onError={() => {
            // iframe error - might be due to X-Frame-Options or CSP restrictions
          }}
          onLoad={() => {
            // iframe loaded successfully
            if (this.state.loading.resolve) {
              this.state.loading.resolve();
            }
          }}
        />
      </div>
    )
  }

  /**
   * Stops the slide's content from playing when the slide is out of focus
   */
  stop = (): void => {
    // For web slides, we can pause the iframe by temporarily removing and restoring the src
    const iframe = document.querySelector('.slide-content iframe') as HTMLIFrameElement;
    if (iframe) {
      // Store the current src for restoration
      iframe.dataset.originalSrc = iframe.src;
      // Temporarily clear the src to stop any playing content
      iframe.src = 'about:blank';
    }
  }

  /**
   * Starts or resumes the slide's content when the slide is in focus
   */
  play = (): void => {
    // For web slides, restore the iframe src to resume content
    const iframe = document.querySelector('.slide-content iframe') as HTMLIFrameElement;
    if (iframe && iframe.dataset.originalSrc) {
      iframe.src = iframe.dataset.originalSrc;
      delete iframe.dataset.originalSrc;
    }
  }
}

export default WebSlide
