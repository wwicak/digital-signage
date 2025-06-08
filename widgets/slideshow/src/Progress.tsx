/**
 * @fileoverview Progress bar component that shows which slide
 * is the currently displayed slide.
 */

import React, { Component } from 'react'

interface Slide {
  // Define other properties of a slide object if they exist and are used
  duration?: number; // Optional duration in seconds for this specific slide
  // Example: id: string; content: string;
}

interface ProgressProps {
  current: number;
  defaultDuration: number; // Assuming this is in milliseconds if slide.duration is in seconds
  orderedSlides: Slide[];
  ready: boolean;
}

interface ProgressState {} // No state used

class Progress extends Component<ProgressProps, ProgressState> {
  render() {
    const { current, defaultDuration, orderedSlides, ready } = this.props
    return (
      <div className='progress-bar'>
        {orderedSlides.map((slide, i) => (
          <div key={`slide-${i}` className={`progress-segment ${i < current ? 'active' : ''}`}>
            <div
              className={'progress-segment-content'}
              style={{
                width: i === current && ready ? '100%' : '0%',
                transition:
                  i === current && ready
                    ? `all linear ${slide.duration || defaultDuration / 1000}s`
                    : 'none',
              }}
            />
          </div>
        ))}
        <style jsx>
          {`
            .progress-segment {
              height: 4px;
              border-radius: 4px;
              background: rgba(255, 255, 255, 0.4);
              margin: 2px;
              flex: 1;
            }
            .progress-segment.active {
              background: white;
            }
            .progress-segment-content {
              width: 0%; /* Initial state for transition */
              height: 100%;
              border-radius: 4px;
              background: white;
              /* transition: all linear 5s; */ /* This was commented out as it's dynamically set */
            }
            .progress-bar {
              display: flex;
              flex-direction: row;
              width: 100%;
              position: absolute;
              bottom: 0;
              left: 0;
            }
          `}
        </style>
      </div>
    )
  }
}

export default Progress
