import React, { Component, CSSProperties } from 'react'
// FontAwesome configuration is handled globally
import * as z from 'zod'

import { TImageFit } from '../index' // Import TImageFit from the widget index


// Zod schema for TImageFit (based on its definition in ../index.ts)
export const TImageFitSchema = z.enum(['contain', 'cover', 'fill', 'none', 'scale-down'])

// Zod schema for the image widget's content data
export const ImageWidgetContentDataSchema = z.object({
  title: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(), // Assuming URL if not null
  fit: TImageFitSchema.optional(),
  color: z.string().optional(), // Background color
  altText: z.string().optional(),
})
export type IImageWidgetData = z.infer<typeof ImageWidgetContentDataSchema>;

// Zod schema for ImageContent component props
export const ImageContentPropsSchema = z.object({
  data: ImageWidgetContentDataSchema.optional(),
  isPreview: z.boolean().optional(),
})
export type IImageContentProps = z.infer<typeof ImageContentPropsSchema>;

export const DEFAULT_COLOR = '#2d3436' // Dark Gray
export const DEFAULT_FIT: TImageFit = 'contain'
export const DEFAULT_ALT_TEXT = 'Displayed image'

class ImageContent extends Component<IImageContentProps> {
  /*
   * The iframe ref was unused in the original component, so it's removed.
   * If it was intended for something, it would need to be typed:
   * private iframeRef = React.createRef<HTMLIFrameElement>();
   */

  constructor(props: IImageContentProps) {
    super(props)
  }

  render() {
    const { data = {} } = this.props
    const {
      title = null,
      url = null,
      fit = DEFAULT_FIT,
      color = DEFAULT_COLOR,
      altText = DEFAULT_ALT_TEXT, // Use altText, though not directly rendered on a background image
    } = data

    // Style for the main content area, applying the background color
    const contentStyle: CSSProperties = {
      background: color,
    }

    // Style for the blurred background cover image
    const photoCoverStyle: CSSProperties = {
      backgroundImage: url ? `url(${url})` : 'none',
      // Other styles are from JSX
    }

    // Style for the main photo, applying the object-fit behavior
    const photoStyle: CSSProperties = {
      backgroundImage: url ? `url(${url})` : 'none',
      backgroundSize: fit, // Directly use the 'fit' prop value which corresponds to CSS background-size
      // Other styles are from JSX
    }
    
    /*
     * For accessibility, if this was an <img> tag, altText would be in alt attribute.
     * For background images, ensure sufficient contrast or provide context if image is meaningful.
     * An aria-label could be added to the container if appropriate.
     */

    return (
      <div className="box-border h-full w-full" aria-label={altText || title || 'Image widget'}> {/* Renamed class */}
        {title && (
          <div className='title-container'> {/* Renamed class */}
            <div className='title-text'>{title}</div> {/* Renamed class */}
          </div>
        )}
        {url ? (
          <div className='content-area' style={contentStyle}> {/* Renamed class */}
            <div className="absolute" style={photoCoverStyle} /> {/* Renamed class */}
            <div className="h-full absolute" style={photoStyle} /> {/* Renamed class */}
          </div>
        ) : (
          <div className='content-area placeholder-content' style={contentStyle}> {/* Placeholder if no URL */}
            <span>No Image URL Provided</span>
          </div>
        )}
        
      </div>
    )
  }
}

export default ImageContent