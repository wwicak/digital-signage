import React, { useEffect, useRef, memo } from 'react'
import { Tv, Layout, Settings } from 'lucide-react'
import type { NextPageContext } from 'next/types'

import Frame from '../components/Admin/Frame.tsx' // Assuming .tsx
import ScreenListComponent, { IScreenListRef } from '../components/Admin/ScreenList.tsx' // Renamed, Assuming .tsx
import Dialog from '../components/Dialog.tsx' // Assuming .tsx
import { Button } from '@/components/ui/button'

import { useDisplayMutations } from '../hooks/useDisplayMutations'
import { protect, ProtectProps } from '../helpers/auth' // Now .tsx
import { useDisplayContext } from '../contexts/DisplayContext'

interface ScreensProps extends ProtectProps {
  displayId?: string; // displayId might be optional or from router query
}

const ScreensComponent = memo(function ScreensComponent({ loggedIn, displayId }: ScreensProps) {
  const screenListRef = useRef<IScreenListRef>(null)
  const displayContext = useDisplayContext()
  const { createDisplay } = useDisplayMutations()

  useEffect(() => {
    if (displayId) {
      displayContext.setId(displayId)
    } else {
      /*
       * If no displayId is passed (e.g. not in query),
       * the context will handle the default state appropriately
       */
    }
  }, [displayId, displayContext.setId])

  const add = (): Promise<void> => {
    return new Promise((resolve) => {
      // Open the create dialog instead of directly creating a display
      if (screenListRef && screenListRef.current) {
        screenListRef.current.openCreateDialog()
      }
      resolve()
    })
  }

  return (
    <Frame loggedIn={loggedIn}>
      <div className='space-y-8'>
        {/* Header Section */}
        <div className='flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Connected Displays</h1>
            <p className='text-muted-foreground'>
              Monitor physical displays and remotely change their layouts in real-time.
            </p>
          </div>
          <div className='flex gap-2'>
            <Button
              onClick={() => window.location.href = '/layouts'}
              variant='outline'
              size='lg'
              className='w-full sm:w-auto'
            >
              <Layout className='mr-2 h-5 w-5' />
              Manage Layouts
            </Button>
            <Button
              onClick={add}
              size='lg'
              className='w-full sm:w-auto'
            >
              <Tv className='mr-2 h-5 w-5' />
              Register Display
            </Button>
          </div>
        </div>

        {/* Info Section */}
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
          <div className='flex items-start gap-3'>
            <div className='flex-shrink-0'>
              <Settings className='h-5 w-5 text-blue-600 mt-0.5' />
            </div>
            <div>
              <h3 className='font-medium text-blue-900 mb-1'>Remote Layout Control</h3>
              <p className='text-sm text-blue-700 mb-2'>
                For online displays, click the settings icon to remotely change layouts in real-time.
              </p>
              <ul className='text-xs text-blue-600 space-y-1'>
                <li>• <strong>Online displays:</strong> Changes apply immediately</li>
                <li>• <strong>Offline displays:</strong> Changes apply when they come back online</li>
                <li>• <strong>Auto-reload:</strong> Displays automatically refresh with new layouts</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Screens List */}
        <div className='space-y-6'>
          <ScreenListComponent ref={screenListRef} />
        </div>
        
        <Dialog><div></div></Dialog>
      </div>
    </Frame>
  )
})

// Create a wrapper component for getInitialProps
const Screens = (props: ScreensProps) => <ScreensComponent {...props} />

// Add getInitialProps to the wrapper component
Screens.getInitialProps = async (ctx: NextPageContext): Promise<{ displayId?: string }> => {
  const displayId = ctx.query.id as string | undefined
  return { displayId }
}

export default protect(Screens)