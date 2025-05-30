import React, { ReactNode } from 'react';
import { view } from 'react-easy-state';

import Sidebar from './Sidebar'; // Assuming Sidebar.js or Sidebar.tsx
import { display as displayStore } from '../../stores'; // display store is already typed

export interface IFrameProps {
  children: ReactNode;
  loggedIn?: boolean; // Prop to indicate if the user is logged in
}

const Frame: React.FC<IFrameProps> = (props) => {
  return (
    <div className='admin-frame-container'>
      {/* The displayId for the Sidebar is taken from the global store */}
      <Sidebar loggedIn={props.loggedIn} displayId={displayStore.id} />
      <div className='admin-frame-content'>{props.children}</div>
      <style jsx>
        {`
          .admin-frame-container {
            display: flex;
            flex-direction: row;
            flex: 1; /* This makes the frame take up available space if it's a child of a flex container */
            min-height: 100vh; /* Ensure it takes at least full viewport height */
          }
          .admin-frame-content {
            padding: 40px;
            background: #f4f4f4;
            flex: 1; /* Content area takes remaining space */
            overflow-y: auto; /* Add scroll for content overflow */
          }
        `}
      </style>
    </div>
  );
};

export default view(Frame);
