'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { view } from 'react-easy-state';

import DisplayComponent from '../../../components/Display/Display';
import { display as displayStore } from '../../../stores';

interface DisplayPageProps {
  params: {
    id: string;
  };
}

function DisplayPage({ params }: DisplayPageProps) {
  const { id: displayId } = params;

  useEffect(() => {
    if (displayId) {
      displayStore.setId(displayId);
    } else {
      console.warn('DisplayPage: displayId is undefined. Cannot set store ID.');
    }
  }, [displayId]);

  const host = typeof window !== 'undefined' ? window.location.origin : '';

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

export default view(DisplayPage);