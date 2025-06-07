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
      <div className='slide-content unknown'>
        {`Unknown slide type with data: ${data}`}
        <style jsx>{`
          .slide-content.unknown {
            width: 100%;
            height: 100%;
            background: #ebebeb;
            color: #333;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
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
        video.play().catch(error => {
          console.log('Video autoplay prevented:', error);
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
    const { loaded } = this.state
    return (
      <div className='slide'>
        {this.renderSlideContent(data)}
        {(title || description) && (
          <div className='info'>
            {title && <h1>{title}</h1>}
            {description && <p>{description}</p>}
          </div>
        )}
        <style jsx>{`
          .info {
            width: 100%;
            position: absolute;
            bottom: 0;
            padding: 10px;
            background-image: linear-gradient(
              -180deg,
              rgba(0, 0, 0, 0) 0%,
              rgba(0, 0, 0, 0.5) 100%
            );
            box-sizing: border-box;
            padding-top: 40px;
            pointer-events: none;
          }
          .info h1 {
            margin: 0;
            margin-bottom: 10px;
            color: #ffffff;
            font-family: Open Sans, sans-serif;
            font-weight: 700;
            font-size: 22px;
            text-shadow: 0px 0px 16px rgba(0, 0, 0, 0.5);
          }
          .info p {
            margin: 0;
            margin-bottom: 10px;
            color: #ffffff;
            font-family: Open Sans, sans-serif;
            font-weight: 400;
            font-size: 16px;
            flex: 1;
            text-shadow: 0px 0px 16px rgba(0, 0, 0, 0.5);
          }
          .slide {
            display: inline-block;
            height: 100%;
            width: 100%;
            position: absolute;
            opacity: ${show ? 1 : 0};
            filter: ${loaded ? 'none' : 'blur(40px)'};
            transition: all 0.4s;
          }
        `}</style>
      </div>
    )
  }
}

export default GenericSlide
