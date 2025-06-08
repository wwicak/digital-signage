'use client'

import React, { memo, use } from 'react'
import DisplayComponent from '../../../components/Display/Display'

interface DisplayPageProps {
  params: Promise<{
    id: string;
  }>;
}

const DisplayPage = memo(function DisplayPage({ params }: DisplayPageProps) {
  const { id: displayId } = use(params)

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