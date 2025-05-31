import React, { Component } from 'react'
import Lottie, { LottieProps, Options as LottieOptions } from 'react-lottie'
import { config } from '@fortawesome/fontawesome-svg-core'
import AutoScroll from '../../../components/AutoScroll'
import * as z from 'zod'
import { CongratsWidgetContentDataSchema, ICongratsWidgetData } from './types'
import { animationUtils } from './animationUtils' // Import the utility

config.autoAddCss = false

export const CongratsContentPropsSchema = z.object({
  data: CongratsWidgetContentDataSchema.optional(),
  isPreview: z.boolean().optional(),
})
export type ICongratsContentProps = z.infer<typeof CongratsContentPropsSchema>;

const DEFAULT_COLOR = '#34495e'
const DEFAULT_TEXT_COLOR = '#ffffff'
const DEFAULT_ANIMATION = 'confetti' // Default animation style name
const DEFAULT_TEXT = 'Congratulations!'
const DEFAULT_FONT_SIZE = 16

// getAnimationData function has been moved to animationUtils.ts

class CongratsContent extends Component<ICongratsContentProps> {
  render() {
    const { data = {} } = this.props
    const text = data.text ?? DEFAULT_TEXT
    const textColor = data.textColor ?? DEFAULT_TEXT_COLOR
    const animationName = data.animation ?? DEFAULT_ANIMATION
    const fontSize = data.fontSize ?? DEFAULT_FONT_SIZE
    const color = data.color ?? DEFAULT_COLOR

    // Use animationUtils to get animation data
    const animationData = animationUtils.getAnimationData(animationName)

    const lottieOptions: LottieOptions = {
      loop: true,
      autoplay: true,
      animationData: animationData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid slice',
      },
    }

    return (
      <div className='congrats-widget-content'>
        {animationData && (
          <div className='background-animation'>
            <Lottie options={lottieOptions} height={'100%'} width={'100%'} />
          </div>
        )}
        <AutoScroll style={{ display: 'block', flex: 1, overflowY: 'auto', minHeight:0, zIndex: 1 }}>
          <div className='text-content' style={{ fontSize: `${fontSize}px` }}>
            {text.split('\n').map((line, index) => (
              <div key={`line-${index}`}>{line || <br />}</div>
            ))}
          </div>
        </AutoScroll>
        <style jsx>
          {`
            .congrats-widget-content {
              position: relative;
              box-sizing: border-box;
              height: 100%;
              width: 100%;
              background: ${color};
              color: ${textColor};
              flex: 1;
              font-family: 'Open Sans', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              overflow: hidden;
            }
            .congrats-widget-content .background-animation {
              width: 100%;
              height: 100%;
              position: absolute;
              top: 0;
              left: 0;
              z-index: 0;
            }
            .congrats-widget-content .text-content {
              font-family: 'Open Sans', sans-serif;
              padding: 16px;
              font-weight: 600;
              text-align: center;
              z-index: 1;
              word-break: break-word;
              min-height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              box-sizing: border-box;
              width: 100%;
            }
          `}
        </style>
      </div>
    )
  }
}

export default CongratsContent
