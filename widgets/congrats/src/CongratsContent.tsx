import React, { Component, memo } from 'react'
import Lottie, { Options as LottieOptions } from 'react-lottie'
// FontAwesome configuration is handled globally
import AutoScroll from '../../../components/AutoScroll'
import * as z from 'zod'
import { CongratsWidgetContentDataSchema } from './types'
import { animationUtils } from './animationUtils' // Import the utility

// Memoized animation component
const Animation = memo(({ animationName }: { animationName: string }) => {
  const animationData = animationUtils.getAnimationData(animationName)
  const lottieOptions: LottieOptions = {
    loop: false,
    autoplay: true,
    animationData,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice'
    }
  }

  if (!animationData) return null

  return (
    <div className='background-animation'>
      <Lottie options={lottieOptions} height={'100%'} width={'100%'} />
    </div>
  )
})
Animation.displayName = 'Animation'


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
    const data = Object.assign({}, this.props.data || {})
    const text = data.text ?? DEFAULT_TEXT
    const textColor = data.textColor ?? DEFAULT_TEXT_COLOR
    const animationName = data.animation ?? DEFAULT_ANIMATION
    const fontSize = data.fontSize ?? DEFAULT_FONT_SIZE
    const color = data.color ?? DEFAULT_COLOR

    // Use animationUtils to get animation data
    const animationData = animationUtils.getAnimationData(animationName)

    // Create lottie options with loop disabled
    const lottieOptions: LottieOptions = Object.assign({}, {
      loop: false,
      autoplay: true,
      animationData,
      rendererSettings: Object.assign({}, {
        preserveAspectRatio: 'xMidYMid slice'
      })
    })

    return (
      <div className='relative box-border h-full w-full'>
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
        
      </div>
    )
  }
}

export default CongratsContent