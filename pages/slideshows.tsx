import React, { useRef, useEffect } from 'react';
import { NextPageContext } from 'next';

import Frame from '../components/Admin/Frame.tsx';
import SlideshowListComponent from '../components/Admin/SlideshowList.tsx'; // Renamed
import Dialog from '../components/Dialog.tsx';
import { Button } from '../components/Form';

import { addSlideshow } from '../actions/slideshow'; // Assuming .ts and typed
import { protect, ProtectProps } from '../helpers/auth'; // Now .tsx
import { useDisplayContext } from '../contexts/DisplayContext';

// Placeholder for SlideshowList component instance type
interface SlideshowListInstance {
  refresh: () => void;
}

interface SlideshowsProps extends ProtectProps {
  displayId?: string; // displayId might be optional or from router query
}

const Slideshows: React.FC<SlideshowsProps> = ({ loggedIn, displayId }) => {
  const slideshowList = useRef<SlideshowListInstance>(null);
  const displayContext = useDisplayContext();

  // Example: If displayId comes from query for this page
  useEffect(() => {
    if (displayId) {
      displayContext.setId(displayId);
    }
    // If displayId is not provided, consider the behavior of setId.
    // It might default, or you might want to explicitly clear/set a default.
  }, [displayId, displayContext]);

  const add = (): Promise<void> => {
    return addSlideshow().then(() => {
      if (slideshowList && slideshowList.current) {
        slideshowList.current.refresh();
      }
    });
  };

  return (
    <Frame loggedIn={loggedIn}>
      <h1>Slideshows</h1>
      <div className='wrapper'>
        <SlideshowListComponent ref={slideshowList as any} />
        <Dialog><div></div></Dialog>
        <Button
          text={'+ Add new slideshow'}
          color={'#8bc34a'}
          onClick={add}
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
};

// Example: If displayId comes from query for this page
const SlideshowsWithInitialProps = Object.assign(Slideshows, {
  getInitialProps: async (ctx: any): Promise<{ displayId?: string }> => {
    const displayId = ctx.query.id as string | undefined;
    return { displayId };
  }
});

export default protect(SlideshowsWithInitialProps);
