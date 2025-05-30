import React from 'react';
import { NextPage, NextPageContext } from 'next';
import { view } from 'react-easy-state';

import Frame from '../components/Admin/Frame.tsx'; // Assuming .tsx
import DisplayComponent from '../components/Display/Display.tsx'; // Renamed to avoid conflict, assuming .tsx
import { protect, ProtectProps } from '../helpers/auth'; // Now .tsx
import { display } from '../stores'; // Assuming stores are typed

interface PreviewProps extends ProtectProps {
  displayId: string;
  host: string;
}

interface PreviewState {}

class Preview extends React.Component<PreviewProps, PreviewState> {
  constructor(props: PreviewProps) {
    super(props);
  }

  // If getInitialProps is used, it should be static and typed
  static async getInitialProps(ctx: any): Promise<{ displayId: string; host: string }> {
    const displayId = ctx.query.id as string; // Example: get id from query
    const host =
      ctx.req && ctx.req.headers && ctx.req.headers.host
        ? (ctx.req.socket?.encrypted ? 'https://' : 'http://') + ctx.req.headers.host
        : window.location.origin;
    return { displayId: displayId || 'defaultDisplayId', host }; // Ensure displayId has a fallback or handle if undefined
  }

  componentDidMount() {
    const { displayId } = this.props;
    if (displayId) {
      display.setId(displayId); // Assuming display store and setId method are properly typed
    }
  }

  render() {
    const { host, loggedIn } = this.props;
    return (
      <Frame loggedIn={loggedIn}>
        <h1>Preview</h1>
        <p>Below is a preview of the display as it will appear on the TV.</p>
        <div className='preview'>
          <div className='content'>
            {/* Assuming display.id is a string or compatible type for DisplayComponent's display prop */}
            <DisplayComponent display={display.id as string} />
          </div>
        </div>
        <style jsx>
          {`
            h1 {
              font-family: 'Open Sans', sans-serif;
              font-size: 24px;
              color: #4f4f4f;
              margin: 0px;
            }
            p {
              font-family: 'Open Sans', sans-serif;
            }
            .preview {
              margin-top: 20px;
              border-radius: 4px;
              overflow: hidden;
              padding-top: 56.25%; /* 16:9 Aspect Ratio */
              position: relative;
            }
            .preview .content {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
            }
          `}
        </style>
      </Frame>
    );
  }
}

// The protect HOC should be typed to correctly pass/modify props.
// The view HOC from react-easy-state should also handle TypeScript.
export default protect(view(Preview as React.ComponentType<PreviewProps>));
