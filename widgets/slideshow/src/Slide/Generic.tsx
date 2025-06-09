/**
 * @fileoverview Slide component that given a slide type and its data renders it
 * along with its title and description.
 */

import React, { Component } from 'react'

interface SlideData {
  data: string;
  title?: string;
  description?: string;
}

export interface GenericSlideProps {
  slide: SlideData;
  show?: boolean;
}

interface LoadingState {
  promise: Promise<void>;
  resolve: (() => void) | null;
  reject: (() => void) | null;
  done: (() => void) | null;
}

export interface GenericSlideState {
  loading: LoadingState;
  loaded: boolean;
}

class GenericSlide extends Component<GenericSlideProps, GenericSlideState> {
  constructor(props: GenericSlideProps) {
    super(props)

    const loading: LoadingState = {
      promise: Promise.resolve(),
      resolve: null,
      reject: null,
      done: null
    }

    loading.promise = new Promise<void>((resolve, reject) => {
      loading.resolve = resolve
      loading.reject = reject
    }).then(() => this.setState({ loaded: true }))

    this.state = {
      loading: { ...loading },
      loaded: false
    }
  }

  componentDidMount(): void {
    if (this.state.loading.resolve) {
      this.state.loading.resolve()
    }
  }

  get loadedPromise(): Promise<void> {
    return this.state.loading.promise
  }

  get loaded(): boolean {
    return this.state.loaded
  }

  /**
   * Renders the inner content of the slide (ex. the photo, youtube iframe, etc)
   * @param data The slide's data (usually a URL or object ID)
   * @returns React element
   */
  renderSlideContent(data: string): React.ReactElement {
    return (
      <div className='w-full h-full text-center flex items-center justify-center'>
        {`Unknown slide type with data: ${data}`}
        
      </div>
    )
  }

  /**
   * Stops the slide's content from playing when the slide is out of focus
   */
  stop = (): void => {
    // Stop any playing content (videos, animations, etc.)
    const slideElement = document.querySelector('.slide-content');
    if (slideElement) {
      // Stop videos
      const videos = slideElement.querySelectorAll('video');
      videos.forEach(video => {
        video.pause();
      });
      
      // Stop iframes (YouTube, etc.)
      const iframes = slideElement.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        const src = iframe.src;
        iframe.src = '';
        iframe.src = src; // This will stop and reload the iframe
      });
      
      // Stop any CSS animations
      const animatedElements = slideElement.querySelectorAll('*');
      animatedElements.forEach(element => {
        (element as HTMLElement).style.animationPlayState = 'paused';
      });
    }
  }

  /**
   * Starts or resumes the slide's content when the slide is in focus
   */
  play = (): void => {
    // Resume any paused content (videos, animations, etc.)
    const slideElement = document.querySelector('.slide-content');
    if (slideElement) {
      // Play videos
      const videos = slideElement.querySelectorAll('video');
      videos.forEach(video => {
        video.play().catch(() => {
          // Video autoplay prevented
        });
      });
      
      // Resume CSS animations
      const animatedElements = slideElement.querySelectorAll('*');
      animatedElements.forEach(element => {
        (element as HTMLElement).style.animationPlayState = 'running';
      });
      
      // Note: iframes (YouTube) will auto-play based on their parameters
    }
  }

  /**
   * Renders the slide along with an overlayed title and description if given
   * @returns React element
   */
  render(): React.ReactElement {
    const { slide, show = false } = this.props
    const { data, title, description } = slide
    return (
      <div className={`slide-content inline-block h-full w-full absolute transition-opacity duration-500 ${show ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
        {this.renderSlideContent(data)}
        {(title || description) && (
          <div className='w-full absolute p-3 box-border pt-10 bg-black bg-opacity-50 text-white'>
            {title && <h1 className='text-2xl font-bold mb-2'>{title}</h1>}
            {description && <p className='text-lg'>{description}</p>}
          </div>
        )}
      </div>
    )
  }
}

export default GenericSlide