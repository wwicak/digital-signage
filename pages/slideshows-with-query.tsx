import React from 'react'

import Frame from '../components/Admin/Frame'
import SlideshowListWithQuery from '../components/Admin/SlideshowListWithQuery'
import Dialog from '../components/Dialog'
import { Button } from '../components/Form'

import { protect, ProtectProps } from '../helpers/auth'
import { useDisplayContext } from '../contexts/DisplayContext'
import { useAddSlideshow } from '../hooks/useSlideshows'

interface SlideshowsWithQueryProps extends ProtectProps {
  displayId?: string;
}

const SlideshowsWithQuery: React.FC<SlideshowsWithQueryProps> = ({ loggedIn, displayId }) => {
  const addSlideshowMutation = useAddSlideshow()
  const { setId } = useDisplayContext()

  React.useEffect(() => {
    if (displayId) {
      setId(displayId)
    }
  }, [displayId, setId])

  const handleAddSlideshow = async () => {
    try {
      await addSlideshowMutation.mutateAsync({})
    } catch (error) {
      console.error('Failed to add slideshow:', error)
    }
  }

  return (
    <Frame loggedIn={loggedIn}>
      <h1>Slideshows (with TanStack Query)</h1>
      <div className="max-w-2xl">
        <SlideshowListWithQuery />
        <Dialog><div></div></Dialog>
        <Button
          text={addSlideshowMutation.isPending ? 'Adding...' : '+ Add new slideshow'}
          color={'#8bc34a'}
          onClick={handleAddSlideshow}
          disabled={addSlideshowMutation.isPending}
          style={{ marginLeft: 0, width: '100%' }}
        />
      </div>
      
    </Frame>
  )
}

export default protect(SlideshowsWithQuery)