import React, { useRef, useEffect } from 'react'
import { Images } from 'lucide-react'

import Frame from '../components/Admin/Frame.tsx'
import SlideshowListComponent from '../components/Admin/SlideshowList.tsx' // Renamed
import Dialog from '../components/Dialog.tsx'
import { Button } from '@/components/ui/button'

import { addSlideshow } from '../actions/slideshow' // Assuming .ts and typed
import { protect, ProtectProps } from '../helpers/auth' // Now .tsx
import { useDisplayContext } from '../contexts/DisplayContext'

// Placeholder for SlideshowList component instance type
interface SlideshowListInstance {
  refresh: () => void;
}

interface SlideshowsProps extends ProtectProps {
  displayId?: string; // displayId might be optional or from router query
}

const Slideshows: React.FC<SlideshowsProps> = ({ loggedIn, displayId }) => {
  const slideshowList = useRef<SlideshowListInstance>(null)
  const displayContext = useDisplayContext()

  // Example: If displayId comes from query for this page
  useEffect(() => {
    if (displayId) {
      displayContext.setId(displayId)
    }
    /*
     * If displayId is not provided, consider the behavior of setId.
     * It might default, or you might want to explicitly clear/set a default.
     */
  }, [displayId, displayContext])

  const add = (): Promise<void> => {
    return addSlideshow().then(() => {
      if (slideshowList && slideshowList.current) {
        slideshowList.current.refresh()
      }
    })
  }

  return (
    <Frame loggedIn={loggedIn}>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Slideshows</h1>
            <p className="text-muted-foreground">
              Create and manage image slideshows for your digital displays.
            </p>
          </div>
          <Button
            onClick={add}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Images className="mr-2 h-5 w-5" />
            Add New Slideshow
          </Button>
        </div>

        {/* Slideshows List */}
        <div className="space-y-6">
          <SlideshowListComponent ref={slideshowList as any} />
        </div>
        
        <Dialog><div></div></Dialog>
      </div>
    </Frame>
  )
}

// Example: If displayId comes from query for this page
const SlideshowsWithInitialProps = Object.assign(Slideshows, {
  getInitialProps: async (ctx: any): Promise<{ displayId?: string }> => {
    const displayId = ctx.query.id as string | undefined
    return { displayId }
  }
})

export default protect(SlideshowsWithInitialProps)