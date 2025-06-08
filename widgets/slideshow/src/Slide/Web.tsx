/**
 * @fileoverview Slide component that given a slide type and its data renders it
 * along with its title and description.
 */

import React from 'react'
import GenericSlide, { IGenericSlideProps } from './Generic'

interface IWebSlideProps extends IGenericSlideProps {
  // Web slide specific props can be added here if needed
}

class WebSlide extends GenericSlide<IWebSlideProps> {
  constructor(props: IWebSlideProps) {
    super(props)
  }

  componentDidMount(): void {
    this.state.loading.resolve()
  }

  /**
   * Renders the inner content of the slide (ex. the photo, youtube iframe, etc)
   * @param data The slide's data (usually a URL or object ID)
   * @returns React component
   */
  renderSlideContent(data: string): React.ReactElement {
    return (
      <iframe
        width="100%"
        height="100%"
        src={data}
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Web content"
      />
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

export default WebSlide
