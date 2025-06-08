import React, { useState, useEffect, useRef, memo } from 'react'
import _ from 'lodash'
import { Edit } from 'lucide-react'

import Frame from '../components/Admin/Frame'
import SlideListComponent from '../components/Admin/SlideList'
import SlideEditDialogComponent from '../components/Admin/SlideEditDialog'
import Upload from '../components/Upload'
import Button from '../components/Form/Button'
import Dialog from '../components/Dialog'

import { getSlideshow, updateSlideshow, ISlideshowData } from '../actions/slideshow'
import { protect, IProtectedPageProps } from '../helpers/auth'
import { useDisplayContext } from '../contexts/DisplayContext'

// Define the structure of a slideshow object
interface SlideshowData extends ISlideshowData {
  // May add component-specific properties here if needed, but for now match ISlideshowData
}

// Props for the Slideshow component
interface SlideshowProps extends IProtectedPageProps {
  slideshow?: SlideshowData; // slideshow can be undefined if ID is new or not found
  /*
   * host and loggedIn are already in IProtectedPageProps
   * displayId is already in IProtectedPageProps
   */
}

// Throttled update function
const updateSlideshowThrottled = _.debounce((id: string, data: Partial<SlideshowData>) => {
  return updateSlideshow(id, data)
}, 300)

const SlideshowPageComponent = memo(function SlideshowPageComponent({ slideshow: initialSlideshow, loggedIn, displayId, host }: SlideshowProps) {
  const [slideshow, setSlideshow] = useState<SlideshowData | undefined>(initialSlideshow)
  const slideListRef = useRef<SlideListComponent>(null)
  const dialogRef = useRef<SlideEditDialogComponent>(null)
  const displayContext = useDisplayContext()

  // Set display ID in context when component mounts
  useEffect(() => {
    if (displayId && displayContext.state.id !== displayId) {
      displayContext.setId(displayId)
    }
  }, [displayId, displayContext])

  const refresh = async (): Promise<void> => {
    if (slideshow && slideshow._id) {
      try {
        const updatedSlideshow = await getSlideshow(slideshow._id, host)
        setSlideshow(updatedSlideshow)
        if (slideListRef.current) {
          slideListRef.current.refresh()
        }
      } catch (error) {
        console.error('Refresh failed:', error)
      }
    }
  }

  const openAddDialog = (): Promise<void> => {
    if (dialogRef.current) {
      dialogRef.current.open()
    }
    return Promise.resolve()
  }

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value
    
    if (slideshow) {
      const updatedSlideshow = { ...slideshow, name: newTitle }
      setSlideshow(updatedSlideshow)
      
      // Update on server with throttling
      updateSlideshowThrottled(slideshow._id, { name: newTitle })
    }
  }

  return (
    <Frame loggedIn={loggedIn}>
      <h1 className="inline-block">Slideshow: </h1>{' '}
      <div className="inline-block relative ml-4 mr-4 border-b-2 border-gray-400">
        <input
          className='input'
          placeholder='Untitled Slideshow'
          value={(slideshow && slideshow.name) || ''}
          onChange={handleTitleChange}
          onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
          size={(slideshow && slideshow.name && slideshow.name.length) || 20}
        />
        <div className='icon'>
          <Edit className="w-4 h-4 text-gray-500" />
        </div>
      </div>
      <div className="max-w-2xl">
        <Upload slideshowId={slideshow && slideshow._id || ''} refresh={refresh} />
        <SlideEditDialogComponent
          slideshowId={slideshow && slideshow._id || ''}
          refresh={refresh}
          ref={dialogRef}
        />
        <Button
          text='Add a slide'
          color='#7bc043'
          style={{ flex: 1, margin: 0, width: '100%', marginTop: 20 }}
          onClick={openAddDialog}
        />
        <SlideListComponent ref={slideListRef} slideshowId={slideshow && slideshow._id || ''} />
        <Dialog><div></div></Dialog>
      </div>
      
    </Frame>
  )
})

// Create a wrapper component for getInitialProps
const SlideshowPage = (props: SlideshowProps) => <SlideshowPageComponent {...props} />

SlideshowPage.getInitialProps = async (ctx: any): Promise<Partial<SlideshowProps>> => {
  const id = ctx.query.id as string | undefined
  const host =
    ctx.req && ctx.req.headers && ctx.req.headers.host
      ? (ctx.req.socket?.encrypted ? 'https://' : 'http://') + ctx.req.headers.host
      : (typeof window !== 'undefined' ? window.location.origin : '')
  
  if (id) {
    try {
      const slideshow = await getSlideshow(id, host)
      return { slideshow, host, displayId: ctx.query.displayId as string | undefined }
    } catch (error) {
      console.error('Failed to get slideshow:', error)
      return { host, displayId: ctx.query.displayId as string | undefined }
    }
  }
  return { host, displayId: ctx.query.displayId as string | undefined }
}

export default protect(SlideshowPage)