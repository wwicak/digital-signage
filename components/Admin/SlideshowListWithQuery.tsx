import React from 'react'
import ContentLoader from 'react-content-loader'

import SlideshowCard from './SlideshowCard'
import { ISlideshowData } from '../../actions/slideshow'
import { useSlideshows } from '../../hooks/useSlideshows'

// Props interface for the component
export interface ISlideshowListWithQueryProps {
  // Add any props if they are passed from a parent component.
}

const SlideshowListWithQuery: React.FC<ISlideshowListWithQueryProps> = () => {
  const { data: slideshows, isLoading, error, refetch } = useSlideshows()

  // Handle error state
  if (error) {
    return (
      <div className="text-center p-5 font-sans">
        Failed to load slideshows. Please try again later.
        <button onClick={() => refetch()} style={{ marginLeft: '10px' }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={'slideshow-list'}>
      {!isLoading && slideshows
        ? slideshows.map((slideshow: ISlideshowData) => (
            <SlideshowCard
              key={slideshow._id}
              value={slideshow}
              refresh={() => refetch()}
            />
          ))
        : Array(3)
            .fill(0)
            .map((_, index) => (
              <ContentLoader
                key={`loader-slideshow-${index}`}
                height={100}
                width={640}
                speed={2}
                backgroundColor='#f3f3f3'
                foregroundColor='#ecebeb'
              >
                <rect x='0' y='10' rx='4' ry='4' width='50' height='50' />
                <rect x='60' y='10' rx='3' ry='3' width='300' height='15' />
                <rect x='60' y='30' rx='3' ry='3' width='80' height='10' />
                <rect x='150' y='30' rx='3' ry='3' width='80' height='10' />
                <rect x='600' y='25' rx='3' ry='3' width='20' height='20' />
              </ContentLoader>
            ))}
      
    </div>
  )
}

export default SlideshowListWithQuery