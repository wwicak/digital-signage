import React, { Component, CSSProperties } from 'react';
import { config } from '@fortawesome/fontawesome-svg-core';
import * as z from 'zod';

import { TImageFit } from '../index'; // Import TImageFit from the widget index

config.autoAddCss = false;

// Zod schema for TImageFit (based on its definition in ../index.ts)
export const TImageFitSchema = z.enum(["contain", "cover", "fill", "none", "scale-down"]);

// Zod schema for the image widget's content data
export const ImageWidgetContentDataSchema = z.object({
  title: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(), // Assuming URL if not null
  fit: TImageFitSchema.optional(),
  color: z.string().optional(), // Background color
  altText: z.string().optional(),
});
export type IImageWidgetData = z.infer<typeof ImageWidgetContentDataSchema>;

// Zod schema for ImageContent component props
export const ImageContentPropsSchema = z.object({
  data: ImageWidgetContentDataSchema.optional(),
  isPreview: z.boolean().optional(),
});
export type IImageContentProps = z.infer<typeof ImageContentPropsSchema>;

export const DEFAULT_COLOR = '#2d3436'; // Dark Gray
export const DEFAULT_FIT: TImageFit = 'contain';
export const DEFAULT_ALT_TEXT = 'Displayed image';

class ImageContent extends Component<IImageContentProps> {
  // The iframe ref was unused in the original component, so it's removed.
  // If it was intended for something, it would need to be typed:
  // private iframeRef = React.createRef<HTMLIFrameElement>();

  constructor(props: IImageContentProps) {
    super(props);
  }

  render() {
    const { data = {} } = this.props;
    const {
      title = null,
      url = null,
      fit = DEFAULT_FIT,
      color = DEFAULT_COLOR,
      altText = DEFAULT_ALT_TEXT, // Use altText, though not directly rendered on a background image
    } = data;

    // Style for the main content area, applying the background color
    const contentStyle: CSSProperties = {
      background: color,
    };

    // Style for the blurred background cover image
    const photoCoverStyle: CSSProperties = {
      backgroundImage: url ? `url(${url})` : 'none',
      // Other styles are from JSX
    };

    // Style for the main photo, applying the object-fit behavior
    const photoStyle: CSSProperties = {
      backgroundImage: url ? `url(${url})` : 'none',
      backgroundSize: fit, // Directly use the 'fit' prop value which corresponds to CSS background-size
      // Other styles are from JSX
    };
    
    // For accessibility, if this was an <img> tag, altText would be in alt attribute.
    // For background images, ensure sufficient contrast or provide context if image is meaningful.
    // An aria-label could be added to the container if appropriate.

    return (
      <div className='image-widget-content' aria-label={altText || title || "Image widget"}> {/* Renamed class */}
        {title && (
          <div className='title-container'> {/* Renamed class */}
            <div className='title-text'>{title}</div> {/* Renamed class */}
          </div>
        )}
        {url ? (
          <div className='content-area' style={contentStyle}> {/* Renamed class */}
            <div className='photocover-bg' style={photoCoverStyle} /> {/* Renamed class */}
            <div className='photo-main' style={photoStyle} /> {/* Renamed class */}
          </div>
        ) : (
          <div className='content-area placeholder-content' style={contentStyle}> {/* Placeholder if no URL */}
            <span>No Image URL Provided</span>
          </div>
        )}
        <style jsx>
          {`
            .image-widget-content { /* Renamed */
              position: relative;
              box-sizing: border-box;
              height: 100%;
              width: 100%;
              background: ${color}; /* This might be redundant if content-area also sets it */
              flex: 1; /* Fill parent if flex item */
              font-family: 'Open Sans', sans-serif;
              display: flex;
              flex-direction: column;
              overflow: hidden; /* Prevent blur from spilling out */
              color: white; /* Default text color for title */
            }
            .image-widget-content .content-area { /* Renamed */
              flex: 1;
              border: none;
              overflow: hidden;
              position: relative; /* For positioning photo and photocover */
            }
            .image-widget-content .placeholder-content {
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ccc; /* Light grey text for placeholder */
              font-size: 1.2em;
            }
            .image-widget-content .title-container { /* Renamed */
              padding: 12px;
              background-color: rgba(0,0,0,0.3); /* Slight dark background for title readability */
              z-index: 2; /* Ensure title is above photocover */
              position: relative; /* Needed for z-index to work against absolute children of content-area */
            }
            .image-widget-content .title-text { /* Renamed */
              font-family: 'Open Sans', sans-serif;
              border-left: 3px solid rgba(255, 255, 255, 0.5);
              font-size: 16px;
              padding-left: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .photocover-bg { /* Renamed */
              width: 110%; /* To allow blur to extend beyond edges */
              height: 110%;
              background-size: cover; /* Always cover for the blur effect */
              background-repeat: no-repeat;
              background-position: 50% 50%;
              filter: blur(20px);
              position: absolute;
              top: -5%; /* Center the blurred overflow */
              left: -5%;
              z-index: 0; /* Behind the main photo */
            }
            .photo-main { /* Renamed */
              width: 100%;
              height: 100%;
              /* background-size is set via inline style (fit) */
              background-repeat: no-repeat;
              background-position: 50% 50%;
              position: absolute;
              top: 0;
              left: 0;
              z-index: 1; /* Above the blurred background */
            }
            /* .invisible class was unused, removed */
          `}
        </style>
      </div>
    );
  }
}

export default ImageContent;
