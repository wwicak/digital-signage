import React, { useEffect, useRef } from 'react';

import Frame from '../components/Admin/Frame.tsx'; // Assuming .tsx
import ScreenListComponent from '../components/Admin/ScreenList.tsx'; // Renamed, Assuming .tsx
import Dialog from '../components/Dialog.tsx'; // Assuming .tsx
import { Button } from '../components/Form'; // Assuming Form components are in .tsx or have .d.ts

import { addDisplay } from '../actions/display'; // Assuming .ts and typed
import { protect, ProtectProps } from '../helpers/auth'; // Now .tsx
import { useDisplayContext } from '../contexts/DisplayContext';

// Placeholder for ScreenList component instance type
// In a real scenario, ScreenList component would export its instance type or props type
interface ScreenListInstance {
  refresh: () => void;
  // Add other methods/properties if accessed via ref
}

interface ScreensProps extends ProtectProps {
  displayId?: string; // displayId might be optional or from router query
}

const Screens = ({ loggedIn, displayId }: ScreensProps) => {
  const screenListRef = useRef<ScreenListInstance>(null);
  const displayContext = useDisplayContext();

  useEffect(() => {
    if (displayId) {
      displayContext.setId(displayId);
    } else {
      // If no displayId is passed (e.g. not in query),
      // the context will handle the default state appropriately
    }
  }, [displayId, displayContext]);

  const add = (): Promise<void> => {
    return addDisplay().then(() => {
      // Type guard for ref
      if (screenListRef && screenListRef.current) {
        screenListRef.current.refresh();
      }
    });
  };

  return (
    <Frame loggedIn={loggedIn}>
      <h1>Screens</h1>
      <div className='wrapper'>
        <ScreenListComponent ref={screenListRef as any} />
        <Dialog><div></div></Dialog>
        <Button
          text={'+ Add new screen'}
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

// Add getInitialProps to the component
Screens.getInitialProps = async (ctx: any): Promise<{ displayId?: string }> => {
  const displayId = ctx.query.id as string | undefined;
  return { displayId };
};

export default protect(Screens);
