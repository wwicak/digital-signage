import React, { Component } from 'react';
import { library, config, IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'; // Import specific icon
import { fab } from '@fortawesome/free-brands-svg-icons'; // fab is imported but not used in this specific component

import AutoScroll from '../../../components/AutoScroll'; // Assuming .js or .tsx

config.autoAddCss = false;
library.add(fas); // Add all solid icons (includes faExclamationTriangle if not imported directly)
library.add(fab);

// Data structure for the announcement widget's content
// This should align with IAnnouncementDefaultData from announcement/index.ts
export interface IAnnouncementWidgetData {
  text?: string;
  color?: string;
  textColor?: string;
  titleTextColor?: string;
  accentColor?: string;
  title?: string; // This was in IAnnouncementDefaultData, but not used in original render for title text
}

// Props for the AnnouncementContent component
export interface IAnnouncementContentProps {
  data?: IAnnouncementWidgetData;
  isPreview?: boolean; // Example of another prop widgets might receive
}

const DEFAULT_COLOR = '#708090'; // Slate gray
const DEFAULT_TEXT_COLOR = '#ffffff'; // White
const DEFAULT_ACCENT_COLOR = '#EDC951'; // Goldenrod
const DEFAULT_TEXT = '';
const DEFAULT_TITLE_TEXT_COLOR = '#fff0f0'; // Snow

class AnnouncementContent extends Component<IAnnouncementContentProps> {
  render() {
    const { data = {} } = this.props;
    const text = data.text ?? DEFAULT_TEXT;
    const textColor = data.textColor ?? DEFAULT_TEXT_COLOR;
    const titleTextColor = data.titleTextColor ?? DEFAULT_TITLE_TEXT_COLOR;
    const color = data.color ?? DEFAULT_COLOR;
    const accentColor = data.accentColor ?? DEFAULT_ACCENT_COLOR;
    // The title text "Announcement" is hardcoded in the original component.
    // If data.title should be used, it can be accessed here:
    // const announcementTitle = data.title || "Announcement";

    return (
      <div className='announce-widget-content'> {/* Renamed class */}
        <div className='title-bar'> {/* Renamed class */}
          <div className='icon'>
            <FontAwesomeIcon icon={faExclamationTriangle as IconProp} style={{ fontSize: '0.9em' }} color={accentColor} /> {/* Adjusted size */}
          </div>
          <span>Announcement</span> {/* Hardcoded title text */}
        </div>
        <AutoScroll style={{ display: 'block', flex: 1, overflowY: 'auto', minHeight: 0 }}> {/* Ensure AutoScroll can shrink */}
          <div className='text-content'> {/* Renamed class */}
            {text.split('\n').map((line, index) => (
              // Ensure unique keys for mapped elements
              <div key={`line-${index}`}>{line || <br />}</div>
            ))}
          </div>
        </AutoScroll>
        <style jsx>
          {`
            .announce-widget-content { /* Renamed */
              position: relative;
              box-sizing: border-box;
              height: 100%;
              width: 100%;
              background: ${color};
              color: ${textColor};
              flex: 1; /* Ensure it fills parent if it's a flex item */
              padding: 12px;
              font-family: 'Open Sans', sans-serif;
              display: flex;
              flex-direction: column;
              justify-content: flex-start; /* Changed from 'top' */
              align-items: center; /* Center title and text block horizontally */
              overflow: hidden; /* Prevent content from spilling out */
            }
            .announce-widget-content .text-content { /* Renamed */
              font-family: 'Open Sans', sans-serif;
              font-size: 16px;
              font-weight: 600;
              text-align: center;
              z-index: 1; /* If needed for stacking context */
              word-break: break-word;
              min-height: 100%; /* For AutoScroll to work correctly */
              display: flex;
              flex-direction: column;
              justify-content: center; /* Vertically center text within its scrollable area */
              box-sizing: border-box;
              width: 100%; /* Ensure text content takes full width */
            }
            .announce-widget-content .icon {
              margin-right: 8px;
              /* margin-left: 8px; */ /* Removed, title bar handles overall padding/alignment */
              display: flex; /* For vertical alignment of icon */
              align-items: center;
            }
            .announce-widget-content .title-bar { /* Renamed */
              color: ${titleTextColor};
              font-family: 'Open Sans', sans-serif;
              font-size: 16px;
              font-weight: 600;
              text-align: left;
              padding: 4px 8px; /* Added horizontal padding */
              z-index: 1; /* If needed */
              border-left: 4px solid ${accentColor};
              display: flex;
              flex-direction: row;
              align-items: center;
              width: 100%; /* Title bar takes full width */
              margin-bottom: 8px; /* Space between title and text */
              box-sizing: border-box;
            }
          `}
        </style>
      </div>
    );
  }
}

export default AnnouncementContent;
