import React, { Component } from 'react'
import Lottie, { Options as LottieOptions } from 'react-lottie'
// FontAwesome configuration is handled globally
import AutoScroll from '../../../components/AutoScroll'
import * as z from 'zod'
import { CongratsWidgetContentDataSchema } from './types'
import { animationUtils } from './animationUtils' // Import the utility
import { Edit, X, Trash2, Plus, Minus, Eye, User, Settings, Key, Tv, Grid3X3, Grid2X2, Images, Image, Play, Pause, Stop, Clock, Calendar, ExternalLink, Download, Upload, Save, LogOut, ChevronDown, ChevronUp, Layout, Cast, Smartphone, Tablet, Monitor } from 'lucide-react'

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
      <div className="relative box-border h-full w-full">
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