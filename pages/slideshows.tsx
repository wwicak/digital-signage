import React from 'react';
import { NextPage, NextPageContext } from 'next';
import { view } from 'react-easy-state';

import Frame from '../components/Admin/Frame.tsx';
import SlideshowListComponent from '../components/Admin/SlideshowList.tsx'; // Renamed
import Dialog from '../components/Dialog.tsx';
import { Button } from '../components/Form';

import { addSlideshow } from '../actions/slideshow'; // Assuming .ts and typed
import { protect, ProtectProps } from '../helpers/auth'; // Now .tsx
import { display } from '../stores'; // Assuming stores are typed

// Placeholder for SlideshowList component instance type
interface SlideshowListInstance {
  refresh: () => void;
}

interface SlideshowsProps extends ProtectProps {
  displayId?: string; // displayId might be optional or from router query
}

class Slideshows extends React.Component<SlideshowsProps> {
  private slideshowList = React.createRef<SlideshowListInstance>();

  constructor(props: SlideshowsProps) {
    super(props);
  }

  // Example: If displayId comes from query for this page
  static async getInitialProps(ctx: any): Promise<{ displayId?: string }> {
    const displayId = ctx.query.id as string | undefined;
    return { displayId };
  }

  componentDidMount() {
    const { displayId } = this.props;
    if (displayId) {
      display.setId(displayId);
    }
    // If displayId is not provided, consider the behavior of display.setId.
    // It might default, or you might want to explicitly clear/set a default.
  }

  add = (): Promise<void> => {
    return addSlideshow().then(() => {
      if (this.slideshowList && this.slideshowList.current) {
        this.slideshowList.current.refresh();
      }
    });
  };

  render() {
    const { loggedIn } = this.props;
    return (
      <Frame loggedIn={loggedIn}>
        <h1>Slideshows</h1>
        <div className='wrapper'>
          <SlideshowListComponent ref={this.slideshowList as any} />
          <Dialog><div></div></Dialog>
          <Button
            text={'+ Add new slideshow'}
            color={'#8bc34a'}
            onClick={this.add}
            style={{ marginLeft: 0, width: '100%' }}
          />
        </div>
        <style jsx>
          {`
            h1 {
              font-family: 'Open Sans', sans-serif;
              font-size: 24px;
              color: #4f4f4f;
              margin: 0px;
            }
            .wrapper {
              margin: 40px auto;
              max-width: 640px;
            }
          `}
        </style>
      </Frame>
    );
  }
}

export default protect(view(Slideshows as React.ComponentType<SlideshowsProps>));
