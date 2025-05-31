'use client';

import React from 'react';
import DisplayComponent from '../../../components/Display/Display';

interface DisplayPageProps {
  params: {
    id: string;
  };
}

function DisplayPage({ params }: DisplayPageProps) {
  const { id: displayId } = params;

  return (
    <div className={'container'}>
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

export default DisplayPage;