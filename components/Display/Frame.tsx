import React, { Component, ReactNode } from 'react';
import Clock from 'react-live-clock'; // react-live-clock might need @types/react-live-clock if not inherently typed
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi } from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

// Define the structure for status bar items if they become more complex.
// For now, it's an array of strings like "type_id" or just "type".
// Example: 'date', 'time_1', 'connection_main'

export interface IDisplayFrameProps {
  children: ReactNode;
  statusBar?: string[]; // Array of status bar item identifiers/types
}

// No local state for this component
// interface IDisplayFrameState {}

class Frame extends Component<IDisplayFrameProps> {
  constructor(props: IDisplayFrameProps) {
    super(props);
  }

  renderStatusBarItem = (itemKey: string, index: number): JSX.Element | null => {
    // Assuming itemKey could be "type_uniqueId" or just "type"
    const type = itemKey.includes('_') ? itemKey.split('_')[0] : itemKey;

    switch (type) {
      case 'date':
        return <Clock key={`${type}-${index}`} ticking={true} format={'dddd, MMMM Do.'} />;
      case 'connection':
        return <FontAwesomeIcon key={`${type}-${index}`} className={'wifi-icon'} icon={faWifi as IconProp} />;
      case 'time':
        return <Clock key={`${type}-${index}`} ticking={true} format={'H:mm'} />;
      default:
        // Return a spacer or null for unknown types to maintain flex layout integrity if needed
        // Or log a warning for unrecognized types.
        console.warn(`Unknown status bar item type: ${type}`);
        return <span key={`${type}-${index}`}>&nbsp;</span>; // Render a space to maintain structure
    }
  };

  render() {
    const { children, statusBar = [] } = this.props;

    return (
      <div className='display-frame'> {/* Renamed class */}
        {statusBar && statusBar.length > 0 && (
          <div className={'status-bar-container'}> {/* Renamed class */}
            {statusBar.map((item, index) => (
              // Each item in the status bar should have its own container for styling (e.g., margins)
              <div key={`statusbar-item-${item}-${index}`} className={`status-bar-item item-${item.split('_')[0]}`}>
                {this.renderStatusBarItem(item, index)}
              </div>
            ))}
          </div>
        )}
        <div className="display-content"> {/* Added a wrapper for children for better structure */}
            {children}
        </div>
        <style jsx>
          {`
            .display-frame { /* Renamed */
              display: flex;
              flex-direction: column;
              width: 100%;
              height: 100%;
              background: black; /* Default background */
              font-family: 'Open Sans', sans-serif; /* Default font */
              color: white; /* Default text color */
            }
            .display-content {
              flex: 1; /* Ensures children take up remaining space */
              display: flex; /* If children need to be flex container too */
              flex-direction: column; /* Example, adjust as needed */
              overflow: hidden; /* Prevent content from breaking frame layout */
            }
            .status-bar-container { /* Renamed */
              padding: 15px 30px; /* Adjusted padding */
              display: flex;
              flex-direction: row;
              justify-content: flex-start; /* Align items to the start */
              align-items: center;
              background-color: rgba(0,0,0,0.2); /* Slight background for status bar */
              min-height: 50px; /* Example minimum height */
            }
            /* Individual item styling including margins */
            .status-bar-item {
              display: flex; /* For alignment if item has icon + text */
              align-items: center;
            }
            .status-bar-item:not(:first-child) {
              margin-left: 16px; /* Space between items */
            }
            .status-bar-item:last-child {
              /* No specific style for last-child needed with current flex-start */
            }
            /* Specific item type styling */
            .status-bar-item.item-connection .wifi-icon { /* Target FontAwesomeIcon via a class */
              color: #baff23; /* Green for connection */
            }
            .status-bar-item.item-date,
            .status-bar-item.item-time {
              /* Specific styles for date/time if needed */
              font-size: 1em; /* Example */
            }
            /* Removed .status .spacer as flex-start on container handles it */
            /* Removed .status *:not(:first-child):not(:last-child) for more specific item margin */
          `}
        </style>
      </div>
    );
  }
}

export default Frame;
