import React from 'react';
import { NextPage, NextPageContext } from 'next';
import { view } from 'react-easy-state';

import Frame from '../components/Admin/Frame.tsx'; // Assuming .tsx
import ScreenListComponent from '../components/Admin/ScreenList.tsx'; // Renamed, Assuming .tsx
import Dialog from '../components/Dialog.tsx'; // Assuming .tsx
import { Button } from '../components/Form'; // Assuming Form components are in .tsx or have .d.ts

import { addDisplay } from '../actions/display'; // Assuming .ts and typed
import { protect, ProtectProps } from '../helpers/auth'; // Now .tsx
import { display } from '../stores'; // Assuming stores are typed

// Placeholder for ScreenList component instance type
// In a real scenario, ScreenList component would export its instance type or props type
interface ScreenListInstance {
  refresh: () => void;
  // Add other methods/properties if accessed via ref
}

interface ScreensProps extends ProtectProps {
  displayId?: string; // displayId might be optional or from router query
}

class Screens extends React.Component<ScreensProps> {
  private screenList = React.createRef<ScreenListInstance>();

  constructor(props: ScreensProps) {
    super(props);
  }

  // Example: If displayId comes from query for this page too
  static async getInitialProps(ctx: NextPageContext): Promise<{ displayId?: string }> {
    const displayId = ctx.query.id as string | undefined;
    return { displayId };
  }

  componentDidMount() {
    const { displayId } = this.props;
    if (displayId) {
      display.setId(displayId);
    } else {
      // If no displayId is passed (e.g. not in query),
      // display.id might be undefined or fallback to a default in the store.
      // If setId is meant to clear or use a default, that's fine.
      // Otherwise, ensure displayId is always available if required.
      // For example, clear it if not provided:
      // display.setId(undefined); or display.clearId();
    }
  }

  add = (): Promise<void> => {
    return addDisplay().then(() => {
      // Type guard for ref
      if (this.screenList && this.screenList.current) {
        this.screenList.current.refresh();
      }
    });
  };

  render() {
    const { loggedIn } = this.props;
    return (
      <Frame loggedIn={loggedIn}>
        <h1>Screens</h1>
        <div className='wrapper'>
          <ScreenListComponent ref={this.screenList} />
          <Dialog /> {/* Assuming Dialog does not need specific props here or takes them from a store */}
          <Button
            text={'+ Add new screen'}
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

export default protect(view(Screens as React.ComponentType<ScreensProps>));
