import React from 'react';
import { NextPageContext } from 'next';
import { view } from 'react-easy-state';

import DisplayComponent from '../components/Display/Display'; // Renamed to DisplayComponent to avoid conflict with store
import { display as displayStore } from '../stores'; // display store is already typed, aliased for clarity

interface IDisplayPageProps {
  host: string;
  displayId: string | undefined; // displayId can be undefined if not in query
}

class DisplayPage extends React.Component<IDisplayPageProps> {
  constructor(props: IDisplayPageProps) {
    super(props);
  }

  static async getInitialProps(ctx: NextPageContext): Promise<IDisplayPageProps> {
    const displayId = ctx.query && typeof ctx.query.display === 'string' ? ctx.query.display : undefined;
    const host =
      ctx.req && ctx.req.headers && ctx.req.headers.host
        ? 'http://' + ctx.req.headers.host
        : typeof window !== 'undefined' ? window.location.origin : ''; // Handle server/client side host

    return { host, displayId };
  }

  componentDidMount() {
    const { displayId } = this.props;
    if (displayId) {
      // displayStore.setId is async, but not awaited here. This is fine if the
      // DisplayComponent internally reacts to changes in displayStore.id.
      displayStore.setId(displayId);
    } else {
      // Handle case where displayId is not available, e.g., redirect or show error
      console.warn('DisplayPage: displayId is undefined. Cannot set store ID.');
    }
  }

  componentDidUpdate(prevProps: IDisplayPageProps) {
    // If displayId prop changes (e.g. due to router.push to the same page with different query)
    if (this.props.displayId && this.props.displayId !== prevProps.displayId) {
      displayStore.setId(this.props.displayId);
    }
  }

  render() {
    const { host } = this.props;
    // The DisplayComponent expects `display` prop which is the ID.
    // displayStore.id comes from the react-easy-state store.
    // It's crucial that DisplayComponent is also wrapped in `view` or similar
    // to react to changes in displayStore.id if setId is async and not completed
    // before initial render.
    // The Display component itself was migrated to use EventSource and its own refresh logic
    // based on props.display (which is displayId).
    
    // Use this.props.displayId for rendering, as displayStore.id might not be set yet
    // or could be from a previous page if not reset.
    // The Display component itself uses this.props.display (which is displayId) to fetch its data.
    const currentDisplayId = this.props.displayId;


    return (
      <div className={'container'}>
        {/* Pass the displayId obtained from props directly to the Display component */}
        {/* The Display component uses this ID to fetch its own data and setup SSE */}
        {currentDisplayId ? (
          <DisplayComponent host={host} display={currentDisplayId} />
        ) : (
          <div>Loading display information or Display ID not provided...</div>
        )}
        <style jsx>
          {`
            .container {
              display: flex;
              width: 100vw;
              height: 100vh;
            }
          `}
        </style>
        {/* Global styles are typically placed in _app.tsx or a global CSS file.
            Placing them here makes them specific to this page when it's rendered. */}
        <style jsx global> 
          {`
            * {
              -ms-overflow-style: none; /* IE and Edge */
              scrollbar-width: none; /* Firefox */
            }
            *::-webkit-scrollbar {
              display: none; /* Safari and Chrome */
            }
          `}
        </style>
      </div>
    );
  }
}

export default view(DisplayPage);
