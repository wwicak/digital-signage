'use client'

import React, { memo } from 'react'
import DisplayComponent from '../../../components/Display/Display'

interface DisplayPageProps {
  params: {
    id: string;
  };
}

const DisplayPage = memo(function DisplayPage({ params }: DisplayPageProps) {
  const { id: displayId } = params

  return (
    <div className={'container'}>
      {displayId ? (
        <DisplayComponent display={displayId} />
      ) : (
        <div>Loading display information or Display ID not provided...</div>
      )}

    </div>
  )
})

export default DisplayPage