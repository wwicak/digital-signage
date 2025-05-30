import React, { Component, CSSProperties } from 'react';
import { config as FaConfig } from '@fortawesome/fontawesome-svg-core'; // Only config is used

import { IWebDefaultData } from '../index'; // Data structure from widget's index.ts

FaConfig.autoAddCss = false;

// Data structure for the web widget's content
// This should align with IWebDefaultData from web/index.ts
export interface IWebWidgetData extends IWebDefaultData {
  // All fields are already optional or have defaults in IWebDefaultData
}

// Props for the WebContent component
export interface IWebContentProps {
  data?: IWebWidgetData;
  isPreview?: boolean;
}

interface IWebContentState {
  iframeKey: number; // Used to force iframe re-render on manual refresh or URL change
}

const DEFAULT_URL = 'https://compsci.lafayette.edu/';
const DEFAULT_COLOR = '#FFFFFF'; // Default background for the widget frame itself
const DEFAULT_SCALE = 1.0;
const DEFAULT_REFRESH_INTERVAL = 0; // 0 means no auto-refresh
const DEFAULT_ALLOW_INTERACTION = false;

class WebContent extends Component<IWebContentProps, IWebContentState> {
  private iframeRef = React.createRef<HTMLIFrameElement>();
  private refreshTimerId: NodeJS.Timeout | null = null;

  constructor(props: IWebContentProps) {
    super(props);
    this.state = {
      iframeKey: Date.now(), // Initial key
    };
  }

  componentDidMount() {
    this.setupRefreshInterval();
  }

  componentDidUpdate(prevProps: IWebContentProps) {
    const oldData = prevProps.data || {};
    const newData = this.props.data || {};

    if (oldData.url !== newData.url) {
      this.setState({ iframeKey: Date.now() }); // Change key to force iframe reload on URL change
    }
    if (oldData.refreshInterval !== newData.refreshInterval || oldData.url !== newData.url) {
      this.clearRefreshInterval();
      this.setupRefreshInterval();
    }
  }

  componentWillUnmount() {
    this.clearRefreshInterval();
  }

  setupRefreshInterval = (): void => {
    const { refreshInterval = DEFAULT_REFRESH_INTERVAL } = this.props.data || {};
    if (refreshInterval > 0) {
      this.refreshTimerId = setInterval(() => {
        if (this.iframeRef.current) {
          // One way to refresh: change src. Another is this.iframeRef.current.src = this.iframeRef.current.src;
          // Or, more reliably for some browsers, change the key of the iframe.
          this.setState({ iframeKey: Date.now() });
        }
      }, refreshInterval * 1000); // Convert seconds to milliseconds
    }
  };

  clearRefreshInterval = (): void => {
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  };

  render() {
    const { data = {} } = this.props;
    const {
      title = null,
      url = DEFAULT_URL,
      color = DEFAULT_COLOR, // This color is for the widget's own background
      scale = DEFAULT_SCALE,
      allowInteraction = DEFAULT_ALLOW_INTERACTION,
      // refreshInterval is used in setupRefreshInterval
    } = data;

    const iframeContainerStyle: CSSProperties = {
      flex: 1,
      border: 'none',
      overflow: 'hidden', // To contain the scaled iframe
      position: 'relative', // For positioning the iframe if needed
    };

    const iframeStyle: CSSProperties = {
      border: 'none',
      width: `${100 / scale}%`, // Adjust width and height to compensate for scaling
      height: `${100 / scale}%`,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      // The iframe content itself will determine its background.
      // 'color' prop is for the widget frame.
    };
    
    // Sandbox attribute: empty string for max restrictions, or specific permissions
    // 'allow-scripts allow-same-origin' are common for minimal functionality if sandboxed.
    // 'allow-popups', 'allow-forms', etc. can be added.
    // If allowInteraction is true, we might want fewer sandbox restrictions or none.
    const sandboxPermissions = allowInteraction 
        ? "allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-modals" 
        : "allow-scripts allow-same-origin"; // Basic sandbox for no interaction

    return (
      <div className='web-widget-content' style={{ background: color }}>
        {title && (
          <div className='title-container'>
            <div className='title-text'>{title}</div>
          </div>
        )}
        <div className='iframe-area' style={iframeContainerStyle}> {/* Renamed class */}
          <iframe
            key={this.state.iframeKey} // Change key to force re-render/reload
            src={url}
            style={iframeStyle}
            ref={this.iframeRef}
            sandbox={sandboxPermissions}
            title={title || 'Web Content'} // Accessibility for iframe title
            // allowFullScreen - if needed
            // allow="microphone; camera; ..." - for specific feature permissions
          />
        </div>
        <style jsx>
          {`
            .web-widget-content {
              position: relative;
              box-sizing: border-box;
              height: 100%;
              width: 100%;
              /* background is set via inline style */
              flex: 1; /* Fill parent if flex item */
              font-family: 'Open Sans', sans-serif;
              display: flex;
              flex-direction: column;
              color: white; /* Default text color for title, assuming dark background */
            }
            .iframe-area { /* Renamed */
              /* Styles applied via iframeContainerStyle object */
            }
            /* .iframe class from original JS is now applied via iframeStyle object */

            .title-container {
              padding: 12px;
              background-color: rgba(0,0,0,0.3); /* Darker background for title for readability */
              z-index: 1; /* Ensure title is above iframe if it overlaps (though not typical) */
            }
            .title-text {
              font-family: 'Open Sans', sans-serif;
              border-left: 3px solid rgba(255, 255, 255, 0.5);
              font-size: 16px;
              padding-left: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
          `}
        </style>
      </div>
    );
  }
}

export default WebContent;
