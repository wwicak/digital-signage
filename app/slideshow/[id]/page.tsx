'use client'

import React, { useState, useEffect, useRef, memo } from 'react'
import _ from 'lodash'
import { Edit } from 'lucide-react'
import { useParams, useSearchParams } from 'next/navigation'

import Frame from '@/components/Admin/Frame'
import SlideListComponent from '@/components/Admin/SlideList'
import SlideEditDialogComponent from '@/components/Admin/SlideEditDialog'
import Upload from '@/components/Upload'
import Button from '@/components/Form/Button'
import Dialog from '@/components/Dialog'

import { getSlideshow, updateSlideshow, ISlideshowData } from '@/actions/slideshow'
import { useDisplayContext } from '@/contexts/DisplayContext'

// Define the structure of a slideshow object
interface SlideshowData extends ISlideshowData {
  // May add component-specific properties here if needed, but for now match ISlideshowData
}

// Throttled update function
const updateSlideshowThrottled = _.debounce((id: string, data: Partial<SlideshowData>) => {
  return updateSlideshow(id, data)
}, 300)

const SlideshowPageComponent = memo(function SlideshowPageComponent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string || ''
  const displayId = searchParams ? searchParams.get('display') : null
  
  const [slideshow, setSlideshow] = useState<SlideshowData | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const slideListRef = useRef<SlideListComponent>(null)
  const dialogRef = useRef<SlideEditDialogComponent>(null)
  const displayContext = useDisplayContext()

  // Set display ID in context when component mounts
  useEffect(() => {
    if (displayId && displayContext.state.id !== displayId) {
      displayContext.setId(displayId)
    }
  }, [displayId, displayContext.setId, displayContext.state.id])

  // Load slideshow on mount
  useEffect(() => {
    const loadSlideshow = async () => {
      if (id) {
        try {
          const slideshowData = await getSlideshow(id)
          setSlideshow(slideshowData)
        } catch (error) {
          console.error('Failed to load slideshow:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    loadSlideshow()
  }, [id])

  const refresh = async (): Promise<void> => {
    if (slideshow && slideshow._id) {
      try {
        const updatedSlideshow = await getSlideshow(slideshow._id)
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

  if (loading) {
    return (
      <Frame loggedIn={true}>
        <div>Loading slideshow...</div>
      </Frame>
    )
  }

  if (!slideshow) {
    return (
      <Frame loggedIn={true}>
        <div>Slideshow not found</div>
      </Frame>
    )
  }

  return (
    <Frame loggedIn={true}>
      <h1 className='inline-block'>Slideshow: </h1>{' '}
      <div className='inline-block relative ml-4 mr-4 border-b-2 border-gray-400'>
        <input
          className='input'
          placeholder='Untitled Slideshow'
          value={(slideshow && slideshow.name) || ''}
          onChange={handleTitleChange}
          onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
          size={(slideshow && slideshow.name && slideshow.name.length) || 20}
        />
        <div className='icon'>
          <Edit className='w-4 h-4 text-gray-500' />
        </div>
      </div>
      <div className='max-w-2xl'>
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

export default SlideshowPageComponent