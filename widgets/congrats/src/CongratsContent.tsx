import React, { Component } from 'react';
import Lottie, { LottieProps, Options as LottieOptions } from 'react-lottie'; // react-lottie types might be available
import { config } from '@fortawesome/fontawesome-svg-core'; // Only config is used from fontawesome here

import AutoScroll from '../../../components/AutoScroll'; // Assuming .js or .tsx

config.autoAddCss = false;
import * as z from 'zod';

// Zod schema for the congrats widget's content data
export const CongratsWidgetContentDataSchema = z.object({
  text: z.string().optional(),
  textColor: z.string().optional(),
  animation: z.string().optional(), // Name of the Lottie animation
  fontSize: z.number().optional(),
  color: z.string().optional(), // Background color
  recipient: z.string().optional(),
});
export type ICongratsWidgetData = z.infer<typeof CongratsWidgetContentDataSchema>;

// Zod schema for CongratsContent component props
export const CongratsContentPropsSchema = z.object({
  data: CongratsWidgetContentDataSchema.optional(),
  isPreview: z.boolean().optional(),
});
export type ICongratsContentProps = z.infer<typeof CongratsContentPropsSchema>;

const DEFAULT_COLOR = '#34495e'; // Wet Asphalt
const DEFAULT_TEXT_COLOR = '#ffffff'; // White
const DEFAULT_ANIMATION = 'confetti';
const DEFAULT_TEXT = 'Congratulations!';
const DEFAULT_FONT_SIZE = 16; // Default font size in pixels

// Helper to load animation data.
// In a real scenario, these might be pre-imported or handled by a bundler feature.
// For TypeScript, dynamic require with variable paths is tricky.
// This is a placeholder for how one might manage multiple animation files.
const getAnimationData = (animationName: string): any | null => {
  try {
    // This dynamic require will likely cause issues with Webpack/Next.js if files are not statically analyzable.
    // A better approach would be to import them all and select, or use a dynamic import() if supported for JSON.
    // For example:
    // if (animationName === 'confetti') return require('./animations/confetti.json');
    // if (animationName === 'balloons') return require('./animations/balloons.json');
    // etc.
    // Or using import()
    // return await import(`./animations/${animationName}.json`); // This returns a Promise
    // For simplicity in migration, retaining the problematic require but it needs to be addressed.
    return require(`./animations/${animationName}.json`);
  } catch (error) {
    console.error(`Failed to load animation: ${animationName}`, error);
    try {
        // Fallback to default animation if specified one fails
        return require(`./animations/${DEFAULT_ANIMATION}.json`);
    } catch (defaultError) {
        console.error(`Failed to load default animation: ${DEFAULT_ANIMATION}`, defaultError);
        return null; // Return null if default also fails
    }
  }
};


class CongratsContent extends Component<ICongratsContentProps> {
  render() {
    const { data = {} } = this.props;
    const text = data.text ?? DEFAULT_TEXT;
    const textColor = data.textColor ?? DEFAULT_TEXT_COLOR;
    const animationName = data.animation ?? DEFAULT_ANIMATION;
    const fontSize = data.fontSize ?? DEFAULT_FONT_SIZE;
    const color = data.color ?? DEFAULT_COLOR;
    // const recipient = data.recipient; // Available if needed

    const animationData = getAnimationData(animationName);

    const lottieOptions: LottieOptions = {
      loop: true,
      autoplay: true,
      animationData: animationData, // Loaded animation data
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid slice',
      },
    };

    return (
      <div className='congrats-widget-content'> {/* Renamed class */}
        {animationData && (
          <div className='background-animation'> {/* Renamed class */}
            <Lottie options={lottieOptions} height={'100%'} width={'100%'} />
          </div>
        )}
        <AutoScroll style={{ display: 'block', flex: 1, overflowY: 'auto', minHeight:0, zIndex: 1 }}> {/* Ensure AutoScroll is on top */}
          <div className='text-content' style={{ fontSize: `${fontSize}px` }}> {/* Renamed class, applied fontSize */}
            {text.split('\n').map((line, index) => (
              <div key={`line-${index}`}>{line || <br />}</div>
            ))}
          </div>
        </AutoScroll>
        <style jsx>
          {`
            .congrats-widget-content { /* Renamed */
              position: relative;
              box-sizing: border-box;
              height: 100%;
              width: 100%;
              background: ${color};
              color: ${textColor};
              flex: 1; /* Fill parent if flex item */
              font-family: 'Open Sans', sans-serif;
              display: flex;
              /* flex-direction: row; */ /* Original was row, but content is typically stacked, so column might be better or just center */
              justify-content: center;
              align-items: center;
              overflow: hidden; /* Prevent Lottie from overflowing if not perfectly sized */
            }
            .congrats-widget-content .background-animation { /* Renamed */
              width: 100%;
              height: 100%;
              position: absolute;
              top: 0;
              left: 0;
              z-index: 0; /* Background animation */
            }
            .congrats-widget-content .text-content { /* Renamed */
              font-family: 'Open Sans', sans-serif;
              /* fontSize is now applied via inline style */
              padding: 16px;
              font-weight: 600;
              text-align: center;
              z-index: 1; /* Text on top of animation */
              word-break: break-word;
              min-height: 100%; /* For AutoScroll */
              display: flex;
              flex-direction: column;
              justify-content: center;
              box-sizing: border-box;
              width: 100%; /* Ensure text content takes full width */
            }
          `}
        </style>
      </div>
    );
  }
}

export default CongratsContent;
