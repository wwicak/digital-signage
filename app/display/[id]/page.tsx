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
    <div className={'w-full h-screen overflow-hidden m-0 p-0'}>
      {displayId ? (
        <DisplayComponent display={displayId} />
      ) : (
        <div>Loading display information or Display ID not provided...</div>
      )}

    </div>
  )
})

DisplayPage.displayName = 'DisplayPage'

export default DisplayPage