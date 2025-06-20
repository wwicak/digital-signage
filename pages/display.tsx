import React from 'react';
import { NextPage, GetServerSidePropsContext } from 'next';

import DisplayComponent from '../components/Display/Display'; // Renamed to DisplayComponent to avoid conflict

interface IDisplayPageProps {
  host: string;
  displayId: string | undefined; // displayId can be undefined if not in query
}

const DisplayPage = ({ host, displayId }: IDisplayPageProps) => {
  // The DisplayComponent expects `display` prop which is the ID.
  // The Display component uses DisplayContext internally to manage state and handle SSE events.
  // No need to call setId here as the Display component will handle it when the display prop changes.
  
  return (
    <div className={'container'}>
      {/* Pass the displayId obtained from props directly to the Display component */}
      {/* The Display component uses this ID to fetch its own data and setup SSE */}
      {displayId ? (
        <DisplayComponent display={displayId} />
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
};

DisplayPage.getInitialProps = async (ctx: any): Promise<IDisplayPageProps> => {
  const displayId = ctx.query && typeof ctx.query.display === 'string' ? ctx.query.display : undefined;
  const host =
    ctx.req && ctx.req.headers && ctx.req.headers.host
      ? 'http://' + ctx.req.headers.host
      : typeof window !== 'undefined' ? window.location.origin : ''; // Handle server/client side host

  return { host, displayId };
};

export default DisplayPage;
