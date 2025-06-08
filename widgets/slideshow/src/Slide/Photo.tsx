/**
 * @fileoverview Slide component that given a slide type and its data renders it
 * along with its title and description.
 */

import GenericSlide, { GenericSlideProps } from './Generic'
import React from 'react'
import Image from 'next/image'

class PhotoSlide extends GenericSlide {
  private image: React.RefObject<HTMLImageElement | null>

  constructor(props: GenericSlideProps) {
    super(props)
    this.image = React.createRef()
  }

  componentDidMount(): void {
    super.componentDidMount()
    if (this.image && this.image.current && this.image.current.complete) {
      this.handleImageLoaded()
    }
  }

  handleImageLoaded = (): void => {
    this.state.loading.resolve
      ? this.state.loading.resolve()
      : this.setState({ loading: { ...this.state.loading, promise: Promise.resolve() } })
  }

  handleImageErrored = (): void => {
    this.state.loading.reject
      ? this.state.loading.reject()
      : this.setState({ loading: { ...this.state.loading, promise: Promise.reject() } })
  }

  /**
   * Renders the inner content of the slide (ex. the photo, youtube iframe, etc)
   * @param data The slide's data (usually a URL or object ID)
   * @returns React element
   */
  renderSlideContent(data: string): React.ReactElement {
    return (
      <div className="w-full h-full relative">
        <div
          className="absolute"
          style={{
            backgroundImage: `url(${data})`
          }}
        />
        <div
          className="w-full h-full absolute"
          style={{
            backgroundImage: `url(${data})`
          }}
        />
        <Image
          src={data}
          alt='Slide photo'
          width={1}
          height={1}
          className="w-0 h-0 hidden"
          onLoad={this.handleImageLoaded.bind(this)}
          onError={this.handleImageErrored.bind(this)}
          ref={this.image}
          unoptimized={true}
        />
        
      </div>
    )
  }

  /**
   * Stops the slide's content from playing when the slide is out of focus
   */
  stop = (): void => {}

  /**
   * Starts or resumes the slide's content when the slide is in focus
   */
  play = (): void => {}
}

export default PhotoSlide